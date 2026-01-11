import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Listar categorías
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre');

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear categoría (AQUÍ ESTÁ LA CORRECCIÓN)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Si la interfaz no envía 'tipo', usamos 'gasto' por defecto para evitar el error
    const { nombre, icono, tipo } = body;

    if (!nombre || !icono) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nombre e icono son obligatorios' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('categorias')
      .insert([{ 
        nombre, 
        icono,
        // CORRECCIÓN: Si 'tipo' es null/undefined, insertamos 'gasto'
        tipo: tipo || 'gasto' 
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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('categorias')
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
  try {
    const body = await request.json();
    const { id, nombre, icono, tipo } = body;

    if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

    const { data, error } = await supabase
      .from('categorias')
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

