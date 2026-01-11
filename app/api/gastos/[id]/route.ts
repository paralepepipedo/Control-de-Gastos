import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data, error } = await supabase
      .from('gastos')
      .select(`
        *,
        categorias (
          id,
          nombre,
          icono
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error en GET gasto:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updateData: any = {
      fecha: body.fecha,
      descripcion: body.descripcion,
      monto: parseFloat(body.monto),
      metodo_pago: body.metodo_pago,
      pagado: Boolean(body.pagado)
    };

    if (body.categoria_id && body.categoria_id !== '' && body.categoria_id !== 'null' && body.categoria_id !== 'undefined') {
      updateData.categoria_id = parseInt(body.categoria_id);
    } else {
      updateData.categoria_id = null;
    }
    
    const { data, error } = await supabase
      .from('gastos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error en PUT gasto:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updateData: any = {};
    
    if ('pagado' in body) {
      updateData.pagado = Boolean(body.pagado);
    }
    
    if ('monto' in body && body.monto !== undefined && body.monto !== null) {
      updateData.monto = parseFloat(body.monto);
    }
    
    if ('descripcion' in body && body.descripcion !== undefined) {
      updateData.descripcion = body.descripcion;
    }
    
    const { data, error } = await supabase
      .from('gastos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error en PATCH gasto:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE gasto:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
