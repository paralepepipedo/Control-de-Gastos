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
    const { data: periodo } = await supabase.from('periodos')
      .select('fecha_inicio, fecha_fin')
      .eq('mes', mesNum)
      .eq('anio', anioNum)
      .single();

    if (!periodo) throw new Error('Período no encontrado');

    // 2. Obtener Provisiones con gastos_fijos
    const { data: provisiones } = await supabase.from('provisiones')
      .select(`
        monto_provision,
        gasto_fijo_id,
        gastos_fijos!inner (
          id,
          nombre,
          categoria_id,
          tipo,
          categorias (nombre, icono)
        )
      `)
      .eq('mes', mesNum)
      .eq('anio', anioNum);

    console.log('📦 Provisiones raw:', JSON.stringify(provisiones, null, 2));

    // 3. Obtener TODOS los gastos del período
    const { data: todosLosGastos } = await supabase.from('gastos')
      .select('monto, metodo_pago, pagado, categoria_id, descripcion')
      .gte('fecha', periodo.fecha_inicio)
      .lte('fecha', periodo.fecha_fin);

    // --- CÁLCULOS ---

    const totalProvisionado = provisiones?.reduce((sum, p) => sum + Number(p.monto_provision), 0) || 0;

    const gastosPagados = todosLosGastos?.filter(
      g => g.pagado && g.metodo_pago === 'efectivo'
    ) || [];

    const totalPagadoPresupuesto = gastosPagados.reduce(
      (sum, g) => sum + Number(g.monto),
      0
    );

    // Lógica TC
    const gastosTC = todosLosGastos?.filter(g => g.metodo_pago === 'tarjeta') || [];
    const totalGastadoTC = gastosTC.reduce((sum, g) => sum + Number(g.monto), 0);

    const pagosHaciaTC = todosLosGastos?.filter(g => {
      if (!g.pagado) return false;
      if (g.metodo_pago !== 'efectivo') return false;
      if (!g.descripcion) return false;
      const desc = g.descripcion.toLowerCase().trim();
      return desc.includes('tc itau minimo');
    }) || [];

    const totalPagadoATC = pagosHaciaTC.reduce((sum, g) => sum + Number(g.monto), 0);
    const deudaTCPendiente = totalGastadoTC - totalPagadoATC;

    // Gastos por categoría (todos los pagados)
    const todosLosPagados = todosLosGastos?.filter(g => g.pagado) || [];
    const gastosPagadosPorCat: Record<number, number> = {};
    todosLosPagados.forEach(g => {
      if (g.categoria_id) {
        gastosPagadosPorCat[g.categoria_id] = (gastosPagadosPorCat[g.categoria_id] || 0) + Number(g.monto);
      }
    });

    // Construir detalles - CORRECCIÓN AQUÍ
    const detalles = provisiones?.map(p => {
      const gf = p.gastos_fijos as any;
      const cat = gf?.categorias as any;
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

    console.log('✅ Detalles finales:', detalles);
    console.log('💰 Presupuestos:', detalles.filter(d => d.tipo === 'presupuesto'));

    return NextResponse.json({
      success: true,
      resumen: {
        total_provisionado: totalProvisionado,
        total_gastado: totalPagadoPresupuesto,
        saldo_total: totalProvisionado - totalPagadoPresupuesto,
        porcentaje_usado: totalProvisionado > 0 ? (totalPagadoPresupuesto / totalProvisionado) * 100 : 0,
        tc_total_gastado: totalGastadoTC,
        tc_pagado: totalPagadoATC,
        tc_por_pagar: deudaTCPendiente
      },
      detalles: detalles.sort((a, b) => a.tipo === 'presupuesto' ? -1 : 1)
    });

  } catch (error: any) {
    console.error('❌ Error en API provisiones:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

