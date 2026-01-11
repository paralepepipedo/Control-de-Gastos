import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    let query = supabase
      .from('provisiones')
      .select(`
        *,
        gastos_fijos (
          id,
          nombre,
          categoria_id,
          categorias (
            nombre,
            icono
          )
        )
      `)
      .order('fecha_vencimiento', { ascending: true });

    if (mes && anio) {
      query = query.eq('mes', Number(mes)).eq('anio', Number(anio));
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Error en GET provisiones:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
