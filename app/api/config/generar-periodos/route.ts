import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calcularPeriodoProvisional } from '@/lib/utils';

export async function POST() {
  try {
    // Obtener fecha del gasto más antiguo y más reciente
    const { data: gastos } = await supabase
      .from('gastos')
      .select('fecha')
      .order('fecha', { ascending: true });

    if (!gastos || gastos.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No hay gastos registrados' 
      });
    }

    const fechaMasAntigua = new Date(gastos[0].fecha);
    const fechaMasReciente = new Date(gastos[gastos.length - 1].fecha);

    // Generar todos los períodos desde el más antiguo hasta el actual
    const periodosACrear: any[] = [];
    const periodosUnicos = new Set<string>();

    let fechaIteracion = new Date(fechaMasAntigua);
    const fechaActual = new Date();
    
    // Asegurar que llegamos hasta el mes actual
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
          notas: 'Generado automáticamente'
        });
      }
      
      // Avanzar un mes
      fechaIteracion.setMonth(fechaIteracion.getMonth() + 1);
    }

    // Insertar períodos (ignorar duplicados)
    let periodosCreados = 0;
    for (const periodo of periodosACrear) {
      const { data: existe } = await supabase
        .from('periodos')
        .select('id')
        .eq('mes', periodo.mes)
        .eq('anio', periodo.anio)
        .single();

      if (!existe) {
        const { error } = await supabase
          .from('periodos')
          .insert(periodo);

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
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
