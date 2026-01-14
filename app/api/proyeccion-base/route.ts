import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Obtener configuración de ambas tablas
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('proyeccion_base')
      .select('*')
      .order('tabla', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error al obtener proyección base:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Guardar o actualizar configuración de una tabla
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tabla, saldo_inicial, ingresos_mes } = body;

    // Validaciones
    if (!tabla || ![1, 2].includes(tabla)) {
      return NextResponse.json(
        { success: false, error: 'Tabla debe ser 1 o 2' },
        { status: 400 }
      );
    }

    if (saldo_inicial === undefined || ingresos_mes === undefined) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Upsert (insertar o actualizar)
    const { data, error } = await supabaseAdmin
      .from('proyeccion_base')
      .upsert(
        {
          tabla,
          saldo_inicial: Number(saldo_inicial),
          ingresos_mes: Number(ingresos_mes),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'tabla' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      mensaje: `Configuración de Tabla ${tabla} guardada correctamente`
    });
  } catch (error: any) {
    console.error('Error al guardar proyección base:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
