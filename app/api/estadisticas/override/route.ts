import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { tipo, referencia_id, anio, mes, monto_override, descripcion } = await request.json();

    if (!tipo || referencia_id === undefined || referencia_id === null || !anio || !mes || monto_override === undefined) {
      return NextResponse.json(
        { error: 'Parámetros requeridos faltando' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // 1. ELIMINAMOS TODOS los registros duplicados o viejos que existan para esta celda
    await supabaseAdmin.from('proyeccion_overrides')
      .delete()
      .match({
        tipo: tipo,
        referencia_id: referencia_id,
        anio: anio,
        mes: mes
      });

    // 2. INSERTAMOS el nuevo valor como el ÚNICO registro válido
    const { data, error } = await supabaseAdmin.from('proyeccion_overrides')
      .insert({
        tipo,
        referencia_id,
        anio,
        mes,
        monto_override: Number(monto_override),
        descripcion,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error guardando override:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Eliminar override (volver al valor original)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const referencia_id = searchParams.get('referencia_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    const supabase = supabaseAdmin;

    const { error } = await supabaseAdmin.from('proyeccion_overrides')
      .delete()
      .match({ tipo, referencia_id, anio: Number(anio), mes: Number(mes) });

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error eliminando override:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

