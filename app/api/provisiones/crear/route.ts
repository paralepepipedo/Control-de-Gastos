import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    const supabase = await createClient();
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No autenticado");

    const body = await request.json();

    const { data, error } = await supabase.from('provisiones')
      .insert({
        gasto_fijo_id: body.gasto_fijo_id,
        mes: body.mes,
        anio: body.anio,
        fecha_vencimiento: body.fecha_vencimiento,
        monto_provision: body.monto_provision,
        estado: 'pendiente',
        usuario_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}