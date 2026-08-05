import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET: Listar categorías
export async function GET() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from('categorias')
      .select('*')
      .order('nombre');

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear categoría
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    // 1. Validar identidad
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No autenticado");

    const body = await request.json();

    const { nombre, icono, tipo } = body;

    if (!nombre || !icono) {
      return NextResponse.json({
        success: false,
        error: 'Nombre e icono son obligatorios'
      }, { status: 400 });
    }

    const { data, error } = await supabase.from('categorias')
      .insert([{
        nombre,
        icono,
        tipo: tipo || 'gasto',
        usuario_id: user.id // <-- INYECCIÓN DE USUARIO
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creando categoría:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar categoría
export async function DELETE(request: Request) {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabase.from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
// UPDATE: Actualizar categoría
export async function PUT(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, nombre, icono, tipo } = body;

    if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

    const { data, error } = await supabase.from('categorias')
      .update({ nombre, icono, tipo })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


