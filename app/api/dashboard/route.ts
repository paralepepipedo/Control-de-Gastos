import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    const proximos7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Queries optimizadas en paralelo (TODO junto)
    const [
      { data: periodoData },
      { data: periodoAnteriorData },
      { data: fondos },
      { data: gastosEfectivoPagados },
      { data: gastosPagados },
      { data: gastosPendientes },
      { data: gastosMesAnterior },
      { data: provisiones },
      { data: gastosFijos },
      { data: gastosProximos },
      { data: ultimosGastos },
      { data: pendientesTarjeta },
      { data: pendientesEfectivo },
      { data: gastosPorCat },
      { data: fechasPago }
    ] = await Promise.all([
      // Periodo actual
      supabase.from('periodos').select('*').eq('mes', mesActual).eq('anio', anioActual).single(),
      
      // Periodo anterior
      supabase.from('periodos').select('fecha_inicio, fecha_fin').eq('mes', mesActual === 1 ? 12 : mesActual - 1).eq('anio', mesActual === 1 ? anioActual - 1 : anioActual).single(),
      
      // Fondos
      supabase.from('fondos').select('*').order('fecha_pago', { ascending: false }),
      
      // Gastos efectivo pagados (para saldo líquido)
      supabase.from('gastos').select('monto, fecha').eq('metodo_pago', 'efectivo').eq('pagado', true),
      
      // Gastos PAGADOS (se filtrará por periodo después)
      supabase.from('gastos').select('monto, fecha').eq('pagado', true),
      
      // Gastos PENDIENTES (se filtrará por periodo después)
      supabase.from('gastos').select('monto, fecha').eq('pagado', false),
      
      // Gastos mes anterior (se filtrará después)
      supabase.from('gastos').select('monto, fecha'),
      
      // Provisiones activas
      supabase.from('provisiones').select('monto_provision').eq('estado', 'pendiente'),
      
      // Gastos fijos
      supabase.from('gastos_fijos').select('monto_provision, activo'),
      
      // Gastos próximos 7 días
      supabase.from('gastos').select('id, fecha, descripcion, monto, metodo_pago, pagado, fecha_vencimiento, es_cuota, categorias!inner(nombre, tipo)').eq('pagado', false).gte('fecha_vencimiento', hoy.toISOString().split('T')[0]).lte('fecha_vencimiento', proximos7Dias).eq('es_cuota', false).neq('categorias.tipo', 'presupuesto').order('fecha_vencimiento', { ascending: true }).limit(5),
      
      // Últimos gastos (se filtrará después)
      supabase.from('gastos').select('id, fecha, descripcion, monto, metodo_pago, pagado, es_cuota, categorias(nombre, icono)').eq('es_cuota', false).order('fecha', { ascending: false }).limit(10),
      
      // Pendientes tarjeta (se filtrará después)
      supabase.from('gastos').select('monto, fecha').eq('pagado', false).eq('metodo_pago', 'tarjeta'),
      
      // Pendientes efectivo (se filtrará después)
      supabase.from('gastos').select('monto, fecha').eq('pagado', false).eq('metodo_pago', 'efectivo'),
      
      // Gastos por categoría (se filtrará después)
      supabase.from('gastos').select('categoria_id, monto, fecha, categorias(nombre, icono)').eq('pagado', true),
      
      // Próximo pago
      supabase.from('fechas_pago').select('*').gte('fecha_pago', hoy.toISOString().split('T')[0]).order('fecha_pago', { ascending: true }).limit(1)
    ]);

    if (!periodoData) throw new Error('No se pudo obtener el período actual');

    const inicioMes = periodoData.fecha_inicio;
    const finMes = periodoData.fecha_fin;
    const inicioMesAnterior = periodoAnteriorData?.fecha_inicio || inicioMes;
    const finMesAnterior = periodoAnteriorData?.fecha_fin || finMes;

    // Filtrar en memoria (más rápido que múltiples queries)
    const gastosPagadosPeriodo = gastosPagados?.filter(g => g.fecha >= inicioMes && g.fecha <= finMes) || [];
    const gastosPendientesPeriodo = gastosPendientes?.filter(g => g.fecha >= inicioMes && g.fecha <= finMes) || [];
    const gastosMesAnteriorFiltrados = gastosMesAnterior?.filter(g => g.fecha >= inicioMesAnterior && g.fecha <= finMesAnterior) || [];
    const ultimosGastosFiltrados = ultimosGastos?.filter(g => g.fecha >= inicioMes && g.fecha <= finMes).slice(0, 5) || [];
    const pendientesTarjetaFiltrados = pendientesTarjeta?.filter(g => g.fecha >= inicioMes && g.fecha <= finMes) || [];
    const pendientesEfectivoFiltrados = pendientesEfectivo?.filter(g => g.fecha >= inicioMes && g.fecha <= finMes) || [];
    const gastosPorCatFiltrados = gastosPorCat?.filter(g => g.fecha >= inicioMes && g.fecha <= finMes) || [];

    // Calcular saldo líquido
    const fechasQueCubre = fondos?.map(f => f.mes_que_cubre).filter(Boolean).sort() || [];
    const primerMesQueCubre = fechasQueCubre[0];
    let totalIngresos = 0;
    let fechaInicioCiclo = inicioMes;
    
    if (primerMesQueCubre) {
      const fondosDesdeCiclo = fondos?.filter(f => f.mes_que_cubre >= primerMesQueCubre) || [];
      totalIngresos = fondosDesdeCiclo.reduce((sum, f) => sum + Number(f.monto), 0);
      
      const base = new Date(primerMesQueCubre);
      let mesPeriodo = base.getMonth() + 1;
      let anioPeriodo = base.getFullYear();
      
      if (base.getDate() < 26) {
        mesPeriodo = mesPeriodo - 1;
        if (mesPeriodo === 0) { mesPeriodo = 12; anioPeriodo = anioPeriodo - 1; }
      }
      
      let mesInicio = mesPeriodo - 1;
      let anioInicio = anioPeriodo;
      if (mesInicio === 0) { mesInicio = 12; anioInicio = anioInicio - 1; }
      
      fechaInicioCiclo = `${anioInicio}-${String(mesInicio).padStart(2, '0')}-26`;
    }
    
    const gastosEfectivoFiltrados = gastosEfectivoPagados?.filter(g => g.fecha >= fechaInicioCiclo) || [];
    const totalEgresosEfectivo = gastosEfectivoFiltrados.reduce((sum, g) => sum + Number(g.monto), 0);
    const saldoLiquido = totalIngresos - totalEgresosEfectivo;

    // Cálculos finales
    const totalPagados = gastosPagadosPeriodo.reduce((sum, g) => sum + Number(g.monto), 0);
    const totalPendientes = gastosPendientesPeriodo.reduce((sum, g) => sum + Number(g.monto), 0);
    const totalGastosMes = totalPagados + totalPendientes;
    const totalGastosMesAnterior = gastosMesAnteriorFiltrados.reduce((sum, g) => sum + Number(g.monto), 0);
    const cambioGastos = totalGastosMesAnterior > 0 ? ((totalGastosMes - totalGastosMesAnterior) / totalGastosMesAnterior) * 100 : 0;
    
    const provisionesActivas = provisiones?.reduce((sum, p) => sum + Number(p.monto_provision), 0) || 0;
    const totalGastosFijos = gastosFijos?.reduce((sum, g) => sum + Number(g.monto_provision), 0) || 0;
    const gastosFijosActivos = gastosFijos?.filter(g => g.activo).length || 0;

    const totalPendientesTarjeta = pendientesTarjetaFiltrados.reduce((sum, g) => sum + Number(g.monto), 0);
    const totalPendientesEfectivo = pendientesEfectivoFiltrados.reduce((sum, g) => sum + Number(g.monto), 0);

    const gastosProximosFiltrados = (gastosProximos || []).map(g => ({
      id: g.id,
      fecha_vencimiento: g.fecha_vencimiento,
      monto_provision: g.monto,
      gastos_fijos: { nombre: g.descripcion }
    }));

    const gastosPorCategoria = Object.values(
      gastosPorCatFiltrados.reduce((acc: any, g: any) => {
        const catId = g.categoria_id || 'sin-categoria';
        if (!acc[catId]) {
          acc[catId] = {
            categoria_id: g.categoria_id,
            nombre: g.categorias?.nombre || 'Sin categoría',
            icono: g.categorias?.icono || '📦',
            total: 0
          };
        }
        acc[catId].total += Number(g.monto);
        return acc;
      }, {})
    ).sort((a: any, b: any) => b.total - a.total);

    let proximoPago = null;
    if (fechasPago && fechasPago.length > 0) {
      const fp = fechasPago[0];
      const diasRestantes = Math.ceil((new Date(fp.fecha_pago).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      proximoPago = {
        fecha: new Date(fp.fecha_pago).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }),
        dias: diasRestantes,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        periodo: periodoData,
        resumen: {
          saldoTotal: saldoLiquido,
          gastosMes: totalGastosMes,
          cambioGastos,
          provisionesActivas,
          totalGastosFijos,
          gastosFijosActivos,
          pendientesTarjeta: { total: totalPendientesTarjeta, cantidad: pendientesTarjetaFiltrados.length },
          pendientesEfectivo: { total: totalPendientesEfectivo, cantidad: pendientesEfectivoFiltrados.length }
        },
        proximoPago,
        saldoFondos: { saldo_liquido: saldoLiquido },
        proximosVencimientos: gastosProximosFiltrados,
        ultimosGastos: ultimosGastosFiltrados,
        gastosPorCategoria
      }
    });

  } catch (error: any) {
    console.error('Error en dashboard:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
