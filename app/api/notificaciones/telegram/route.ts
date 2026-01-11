import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mensaje } = body;

    // Obtener configuración
    const { data: config } = await supabaseAdmin
      .from('config_notificaciones')
      .select('telegram_token, telegram_chat_id, telegram_activo')
      .single();

    if (!config?.telegram_activo || !config?.telegram_token || !config?.telegram_chat_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telegram no configurado o desactivado' 
      }, { status: 400 });
    }

    // Enviar mensaje a Telegram
    const telegramUrl = `https://api.telegram.org/bot${config.telegram_token}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegram_chat_id,
        text: mensaje,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.description || 'Error al enviar mensaje');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notificación enviada a Telegram' 
    });

  } catch (error: any) {
    console.error('Error enviando a Telegram:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
