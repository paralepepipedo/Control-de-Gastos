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
    
    // Fecha límite: hoy + 3 días
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 3);

    // Fechas en formato string sin hora
    const hoyStr = hoy.toISOString().split('T')[0];
    const limiteStr = limite.toISOString().split('T')[0];

    console.log('📅 Fecha hoy:', hoyStr);
    console.log('📅 Fecha límite (hoy+3):', limiteStr);
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

    // 1. BUSCAR GASTOS NO PAGADOS (vencidos + hoy + próximos 3 días)
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
      
      for (const gasto of gastosProximos) {
        const fechaGasto = new Date(gasto.fecha + 'T00:00:00');
        const diasRestantes = Math.ceil((fechaGasto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        
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
            
            if (!result.success) {
              console.error('❌ Error en Telegram:', result.error);
            }
          } catch (err) {
            console.error('❌ Error al llamar Telegram:', err);
          }
        } else {
          console.log('⚠️ Telegram desactivado en config');
        }

        // Registrar notificación
        const { error: insertError } = await supabaseAdmin
          .from('notificaciones_enviadas')
          .insert({
            gasto_id: gasto.id,
            tipo_notificacion: diasRestantes < 0 ? 'vencido' : diasRestantes === 0 ? 'hoy' : diasRestantes === 1 ? 'manana' : 'proximo',
            metodo: config.telegram_activo ? 'telegram' : 'pwa',
            mensaje,
          });

        if (insertError) {
          console.error('❌ Error al guardar notificación:', insertError);
        } else {
          console.log('✅ Notificación registrada en BD');
        }

        notificacionesEnviadas.push({ 
          tipo: urgencia, 
          gasto: gasto.descripcion,
          fecha: gasto.fecha,
          dias_restantes: diasRestantes
        });
      }
    } else {
      console.log('ℹ️ No hay gastos pendientes');
    }

    console.log('✅ FIN verificación. Notificaciones enviadas:', notificacionesEnviadas.length);

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
