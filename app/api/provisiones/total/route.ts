import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('provisiones')
      .select('monto_provision');

    if (error) {
      console.error('Error obteniendo provisiones:', error);
      throw error;
    }

    const total = data?.reduce((sum, p) => sum + Number(p.monto_provision), 0) || 0;

    console.log('✅ Total provisión calculado:', total, 'desde', data?.length, 'provisiones');

    return NextResponse.json({
      success: true,
      total
    });

  } catch (error: any) {
    console.error('Error en API provisiones/total:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
