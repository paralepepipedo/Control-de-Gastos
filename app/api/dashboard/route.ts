import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const hoy = new Date();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // 1. Obtener período actual con validación de error
    const periodoResponse = await fetch(`${baseUrl}/api/periodos`);
    
    if (!periodoResponse.ok) {
      const errorText = await periodoResponse.text();
      throw new Error(`Error al obtener periodos (${periodoResponse.status}): ${errorText.substring(0, 100)}...`);
    }

    const periodoResult = await periodoResponse.json();
    
    if (!periodoResult.success) {
      throw new Error('No se pudo obtener el período actual');
    }
    
    const periodo = periodoResult.data;
    const inicioMes = periodo.fecha_inicio;
    const finMes = periodo.fecha_fin;
    
    // 2. Calcular período anterior
    const mesAnterior = periodo.mes === 1 ? 12 : periodo.mes - 1;
    const anioAnterior = periodo.mes === 1 ? periodo.anio - 1 : periodo.anio;
    
    const periodoAnteriorResponse = await fetch(
      `${baseUrl}/api/periodos?mes=${mesAnterior}&anio=${anioAnterior}`
    );
    
    // Si falla el periodo anterior, no bloqueamos todo, usamos valores por defecto o lanzamos error según prefieras.
    // Aquí asumimos que si falla, lanzamos error para mantener consistencia.
    if (!periodoAnteriorResponse.ok) {
       console.warn('Advertencia: No se pudo obtener el periodo anterior');
    }
    const periodoAnteriorResult = periodoAnteriorResponse.ok ? await periodoAnteriorResponse.json() : { data: { fecha_inicio: null, fecha_fin: null } };
    
    const periodoAnterior = periodoAnteriorResult.data || {};
    const inicioMesAnterior = periodoAnterior.fecha_inicio || inicioMes; // Fallback para evitar error en query
    const finMesAnterior = periodoAnterior.fecha_fin || finMes;
    
    const proximos7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 3. Ejecutar todas las queries en paralelo
    const [
      { data: fondos },
      { data: gastosMes },
      { data: gastosMesAnterior },
      { data: provisiones },
      { data: gastosFijos },
      { data: proximosVencimientos },
      { data: ultimosGastos },
      { data: gastosPorCat }
    ] = await Promise.all([
      supabase.from('fondos').select('saldo_actual'),
      supabase.from('gastos').select('monto').gte('fecha', inicioMes).lte('fecha', finMes),
      supabase.from('gastos').select('monto').gte('fecha', inicioMesAnterior).lte('fecha', finMesAnterior),
      supabase.from('provisiones').select('monto_provision').eq('estado', 'pendiente'),
      supabase.from('gastos_fijos').select('monto_provision, activo'),
      supabase.from('provisiones').select('id, fecha_vencimiento, monto_provision, gasto_fijo_id, gastos_fijos(nombre)').eq('estado', 'pendiente').lte('fecha_vencimiento', proximos7Dias).order('fecha_vencimiento', { ascending: true }).limit(5),
      supabase.from('gastos').select('id, fecha, descripcion, monto, metodo_pago, categorias(nombre)').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(5),
      supabase.from('gastos').select('categoria_id, monto, categorias(nombre, icono)').gte('fecha', inicioMes).lte('fecha', finMes)
    ]);

    // 4. Cálculos de resumen
    const saldoTotal = fondos?.reduce((sum, f) => sum + Number(f.saldo_actual), 0) || 0;
    const totalGastosMes = gastosMes?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;
    const totalGastosMesAnterior = gastosMesAnterior?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;
    const cambioGastos = totalGastosMesAnterior > 0 ? ((totalGastosMes - totalGastosMesAnterior) / totalGastosMesAnterior) * 100 : 0;
    const provisionesActivas = provisiones?.reduce((sum, p) => sum + Number(p.monto_provision), 0) || 0;
    const totalGastosFijos = gastosFijos?.reduce((sum, g) => sum + Number(g.monto_provision), 0) || 0;
    const gastosFijosActivos = gastosFijos?.filter(g => g.activo).length || 0;

    // 5. Procesar categorías
    const gastosPorCategoria = Object.values(
      (gastosPorCat || []).reduce((acc: any, g: any) => {
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

    // 6. Obtener próximo pago (Nueva funcionalidad)
    const { data: fechasPago } = await supabase
      .from('fechas_pago')
      .select('*')
      .gte('fecha_pago', new Date().toISOString().split('T')[0])
      .order('fecha_pago', { ascending: true })
      .limit(1);

    let proximoPago = null;
    if (fechasPago && fechasPago.length > 0) {
      const fp = fechasPago[0];
      const diasRestantes = Math.ceil(
        (new Date(fp.fecha_pago).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      proximoPago = {
        fecha: new Date(fp.fecha_pago).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }),
        dias: diasRestantes,
      };
    }

    // Objeto para el gráfico de saldo (reutiliza la variable 'fondos' del inicio)
    const saldoFondos = {
      saldo_liquido: saldoTotal, // Ya calculamos esto arriba como saldoTotal
    };

    return NextResponse.json({
      success: true,
      data: {
        periodo,
        resumen: {
          saldoTotal,
          gastosMes: totalGastosMes,
          cambioGastos,
          provisionesActivas,
          totalGastosFijos,
          gastosFijosActivos
        },
        proximoPago,
        saldoFondos,
        proximosVencimientos: proximosVencimientos || [],
        ultimosGastos: ultimosGastos || [],
        gastosPorCategoria
      }
    });
  } catch (error: any) {
    console.error('Error crítico en dashboard:', error);
    // Devolvemos un JSON válido incluso en error para evitar el "Unexpected token <"
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
