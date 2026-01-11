import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes') || new Date().toISOString().slice(0, 7) + '-01';

    const { data, error } = await supabase
      .from('tarjeta_credito_itau')
      .select('*')
      .eq('mes', mes)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Calcular total gastado del período
    if (data) {
      const fechaDesde = data.fecha_inicio_real || data.fecha_inicio_estimada;
      const fechaHasta = data.fecha_fin_real || data.fecha_fin_estimada;

      const { data: gastos } = await supabase
        .from('gastos')
        .select('monto')
        .eq('metodo_pago', 'tarjeta')
        .eq('estado', 'pagado')
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta);

      const totalGastado = gastos?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;

      await supabase
        .from('tarjeta_credito_itau')
        .update({ total_gastado: totalGastado })
        .eq('id', data.id);

      data.total_gastado = totalGastado;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Registrar factura
    const { data, error } = await supabase
      .from('tarjeta_credito_itau')
      .update({
        fecha_inicio_real: body.fecha_inicio_real,
        fecha_fin_real: body.fecha_fin_real,
        fecha_factura: body.fecha_factura,
        fecha_vencimiento: body.fecha_vencimiento,
        monto_minimo: body.monto_minimo,
        monto_resto: body.total_gastado - body.monto_minimo,
        fecha_pago_minimo: body.fecha_vencimiento,
        factura_registrada: true
      })
      .eq('mes', body.mes)
      .select()
      .single();

    if (error) throw error;

    // Crear gastos pendientes
    const categoriaTC = await supabase.from('categorias').select('id').eq('nombre', 'TC Itaú').single();
    
    await supabase
      .from('gastos')
      .insert({
        fecha: body.fecha_vencimiento,
        monto: body.monto_minimo,
        categoria_id: categoriaTC.data?.id,
        metodo_pago: 'efectivo',
        descripcion: 'Pago mínimo TC Itaú',
        estado: 'pendiente',
        fecha_vencimiento: body.fecha_vencimiento
      });

    await supabase
      .from('gastos')
      .insert({
        fecha: body.fecha_pago_resto || data.fecha_pago_resto,
        monto: body.total_gastado - body.monto_minimo,
        categoria_id: categoriaTC.data?.id,
        metodo_pago: 'efectivo',
        descripcion: 'Resto TC Itaú (Total - Mínimo)',
        estado: 'pendiente',
        fecha_vencimiento: body.fecha_pago_resto || data.fecha_pago_resto
      });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('tarjeta_credito_itau')
      .update({
        fecha_inicio_estimada: body.fecha_inicio_estimada,
        fecha_fin_estimada: body.fecha_fin_estimada,
        fecha_pago_resto: body.fecha_pago_resto
      })
      .eq('mes', body.mes)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
