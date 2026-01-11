import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Obtener fondos y calcular saldo líquido
export async function GET(request: Request) {
  try {
    // 1. Obtener todos los fondos ordenados por fecha de pago
    const { data: fondos, error: errorFondos } = await supabase
      .from('fondos')
      .select('*')
      .order('fecha_pago', { ascending: false });

    if (errorFondos) throw errorFondos;

    // Si no hay fondos, saldo todo en 0
    if (!fondos || fondos.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        resumen: {
          total_ingresos: 0,
          total_egresos_efectivo: 0,
          saldo_liquido: 0
        }
      });
    }

    // 2. Determinar desde qué MES se deben considerar ingresos/gastos
    // Tomamos el mes_que_cubre MÁS ANTIGUO registrado
    const fechasQueCubre = fondos
      .map(f => f.mes_que_cubre)
      .filter(Boolean)
      .sort(); // ISO date string ordena bien

    const primerMesQueCubre = fechasQueCubre[0]; // ej: "2025-12-01"

    // 3. Calcular fecha de inicio de ciclo según tu regla 26–25
    // Para ese primerMesQueCubre calculamos el período con la regla:
    // del 26 del mes anterior al 25 del mes actual.
    const base = new Date(primerMesQueCubre);
    const dia = base.getDate();
    let mesPeriodo = base.getMonth() + 1; // 1-12
    let anioPeriodo = base.getFullYear();

    // Regla: si es antes del 26, corresponde al mes anterior
    if (dia < 26) {
      mesPeriodo = mesPeriodo - 1;
      if (mesPeriodo === 0) {
        mesPeriodo = 12;
        anioPeriodo = anioPeriodo - 1;
      }
    }

    // fecha_inicio = 26 del mes anterior al mesPeriodo
    let mesInicio = mesPeriodo - 1;
    let anioInicio = anioPeriodo;
    if (mesInicio === 0) {
      mesInicio = 12;
      anioInicio = anioInicio - 1;
    }

    const fechaInicioCiclo = `${anioInicio}-${String(mesInicio).padStart(2, '0')}-26`;

    // 4. Calcular total de ingresos SOLO desde primerMesQueCubre en adelante
    const fondosDesdeCiclo = fondos.filter(f => f.mes_que_cubre >= primerMesQueCubre);
    const totalIngresos = fondosDesdeCiclo.reduce(
      (sum, f) => sum + Number(f.monto),
      0
    );

    // 5. Obtener gastos PAGADOS en EFECTIVO desde fechaInicioCiclo en adelante
    const { data: gastosEfectivo, error: errorGastos } = await supabase
      .from('gastos')
      .select('monto, fecha')
      .eq('metodo_pago', 'efectivo')
      .eq('pagado', true)
      .gte('fecha', fechaInicioCiclo);

    if (errorGastos) throw errorGastos;

    const totalEgresosEfectivo =
      gastosEfectivo?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;

    const saldoLiquido = totalIngresos - totalEgresosEfectivo;

    return NextResponse.json({
      success: true,
      data: fondos, // historial completo para la lista
      resumen: {
        total_ingresos: totalIngresos,
        total_egresos_efectivo: totalEgresosEfectivo,
        saldo_liquido: saldoLiquido,
        primer_mes_que_cubre: primerMesQueCubre,
        fecha_inicio_ciclo: fechaInicioCiclo
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Crear fondo (usando tus campos: fecha_pago, mes_que_cubre)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fecha_pago, mes_que_cubre, tipo, monto, descripcion } = body;

    const { data, error } = await supabase
      .from('fondos')
      .insert([{ fecha_pago, mes_que_cubre, tipo, monto, descripcion }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
