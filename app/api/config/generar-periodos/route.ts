import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { calcularPeriodoProvisional } from '@/lib/utils';

export async function POST() {
    const supabase = await createClient();
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No autenticado");

    const { data: gastos } = await supabase.from('gastos')
      .select('fecha')
      .order('fecha', { ascending: true });

    if (!gastos || gastos.length === 0) {
      return NextResponse.json({ success: false, error: 'No hay gastos registrados' });
    }

    const fechaMasAntigua = new Date(gastos[0].fecha);
    const fechaMasReciente = new Date(gastos[gastos.length - 1].fecha);
    const periodosACrear: any[] = [];
    const periodosUnicos = new Set<string>();

    let fechaIteracion = new Date(fechaMasAntigua);
    const fechaActual = new Date();

    while (fechaIteracion <= fechaActual) {
      const periodo = calcularPeriodoProvisional(fechaIteracion);
      const key = `${periodo.mes}-${periodo.anio}`;

      if (!periodosUnicos.has(key)) {
        periodosUnicos.add(key);
        periodosACrear.push({
          mes: periodo.mes,
          anio: periodo.anio,
          fecha_inicio: periodo.fecha_inicio,
          fecha_fin: periodo.fecha_fin,
          es_provisional: true,
          notas: 'Generado automáticamente',
          usuario_id: user.id
        });
      }
      fechaIteracion.setMonth(fechaIteracion.getMonth() + 1);
    }

    let periodosCreados = 0;
    for (const periodo of periodosACrear) {
      const { data: existe } = await supabase.from('periodos')
        .select('id')
        .eq('mes', periodo.mes)
        .eq('anio', periodo.anio)
        .single();

      if (!existe) {
        const { error } = await supabase.from('periodos').insert(periodo);
        if (!error) periodosCreados++;
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `✅ ${periodosCreados} períodos creados`,
      total: periodosACrear.length,
      creados: periodosCreados
    });
  } catch (error: any) {
    console.error('Error generando períodos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}