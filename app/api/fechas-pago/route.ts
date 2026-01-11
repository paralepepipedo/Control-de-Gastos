import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Obtener todas las fechas de pago
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('fechas_pago')
      .select('*')
      .order('anio', { ascending: true })
      .order('mes', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Crear/Actualizar fecha de pago
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mes, anio, fecha_pago, descripcion } = body;

    const { data, error } = await supabaseAdmin
      .from('fechas_pago')
      .upsert({
        mes,
        anio,
        fecha_pago,
        descripcion,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'mes,anio'
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar fecha de pago
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { error } = await supabaseAdmin
      .from('fechas_pago')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
