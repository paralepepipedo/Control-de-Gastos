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

    // BUSCAR GASTOS NO PAGADOS dentro del rango
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

        console.log(`\n🔍 Gasto ${gasto.id}: "${gasto.descripcion}" - Días: ${diasRestantes}`);

        // ========================================
        // LÓGICA SIMPLIFICADA
        // ========================================

        let debeEnviar = false;

        // 1️⃣ VENCIDOS/HOY (≤0 días): ENVIAR SIEMPRE
        if (diasRestantes <= 0) {
          console.log(`🔴 VENCIDO/HOY - Enviar SIEMPRE`);
          debeEnviar = true;
        }
        
        // 2️⃣ PRÓXIMOS (1-3 días): Enviar solo si NO se envió hoy
        else if (diasRestantes >= 1 && diasRestantes <= 3) {
          console.log(`🟡 Vence en ${diasRestantes} día(s) - Verificando...`);
          
          const { data: yaEnviadoHoy } = await supabaseAdmin
            .from('notificaciones_enviadas')
            .select('id')
            .eq('gasto_id', gasto.id)
            .gte('fecha_envio', hoyStr + 'T00:00:00')
            .maybeSingle();

          if (yaEnviadoHoy) {
            console.log(`⏭️ SKIP - Ya notificado hoy`);
            return null;
          }
          
          console.log(`✅ OK - Primera vez hoy`);
          debeEnviar = true;
        }
        
        // 3️⃣ FUERA DE RANGO (>3 días)
        else {
          console.log(`⚪ SKIP - Fuera de rango (${diasRestantes} días)`);
          return null;
        }

        if (!debeEnviar) {
          return null;
        }

        // ========================================
        // CONSTRUIR MENSAJE
        // ========================================

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

        const mensaje = `${emoji} ${urgencia}\n\n` +
  `💳 <b>${gasto.descripcion}</b>\n\n` +
  `💰 Monto: $${Number(gasto.monto).toLocaleString('es-CL')}\n` +
  `📅 Fecha: ${fechaGasto.toLocaleDateString('es-CL')}\n` +
  `⏰ ${diasRestantes < 0 
    ? `¡VENCIDO hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}!` 
    : diasRestantes === 0 
      ? 'Vence HOY' 
      : `Faltan ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`}`;


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
            console.log('📱 Telegram:', result.ok ? '✅' : '❌', result.description || '');
          } catch (err) {
            console.error('❌ Error Telegram:', err);
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
          console.error('❌ Error guardando:', insertError);
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

    console.log('✅ FIN. Notificaciones:', notificacionesEnviadas.length);

    return NextResponse.json({
      success: true,
      message: `Verificación completada. Notificaciones enviadas: ${notificacionesEnviadas.length}`,
      notificaciones: notificacionesEnviadas,
      hora_chile: ahoraChile.toLocaleTimeString('es-CL'),
      fecha_busqueda: `Hasta ${limiteStr}`,
      gastos_encontrados: gastosProximos?.length || 0,
    });

  } catch (error: any) {
    console.error('💥 ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
