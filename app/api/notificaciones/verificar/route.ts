import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // Obtener configuración
    const { data: config } = await supabaseAdmin
      .from('config_notificaciones')
      .select('*')
      .single();

    if (!config) {
      return NextResponse.json({ success: false, error: 'Sin configuración' });
    }

    // Verificar horario (8am - 11pm)
    if (horaActual < 8 || horaActual > 23) {
      return NextResponse.json({ 
        success: true, 
        message: 'Fuera del horario de notificaciones' 
      });
    }

    const notificacionesEnviadas = [];

    // 1. BUSCAR GASTOS QUE VENCEN HOY (pendientes)
    const { data: gastosHoy } = await supabaseAdmin
      .from('gastos')
      .select(`
        id, 
        descripcion, 
        monto, 
        fecha,
        pagado,
        categorias(nombre, icono)
      `)
      .eq('pagado', false)
      .gte('fecha', hoy.toISOString())
      .lt('fecha', manana.toISOString());

    if (gastosHoy && gastosHoy.length > 0) {
      for (const gasto of gastosHoy) {
        // Verificar si ya enviamos notificación esta hora
        const { data: yaEnviado } = await supabaseAdmin
          .from('notificaciones_enviadas')
          .select('id')
          .eq('gasto_id', gasto.id)
          .eq('tipo_notificacion', 'hoy')
          .gte('fecha_envio', new Date(ahora.getTime() - 60 * 60 * 1000).toISOString())
          .single();

        if (yaEnviado) continue; // Ya se envió esta hora

        // Calcular horas restantes
        const fechaGasto = new Date(gasto.fecha);
        const horasRestantes = Math.max(0, Math.floor((fechaGasto.getTime() - ahora.getTime()) / (1000 * 60 * 60)));

        const mensaje = `🚨 <b>PAGO URGENTE HOY</b>\n\n` +
          `💳 ${gasto.descripcion}\n` +
          `💰 Monto: $${Number(gasto.monto).toLocaleString('es-CL')}\n` +
          `📅 Vence: Hoy ${fechaGasto.toLocaleDateString('es-CL')}\n` +
          `⏰ ${horasRestantes > 0 ? `Quedan ${horasRestantes} horas` : 'VENCE AHORA'}`;

        // Enviar a Telegram
        if (config.telegram_activo) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notificaciones/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje }),
          });
        }

        // Registrar notificación
        await supabaseAdmin
          .from('notificaciones_enviadas')
          .insert({
            gasto_id: gasto.id,
            tipo_notificacion: 'hoy',
            metodo: config.telegram_activo ? 'telegram' : 'pwa',
            mensaje,
          });

        notificacionesEnviadas.push({ tipo: 'hoy', gasto: gasto.descripcion });
      }
    }

    // 2. BUSCAR GASTOS QUE VENCEN MAÑANA (solo a las 9am)
    if (horaActual === 9) {
      const pasadoManana = new Date(manana);
      pasadoManana.setDate(pasadoManana.getDate() + 1);

      const { data: gastosManana } = await supabaseAdmin
        .from('gastos')
        .select(`
          id, 
          descripcion, 
          monto, 
          fecha,
          pagado
        `)
        .eq('pagado', false)
        .gte('fecha', manana.toISOString())
        .lt('fecha', pasadoManana.toISOString());

      if (gastosManana && gastosManana.length > 0) {
        for (const gasto of gastosManana) {
          // Verificar si ya enviamos hoy
          const { data: yaEnviado } = await supabaseAdmin
            .from('notificaciones_enviadas')
            .select('id')
            .eq('gasto_id', gasto.id)
            .eq('tipo_notificacion', 'manana')
            .gte('fecha_envio', hoy.toISOString())
            .single();

          if (yaEnviado) continue;

          const fechaGasto = new Date(gasto.fecha);
          const mensaje = `⚠️ <b>RECORDATORIO DE PAGO</b>\n\n` +
            `💳 ${gasto.descripcion}\n` +
            `💰 Monto: $${Number(gasto.monto).toLocaleString('es-CL')}\n` +
            `📅 Vence: Mañana ${fechaGasto.toLocaleDateString('es-CL')}`;

          // Enviar a Telegram
          if (config.telegram_activo) {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notificaciones/telegram`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mensaje }),
            });
          }

          // Registrar notificación
          await supabaseAdmin
            .from('notificaciones_enviadas')
            .insert({
              gasto_id: gasto.id,
              tipo_notificacion: 'manana',
              metodo: config.telegram_activo ? 'telegram' : 'pwa',
              mensaje,
            });

          notificacionesEnviadas.push({ tipo: 'manana', gasto: gasto.descripcion });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Verificación completada. Notificaciones enviadas: ${notificacionesEnviadas.length}`,
      notificaciones: notificacionesEnviadas,
      hora: ahora.toLocaleTimeString('es-CL'),
    });

  } catch (error: any) {
    console.error('Error en verificación de notificaciones:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
