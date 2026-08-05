import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
  const { id } = await params;
  try {
    const body = await request.json();

    const { data, error } = await supabase.from('categorias')
      .update({
        nombre: body.nombre,
        icono: body.icono
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
  try {
    const { id } = await params;

    const { error } = await supabase.from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
