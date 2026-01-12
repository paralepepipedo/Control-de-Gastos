import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🚀 INICIO verificación notificaciones');
    
    const ahoraChile = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const horaActual = ahoraChile.getHours();
    
    const hoy = new Date(ahoraChile);
    hoy.setHours(0, 0, 0, 0);
    
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 3);

    const hoyStr = hoy.toISOString().split('T')[0];
    const limiteStr = limite.toISOString().split('T')[0];

    console.log('📅 Fecha hoy:', hoyStr);
    console.log('📅 Fecha límite (hoy+3):', limiteStr);
    console.log('⏰ Hora Chile:', horaActual);

    // 🧹 LIMPIEZA AUTOMÁTICA
    const hace7dias = new Date(hoy);
    hace7dias.setDate(hace7dias.getDate() - 7);

    const { error: deleteError } = await supabaseAdmin
      .from('notificaciones_enviadas')
      .delete()
      .lt('fecha_envio', hace7dias.toISOString());

    if (deleteError) {
      console.error('⚠️ Error limpiando notificaciones antiguas:', deleteError);
    } else {
      console.log('🧹 Limpieza automática: registros > 7 días eliminados');
    }

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

    // BUSCAR GASTOS NO PAGADOS
    const { data: gastosProximos, error: errorGastos } = await supabaseAdmin
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
      .lte('fecha', limiteStr)
      .order('fecha', { ascending: true });

    console.log('🔍 Gastos encontrados:', gastosProximos?.length || 0);
    if (errorGastos) console.error('❌ Error gastos:', errorGastos);

    if (gastosProximos && gastosProximos.length > 0) {
      console.log('📋 Gastos:', gastosProximos.map(g => `${g.id}: ${g.fecha} - ${g.descripcion}`));
      
      const promesas = gastosProximos.map(async (gasto) => {
        const fechaGasto = new Date(gasto.fecha + 'T00:00:00');
        const diasRestantes = Math.ceil((fechaGasto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        
        // LÓGICA DE VERIFICACIÓN
        if (diasRestantes <= 0) {
          console.log(`🔴 Gasto ${gasto.id} (${gasto.descripcion}) vencido/hoy - Enviar siempre`);
        } else if (diasRestantes >= 1 && diasRestantes <= 3) {
          // Verificar si ya se envió hoy (SIN timezone Z)
          const { data: yaEnviado } = await supabaseAdmin
            .from('notificaciones_enviadas')
            .select('id')
            .eq('gasto_id', gasto.id)
            .gte('fecha_envio', hoyStr + 'T00:00:00')
            .maybeSingle();

          if (yaEnviado) {
            console.log(`⏭️ Gasto ${gasto.id} (${gasto.descripcion}) ya notificado hoy - SKIP`);
            return null;
          }
          console.log(`🟢 Gasto ${gasto.id} (${gasto.descripcion}) futuro - Primera notificación del día`);
        } else {
          console.log(`⚪ Gasto ${gasto.id} vence en ${diasRestantes} días - Fuera de rango - SKIP`);
          return null;
        }

        // Determinar emoji y urgencia
        let emoji = '🚨';
        let urgencia = 'URGENTE';
        
        if (diasRestantes < 0) {
          emoji = '🔴💀';
          urgencia = `VENCIDO HACE ${Math.abs(diasRestantes)} DÍA${Math.abs(diasRestantes) > 1 ? 'S' : ''}`;
        } else if (diasRestantes === 0) {
          emoji = '🔴';
          urgencia = 'VENCE HOY';
        } else if (diasRestantes === 1) {
          emoji = '🟠';
          urgencia = 'VENCE MAÑANA';
        } else if (diasRestantes === 2) {
          emoji = '🟡';
          urgencia = 'VENCE EN 2 DÍAS';
        } else if (diasRestantes === 3) {
          emoji = '🟢';
          urgencia = 'VENCE EN 3 DÍAS';
        }

        const mensaje = `${emoji} <b>${urgencia}</b>\n\n` +
          `💳 ${gasto.descripcion}\n` +
          `💰 Monto: $${Number(gasto.monto).toLocaleString('es-CL')}\n` +
          `📅 Fecha: ${fechaGasto.toLocaleDateString('es-CL')}\n` +
          `⏰ ${diasRestantes < 0 ? `¡VENCIDO hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}!` : diasRestantes === 0 ? 'Vence HOY' : `Faltan ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`}`;

        console.log('📤 Enviando:', gasto.descripcion);

        // Enviar a Telegram
        if (config.telegram_activo) {
          try {
            const telegramUrl = `https://api.telegram.org/bot${config.telegram_token}/sendMessage`;
            const telegramResp = await fetch(telegramUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: config.telegram_chat_id,
                text: mensaje,
                parse_mode: 'HTML',
              }),
            });
            const result = await telegramResp.json();
            console.log('📱 Telegram:', result.ok ? '✅' : '❌');
            
            if (!result.ok) {
              console.error('❌ Error Telegram:', result.description);
            }
          } catch (err) {
            console.error('❌ Error llamando Telegram:', err);
          }
        }

        // Registrar notificación
        const tipoNotif = diasRestantes <= 0 ? 'vencido' : 'proximo';
        const { error: insertError } = await supabaseAdmin
          .from('notificaciones_enviadas')
          .insert({
            gasto_id: gasto.id,
            tipo_notificacion: tipoNotif,
            metodo: config.telegram_activo ? 'telegram' : 'pwa',
            mensaje,
          });

        if (insertError) {
          console.error('❌ Error guardando notificación:', insertError);
        }

        return { 
          tipo: urgencia, 
          gasto: gasto.descripcion,
          fecha: gasto.fecha,
          dias_restantes: diasRestantes
        };
      });

      const resultados = await Promise.all(promesas);
      notificacionesEnviadas.push(...resultados.filter(r => r !== null));

    } else {
      console.log('ℹ️ No hay gastos pendientes');
    }

    console.log('✅ FIN verificación. Notificaciones:', notificacionesEnviadas.length);

    return NextResponse.json({
      success: true,
      message: `Verificación completada. Notificaciones enviadas: ${notificacionesEnviadas.length}`,
      notificaciones: notificacionesEnviadas,
      hora_chile: ahoraChile.toLocaleTimeString('es-CL'),
      fecha_busqueda: `Hasta ${limiteStr}`,
      gastos_encontrados: gastosProximos?.length || 0,
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
