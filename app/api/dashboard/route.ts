import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const hoy = new Date();
    
    // Obtener período actual desde la API de períodos
    const periodoResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/periodos`);
    const periodoResult = await periodoResponse.json();
    
    if (!periodoResult.success) {
      throw new Error('No se pudo obtener el período actual');
    }
    
    const periodo = periodoResult.data;
    const inicioMes = periodo.fecha_inicio;
    const finMes = periodo.fecha_fin;
    
    // Calcular período anterior (mes anterior)
    const mesAnterior = periodo.mes === 1 ? 12 : periodo.mes - 1;
    const anioAnterior = periodo.mes === 1 ? periodo.anio - 1 : periodo.anio;
    
    const periodoAnteriorResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/periodos?mes=${mesAnterior}&anio=${anioAnterior}`
    );
    const periodoAnteriorResult = await periodoAnteriorResponse.json();
    
    const periodoAnterior = periodoAnteriorResult.data;
    const inicioMesAnterior = periodoAnterior.fecha_inicio;
    const finMesAnterior = periodoAnterior.fecha_fin;
    
    const proximos7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Ejecutar todas las queries en paralelo
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

    const saldoTotal = fondos?.reduce((sum, f) => sum + Number(f.saldo_actual), 0) || 0;
    const totalGastosMes = gastosMes?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;
    const totalGastosMesAnterior = gastosMesAnterior?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;
    const cambioGastos = totalGastosMesAnterior > 0 ? ((totalGastosMes - totalGastosMesAnterior) / totalGastosMesAnterior) * 100 : 0;
    const provisionesActivas = provisiones?.reduce((sum, p) => sum + Number(p.monto_provision), 0) || 0;
    const totalGastosFijos = gastosFijos?.reduce((sum, g) => sum + Number(g.monto_provision), 0) || 0;
    const gastosFijosActivos = gastosFijos?.filter(g => g.activo).length || 0;

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

    // ========== AGREGAR AQUÍ (ANTES DEL RETURN) ==========
    
    // Obtener próximo pago
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

    // Obtener saldo fondos
    const { data: fondos } = await supabase
      .from('fondos')
      .select('*');

    const saldoFondos = {
      saldo_liquido: fondos?.reduce((sum, f) => sum + Number(f.monto), 0) || 0,
    };

    // Calcular pendientes por método de pago
    const pendientesTarjeta = gastos?.filter(g => !g.pagado && g.metodo_pago === 'tarjeta')
      .reduce((sum, g) => sum + Number(g.monto), 0) || 0;
    const pendientesEfectivo = gastos?.filter(g => !g.pagado && g.metodo_pago === 'efectivo')
      .reduce((sum, g) => sum + Number(g.monto), 0) || 0;
    const cantidadPendientesTarjeta = gastos?.filter(g => !g.pagado && g.metodo_pago === 'tarjeta').length || 0;
    const cantidadPendientesEfectivo = gastos?.filter(g => !g.pagado && g.metodo_pago === 'efectivo').length || 0;

    // ========== FIN DE CÓDIGO AGREGADO ==========
    
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
    console.error('Error en dashboard:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
