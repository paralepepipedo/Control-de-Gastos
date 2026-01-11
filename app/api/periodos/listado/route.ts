import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('periodos')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .limit(12);

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Error en GET listado periodos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
