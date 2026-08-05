import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Leer configuración por clave
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clave = searchParams.get('clave');

    if (!clave) {
      return NextResponse.json({ success: false, error: 'Clave requerida' }, { status: 400 });
    }

    const { data, error } = await supabase.from('app_config')
      .select('*')
      .eq('clave', clave)
      .single();

    // El error PGRST116 significa que no encontró la fila (es normal si es la primera vez)
    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ 
      success: true, 
      data: data || null 
    });

  } catch (error: any) {
    console.error('Error GET /api/config:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear o actualizar configuración
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clave, valor_numeric, descripcion, valor_text } = body;

    if (!clave) {
      return NextResponse.json({ success: false, error: 'Clave requerida' }, { status: 400 });
    }

    const { data, error } = await supabase.from('app_config')
      .upsert(
        { 
          clave, 
          valor_numeric, 
          descripcion, 
          valor_text 
        },
        { onConflict: 'clave' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error POST /api/config:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
