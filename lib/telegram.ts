export async function sendTelegramNotification(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Telegram credentials not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}

export function formatTelegramNotification(
  tipo: 'pago_pendiente' | 'tc_itau' | 'resumen',
  data: any
): string {
  switch (tipo) {
    case 'pago_pendiente':
      return `
🔔 <b>Control Financiero</b>

⚠️ <b>Recordatorio de Pago</b>
──────────────────────
<b>${data.nombre}</b>
💰 Monto: ${data.monto}
📆 Vence: ${data.fecha_vencimiento}

🔗 Marcar como pagado:
${data.url}
      `.trim();

    case 'tc_itau':
      return `
💳 <b>TC Itaú - Recordatorio</b>

⚠️ <b>Hoy debes pagar:</b>
💰 Monto: ${data.monto}
📅 Fecha: ${data.fecha}

${data.tipo === 'minimo' ? '⚠️ <b>PAGO MÍNIMO</b> para evitar mora' : '✅ <b>RESTO TC</b> (Total - Mínimo)'}

Total ciclo: ${data.total_gastado}
- Mínimo: ${data.monto_minimo}
────────────────────
= Resto: ${data.monto_resto}

🔗 ${data.url}
      `.trim();

    default:
      return message;
  }
}
