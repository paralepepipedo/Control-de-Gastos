import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { addMonths, format } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const meses = parseInt(searchParams.get('meses') || '12');

    const supabase = supabaseAdmin;

    // 1. OBTENER CONFIGURACIÓN BASE
    const { data: configData, error: errorConfig } = await supabase
      .from('app_config')
      .select('*')
      .in('clave', ['saldo_inicial_2026_01', 'fecha_base_proyeccion']);

    if (errorConfig) throw errorConfig;

    const saldoInicial = configData?.find(c => c.clave === 'saldo_inicial_2026_01')?.valor_numeric || 0;
    const fechaBaseStr = configData?.find(c => c.clave === 'fecha_base_proyeccion')?.valor_text || '2026-01-01';
    const fechaBase = new Date(fechaBaseStr);

    // 2. OBTENER TODOS LOS PERÍODOS (no solo el actual)
    const { data: todosPeriodos, error: errorPeriodos } = await supabase
      .from('periodos')
      .select('*')
      .order('fecha_inicio', { ascending: false });

    if (errorPeriodos) throw errorPeriodos;

    const periodoActual = todosPeriodos && todosPeriodos.length > 0 ? todosPeriodos[0] : null;
    const mesActual = periodoActual?.mes || new Date().getMonth() + 1;
    const anioActual = periodoActual?.anio || new Date().getFullYear();

    // 3. OBTENER SUELDO MÍNIMO
    const { data: fondos, error: errorFondos } = await supabase
      .from('fondos')
      .select('*')
      .eq('tipo', 'sueldo')
      .order('mes_que_cubre', { ascending: true });

    if (errorFondos) throw errorFondos;

    let sueldoMinimo = 0;
    if (fondos && fondos.length > 0) {
      sueldoMinimo = Math.min(...fondos.map(f => Number(f.monto)));
    }

    // 4. OBTENER GASTOS FIJOS ACTIVOS
    const { data: gastosFijos, error: errorGastosFijos } = await supabase
      .from('gastos_fijos')
      .select('id, nombre, monto_provision, categoria_id, categorias!inner(nombre), dia_vencimiento')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (errorGastosFijos) throw errorGastosFijos;

    // 5. OBTENER CATEGORÍAS
    const { data: categorias, error: errorCategorias } = await supabase
      .from('categorias')
      .select('id, nombre, icono')
      .order('nombre', { ascending: true });

    if (errorCategorias) throw errorCategorias;

    // 6. OBTENER TODOS LOS OVERRIDES
    const { data: overrides, error: errorOverrides } = await supabase
      .from('proyeccion_overrides')
      .select('*');

    if (errorOverrides) throw errorOverrides;

    const overridesGastosFijos = overrides?.filter(o => o.tipo === 'gasto_fijo') || [];
    const overridesGastosEfectivo = overrides?.filter(o => o.tipo === 'gasto_efectivo') || [];
    const overridesSueldo = overrides?.filter(o => o.tipo === 'ingreso_sueldo') || [];

    // 7. OBTENER GASTOS EFECTIVO DEL PERÍODO ACTUAL (para copiar a meses futuros)
    let gastosEfectivoActual: any[] = [];
    let totalGastosEfectivoActual = 0;

    if (periodoActual) {
      const { data: gastosActual } = await supabase
        .from('gastos')
        .select('id, monto, categoria_id')
        .eq('metodo_pago', 'efectivo')
        .gte('fecha', periodoActual.fecha_inicio)
        .lte('fecha', periodoActual.fecha_fin);

      const gastosPorCategoria: { [key: number]: number } = {};
      gastosActual?.forEach(gasto => {
        if (gasto.categoria_id) {
          gastosPorCategoria[gasto.categoria_id] =
            (gastosPorCategoria[gasto.categoria_id] || 0) + Number(gasto.monto);
        }
      });

      gastosEfectivoActual = categorias?.map(cat => ({
        categoria_id: cat.id,
        categoria_nombre: cat.nombre,
        categoria_icono: cat.icono || '💰',
        monto: gastosPorCategoria[cat.id] || 0,
      })).filter(g => g.monto > 0) || [];

      totalGastosEfectivoActual = gastosEfectivoActual.reduce((sum, g) => sum + g.monto, 0);
    }

    // 7.5. OBTENER CONFIGURACIÓN BASE DE PROYECCIÓN
    const { data: configBase, error: errorConfigBase } = await supabase
      .from('proyeccion_base')
      .select('*')
      .order('tabla', { ascending: true });

    if (errorConfigBase) throw errorConfigBase;

    const baseTabla1 = configBase?.find((c: any) => c.tabla === 1);
    const baseTabla2 = configBase?.find((c: any) => c.tabla === 2);

    // 8. PROYECTAR MES POR MES
    const proyeccion = [];

    // VARIABLES SEPARADAS PARA CADA TABLA (desde BD o valores por defecto)
    let saldoAcumuladoTabla1 = baseTabla1?.saldo_inicial || 1434841;
    let saldoAcumuladoTabla2 = baseTabla2?.saldo_inicial || 1434841;

    for (let i = 0; i < meses; i++) {
      const mesFecha = addMonths(fechaBase, i);
      const mesNumero = mesFecha.getMonth() + 1;
      const anio = mesFecha.getFullYear();

      // Determinar si es pasado, actual o futuro
      const esPasado = (anio < anioActual) || (anio === anioActual && mesNumero < mesActual);
      const esActual = (anio === anioActual && mesNumero === mesActual);
      const esFuturo = (anio > anioActual) || (anio === anioActual && mesNumero > mesActual);

      // Buscar el período real correspondiente a este mes/año
      const periodoDelMes = todosPeriodos?.find(p => p.mes === mesNumero && p.anio === anio);

      // ==============================================
      // TABLA 2 - GASTOS EFECTIVO (INDEPENDIENTE)
      // ==============================================

      let saldoInicialTabla2: number;
      let ingresosMesTabla2: number;
      let sueldoTieneOverrideTabla2: boolean;
      let totalGastosEfectivo: number;
      let gastosEfectivoDetalle: any[];
      let saldoFinalTabla2: number;

      saldoInicialTabla2 = saldoAcumuladoTabla2;

      const overrideSueldoTabla2 = overridesSueldo.find(
        o => o.anio === anio && o.mes === mesNumero
      );
      ingresosMesTabla2 = overrideSueldoTabla2 ? Number(overrideSueldoTabla2.monto_override) : (baseTabla2?.ingresos_mes || sueldoMinimo);
      sueldoTieneOverrideTabla2 = !!overrideSueldoTabla2;

      gastosEfectivoDetalle = [];

      if (esPasado || esActual) {
        // CAMBIO CLAVE: usar rangos reales del período si existe, si no fallback a mes calendario
        const fechaInicioStr = periodoDelMes
          ? periodoDelMes.fecha_inicio
          : `${anio}-${String(mesNumero).padStart(2, '0')}-01`;
        const fechaFinStr = periodoDelMes
          ? periodoDelMes.fecha_fin
          : `${anio}-${String(mesNumero).padStart(2, '0')}-${new Date(anio, mesNumero, 0).getDate()}`;

        const { data: gastosMes } = await supabase
          .from('gastos')
          .select('id, monto, categoria_id')
          .eq('metodo_pago', 'efectivo')
          .gte('fecha', fechaInicioStr)
          .lte('fecha', fechaFinStr);

        const gastosPorCategoria: { [key: number]: number } = {};
        gastosMes?.forEach(gasto => {
          if (gasto.categoria_id) {
            gastosPorCategoria[gasto.categoria_id] =
              (gastosPorCategoria[gasto.categoria_id] || 0) + Number(gasto.monto);
          }
        });

        // Pasado y actual: siempre valores reales, ignorar overrides de gasto_efectivo
        gastosEfectivoDetalle = categorias?.map(cat => {
          const montoBase = gastosPorCategoria[cat.id] || 0;

          return {
            categoria_id: cat.id,
            categoria_nombre: cat.nombre,
            categoria_icono: cat.icono || '💰',
            monto: montoBase,
            monto_original: montoBase,
            tiene_override: false,
          };
        }).filter(g => g.monto > 0) || [];

      } else if (esFuturo) {
        gastosEfectivoDetalle = gastosEfectivoActual.map(g => {
          const override = overridesGastosEfectivo.find(
            o => o.referencia_id === g.categoria_id && o.anio === anio && o.mes === mesNumero
          );

          const montoFinal = override ? Number(override.monto_override) : g.monto;

          return {
            ...g,
            monto: montoFinal,
            monto_original: g.monto,
            tiene_override: !!override,
          };
        });
      }

      totalGastosEfectivo = gastosEfectivoDetalle.reduce((sum, g) => sum + g.monto, 0);
      saldoFinalTabla2 = saldoInicialTabla2 + ingresosMesTabla2 - totalGastosEfectivo;

      saldoAcumuladoTabla2 = saldoFinalTabla2;

      // ==============================================
      // TABLA 1 - GASTOS FIJOS (INDEPENDIENTE)
      // ==============================================

      let saldoInicialTabla1: number;
      let ingresosMesTabla1: number;
      let sueldoTieneOverrideTabla1: boolean;
      let totalGastosFijos: number;
      let gastosDetalle: any[];
      let saldoFinalTabla1: number;

      saldoInicialTabla1 = saldoAcumuladoTabla1;

      const overrideSueldoTabla1 = overridesSueldo.find(
        o => o.anio === anio && o.mes === mesNumero
      );
      ingresosMesTabla1 = overrideSueldoTabla1 ? Number(overrideSueldoTabla1.monto_override) : (baseTabla1?.ingresos_mes || sueldoMinimo);
      sueldoTieneOverrideTabla1 = !!overrideSueldoTabla1;

      gastosDetalle = gastosFijos?.map(gf => {
        const override = overridesGastosFijos.find(
          o => o.referencia_id === gf.id && o.anio === anio && o.mes === mesNumero
        );
        const montoFinal = override ? Number(override.monto_override) : Number(gf.monto_provision);

        return {
          id: gf.id,
          nombre: gf.nombre,
          monto: montoFinal,
          monto_original: Number(gf.monto_provision),
          tiene_override: !!override,
          categoria: (gf.categorias as any)?.[0]?.nombre || 'Sin categoría',
          dia_vencimiento: gf.dia_vencimiento,
        };
      }) || [];

      totalGastosFijos = gastosDetalle.reduce((sum, g) => sum + g.monto, 0);
      saldoFinalTabla1 = saldoInicialTabla1 + ingresosMesTabla1 - totalGastosFijos;

      saldoAcumuladoTabla1 = saldoFinalTabla1;

      // ==============================================
      // MÉTRICAS GENERALES
      // ==============================================

      const variacion = saldoFinalTabla1 - saldoInicialTabla1;
      const solvencia = ingresosMesTabla1 > 0 ? (variacion / ingresosMesTabla1) * 100 : 0;

      let estado: 'superavit' | 'equilibrio' | 'deficit';
      if (variacion > ingresosMesTabla1 * 0.1) {
        estado = 'superavit';
      } else if (variacion >= 0) {
        estado = 'equilibrio';
      } else {
        estado = 'deficit';
      }

      proyeccion.push({
        mes: mesFecha.toISOString(),
        mes_nombre: format(mesFecha, 'MMM yyyy'),
        mes_numero: mesNumero,
        anio: anio,

        // DATOS TABLA 1 (Gastos Fijos)
        saldo_inicial: saldoInicialTabla1,
        saldo_final: saldoFinalTabla1,
        gastos_fijos: totalGastosFijos,
        gastos_fijos_detalle: gastosDetalle,

        // DATOS TABLA 2 (Gastos Efectivo)
        saldo_inicial_tabla2: saldoInicialTabla2,
        saldo_final_con_efectivo: saldoFinalTabla2,
        gastos_efectivo: totalGastosEfectivo,
        gastos_efectivo_detalle: gastosEfectivoDetalle,

        // DATOS COMPARTIDOS
        ingresos: ingresosMesTabla1,
        ingresos_tiene_override: sueldoTieneOverrideTabla1,

        // MÉTRICAS
        variacion: variacion,
        solvencia_porcentaje: solvencia,
        estado,
        es_periodo_actual: esActual,
        es_futuro: esFuturo,

        // INFO DEL PERÍODO USADO
        periodo_fecha_inicio: periodoDelMes?.fecha_inicio || null,
        periodo_fecha_fin: periodoDelMes?.fecha_fin || null,
      });
    }

    return NextResponse.json({
      proyeccion,
      gastos_fijos: gastosFijos || [],
      categorias: categorias || [],
      config: {
        saldo_inicial: saldoInicial,
        fecha_base: fechaBaseStr,
        sueldo_minimo: sueldoMinimo,
        meses_proyeccion: meses,
        periodo_actual: periodoActual,
        base_tabla1: baseTabla1,
        base_tabla2: baseTabla2,
      },
      debug: {
        total_gastos_fijos: gastosFijos?.length || 0,
        total_categorias: categorias?.length || 0,
        total_overrides_gastos_fijos: overridesGastosFijos.length,
        total_overrides_gastos_efectivo: overridesGastosEfectivo.length,
        total_overrides_sueldo: overridesSueldo.length,
      }
    });

  } catch (error: any) {
    console.error('Error en proyección:', error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
