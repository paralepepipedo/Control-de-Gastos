import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Obtener configuración
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('config_notificaciones')
      .select('*')
      .single();

    if (error) throw error;

    // Ocultar token completo por seguridad
    const config = {
      ...data,
      telegram_token: data.telegram_token ? '***' + data.telegram_token.slice(-6) : null,
    };

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Guardar configuración
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegram_token, telegram_chat_id, telegram_activo, pwa_activo } = body;

    const { data, error } = await supabaseAdmin
      .from('config_notificaciones')
      .update({
        telegram_token,
        telegram_chat_id,
        telegram_activo,
        pwa_activo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
