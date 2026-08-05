import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    const supabase = await createClient();
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No autenticado");

    const { tipo, referencia_id, anio, mes, monto_override, descripcion } = await request.json();

    if (!tipo || referencia_id === undefined || referencia_id === null || !anio || !mes || monto_override === undefined) {
      return NextResponse.json({ error: 'Parámetros requeridos faltando' }, { status: 400 });
    }

    await supabase.from('proyeccion_overrides').delete().match({ tipo, referencia_id, anio, mes });

    const { data, error } = await supabase.from('proyeccion_overrides')
      .insert({
        tipo,
        referencia_id,
        anio,
        mes,
        monto_override: Number(monto_override),
        descripcion,
        updated_at: new Date().toISOString(),
        usuario_id: user.id
      })
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const referencia_id = searchParams.get('referencia_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    const { error } = await supabase.from('proyeccion_overrides')
      .delete()
      .match({ tipo, referencia_id, anio: Number(anio), mes: Number(mes) });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}