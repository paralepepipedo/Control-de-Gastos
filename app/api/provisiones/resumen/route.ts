import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    if (!mes || !anio) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros' }, { status: 400 });
    }

    const mesNum = parseInt(mes);
    const anioNum = parseInt(anio);

    // 1. Obtener período
    const { data: periodo } = await supabase
      .from('periodos')
      .select('fecha_inicio, fecha_fin')
      .eq('mes', mesNum)
      .eq('anio', anioNum)
      .single();

    if (!periodo) throw new Error('Período no encontrado');

    // 2. Obtener Provisiones
    const { data: provisiones } = await supabase
      .from('provisiones')
      .select(`
        monto_provision,
        gastos_fijos ( id, nombre, categoria_id, tipo, categorias(nombre, icono) )
      `)
      .eq('mes', mesNum)
      .eq('anio', anioNum);

    // 3. Obtener TODOS los gastos del período (pagados y no pagados) para calcular TC
    const { data: todosLosGastos } = await supabase
      .from('gastos')
      .select('monto, metodo_pago, pagado, categoria_id, descripcion')
      .gte('fecha', periodo.fecha_inicio)
      .lte('fecha', periodo.fecha_fin);

    // --- CÁLCULOS ---

    // A. Provisión Total
    const totalProvisionado = provisiones?.reduce((sum, p) => sum + Number(p.monto_provision), 0) || 0;

    // B. Gastos PAGADOS que consumen presupuesto de efectivo
    // Regla: SOLO cuentan los pagados con método "efectivo".
    // Los gastos pagados con tarjeta NO descuentan provisión hasta que se pague la TC con efectivo.
    const gastosPagados = todosLosGastos?.filter(
      g => g.pagado && g.metodo_pago === 'efectivo'
    ) || [];

    const totalPagadoPresupuesto = gastosPagados.reduce(
      (sum, g) => sum + Number(g.monto),
      0
    );

    // C. Lógica Tarjeta de Crédito
    // 1. Total consumido en TC este mes
    const gastosTC = todosLosGastos?.filter(g => g.metodo_pago === 'tarjeta') || [];
    const totalGastadoTC = gastosTC.reduce((sum, g) => sum + Number(g.monto), 0);

    // 2. Pagos mínimos realizados a la tarjeta:
    // Consideramos gastos con descripción que contenga "tc itau minimo",
    // método "efectivo" y marcados como pagados (ignorando mayúsculas).
    const pagosHaciaTC = todosLosGastos?.filter(g => {
      if (!g.pagado) return false;
      if (g.metodo_pago !== 'efectivo') return false;
      if (!g.descripcion) return false;

      const desc = g.descripcion.toLowerCase().trim();
      return desc.includes('tc itau minimo');
    }) || [];

    const totalPagadoATC = pagosHaciaTC.reduce((sum, g) => sum + Number(g.monto), 0);

    // 3. Deuda TC Pendiente (Lo que falta por cubrir con efectivo)
    const deudaTCPendiente = totalGastadoTC - totalPagadoATC;


    // D. Construir detalles - Sumar TODOS los gastos pagados (efectivo + tarjeta)
    const todosLosPagados = todosLosGastos?.filter(g => g.pagado) || [];

    const gastosPagadosPorCat: Record<number, number> = {};
    todosLosPagados.forEach(g => {
      if (g.categoria_id) gastosPagadosPorCat[g.categoria_id] = (gastosPagadosPorCat[g.categoria_id] || 0) + Number(g.monto);
    });


    const detalles = provisiones?.map(p => {
      const gf = (p.gastos_fijos as any)?.[0];
      const cat = (gf?.categorias as any)?.[0];
      const gastado = gf?.categoria_id ? (gastosPagadosPorCat[gf.categoria_id] || 0) : 0;
      return {
        nombre: gf?.nombre || 'Provisión',
        icono: cat?.icono || '📄',
        tipo: gf?.tipo || 'fijo',
        provisionado: Number(p.monto_provision),
        gastado,
        saldo: Number(p.monto_provision) - gastado,
        porcentaje: Number(p.monto_provision) > 0 ? (gastado / Number(p.monto_provision)) * 100 : 0
      };
    }) || [];

    return NextResponse.json({
      success: true,
      resumen: {
        total_provisionado: totalProvisionado,
        total_gastado: totalPagadoPresupuesto, // Para la barra de presupuesto
        saldo_total: totalProvisionado - totalPagadoPresupuesto,
        porcentaje_usado: totalProvisionado > 0 ? (totalPagadoPresupuesto / totalProvisionado) * 100 : 0,

        // DATOS NUEVOS PARA FICHA TC
        tc_total_gastado: totalGastadoTC,
        tc_pagado: totalPagadoATC,
        tc_por_pagar: deudaTCPendiente
      },
      detalles: detalles.sort((a, b) => a.tipo === 'presupuesto' ? -1 : 1)
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
