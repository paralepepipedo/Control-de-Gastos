import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🚀 INICIO verificación notificaciones');
    
    // Usar zona horaria de Chile
    const ahoraChile = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const horaActual = ahoraChile.getHours();
    
    const hoy = new Date(ahoraChile);
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // Fechas en formato string sin hora
    const hoyStr = hoy.toISOString().split('T')[0];
    const mananaStr = manana.toISOString().split('T')[0];

    console.log('📅 Fecha hoy:', hoyStr);
    console.log('⏰ Hora Chile:', horaActual);

    // Obtener configuración
    const { data: config } = await supabaseAdmin
      .from('config_notificaciones')
      .select('*')
      .single();

    if (!config) {
      console.error('❌ No hay configuración');
      return NextResponse.json({ success: false, error: 'Sin configuración' });
    }

    console.log('⚙️ Config:', {
      telegram_activo: config.telegram_activo,
      token: config.telegram_token ? 'OK' : 'NULL',
      chat_id: config.telegram_chat_id ? 'OK' : 'NULL'
    });

    // Verificar horario (8am - 11pm Chile)
    if (horaActual < 8 || horaActual > 23) {
      console.log('🌙 Fuera de horario');
      return NextResponse.json({
        success: true,
        message: `Fuera de horario. Hora actual Chile: ${horaActual}h`
      });
    }

    const notificacionesEnviadas = [];

    // 1. BUSCAR GASTOS QUE VENCEN HOY
    const { data: gastosHoy, error: errorGastos } = await supabaseAdmin
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
      .gte('fecha', hoyStr)
      .lt('fecha', mananaStr);

    console.log('🔍 Gastos hoy encontrados:', gastosHoy?.length || 0);
    if (errorGastos) console.error('❌ Error gastos:', errorGastos);

    if (gastosHoy && gastosHoy.length > 0) {
      console.log('📋 Gastos:', gastosHoy.map(g => `${g.id}: ${g.descripcion}`));
      
      for (const gasto of gastosHoy) {
        const fechaGasto = new Date(gasto.fecha);
        const horasRestantes = Math.max(0, Math.floor((fechaGasto.getTime() - ahoraChile.getTime()) / (1000 * 60 * 60)));

        const mensaje = `🚨 <b>PAGO URGENTE HOY</b>\n\n` +
          `💳 ${gasto.descripcion}\n` +
          `💰 Monto: $${Number(gasto.monto).toLocaleString('es-CL')}\n` +
          `📅 Vence: Hoy ${fechaGasto.toLocaleDateString('es-CL')}\n` +
          `⏰ ${horasRestantes > 0 ? `Quedan ${horasRestantes} horas` : 'VENCE AHORA'}`;

        console.log('📤 Enviando mensaje:', mensaje.substring(0, 50) + '...');

        // Enviar a Telegram
        if (config.telegram_activo) {
          try {
            const telegramResp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notificaciones/telegram`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mensaje }),
            });
            const result = await telegramResp.json();
            console.log('📱 Telegram resultado:', result);
          } catch (err) {
            console.error('❌ Error Telegram:', err);
          }
        } else {
          console.log('⚠️ Telegram desactivado en config');
        }

        // Registrar notificación
        const { error: insertError } = await supabaseAdmin
          .from('notificaciones_enviadas')
          .insert({
            gasto_id: gasto.id,
            tipo_notificacion: 'hoy',
            metodo: config.telegram_activo ? 'telegram' : 'pwa',
            mensaje,
          });

        if (insertError) {
          console.error('❌ Error al guardar notificación:', insertError);
        }

        notificacionesEnviadas.push({ tipo: 'hoy', gasto: gasto.descripcion });
      }
    } else {
      console.log('ℹ️ No hay gastos para hoy con pagado=false');
    }

    // 2. GASTOS MAÑANA (solo a las 9am)
    if (horaActual === 9) {
      console.log('🌅 Verificando gastos de mañana (9am)');
      
      const pasadoManana = new Date(manana);
      pasadoManana.setDate(pasadoManana.getDate() + 1);
      const pasadoMananaStr = pasadoManana.toISOString().split('T')[0];

      const { data: gastosManana } = await supabaseAdmin
        .from('gastos')
        .select('id, descripcion, monto, fecha, pagado')
        .eq('pagado', false)
        .gte('fecha', mananaStr)
        .lt('fecha', pasadoMananaStr);

      console.log('📅 Gastos mañana:', gastosManana?.length || 0);

      if (gastosManana && gastosManana.length > 0) {
        for (const gasto of gastosManana) {
          const fechaGasto = new Date(gasto.fecha);
          const mensaje = `⚠️ <b>RECORDATORIO DE PAGO</b>\n\n` +
            `💳 ${gasto.descripcion}\n` +
            `💰 Monto: $${Number(gasto.monto).toLocaleString('es-CL')}\n` +
            `📅 Vence: Mañana ${fechaGasto.toLocaleDateString('es-CL')}`;

          if (config.telegram_activo) {
            try {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notificaciones/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje }),
              });
            } catch (err) {
              console.error('❌ Error Telegram mañana:', err);
            }
          }

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

    console.log('✅ FIN verificación. Notificaciones:', notificacionesEnviadas.length);

    return NextResponse.json({
      success: true,
      message: `Verificación completada. Notificaciones enviadas: ${notificacionesEnviadas.length}`,
      notificaciones: notificacionesEnviadas,
      hora_chile: ahoraChile.toLocaleTimeString('es-CL'),
      fecha_busqueda: hoyStr,
    });

  } catch (error: any) {
    console.error('💥 ERROR FATAL:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
