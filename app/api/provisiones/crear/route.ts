import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('provisiones')
      .insert({
        gasto_fijo_id: body.gasto_fijo_id,
        mes: body.mes,
        anio: body.anio,
        fecha_vencimiento: body.fecha_vencimiento,
        monto_provision: body.monto_provision,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
