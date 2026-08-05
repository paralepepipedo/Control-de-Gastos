import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
    const supabase = await createClient();
  try {
    const { data: fondos, error: errorFondos } = await supabase.from('fondos').select('*').order('fecha_pago', { ascending: false });
    if (errorFondos) throw errorFondos;

    if (!fondos || fondos.length === 0) {
      return NextResponse.json({ success: true, data: [], resumen: { total_ingresos: 0, total_egresos_efectivo: 0, saldo_liquido: 0 } });
    }

    const fechasQueCubre = fondos.map(f => f.mes_que_cubre).filter(Boolean).sort();
    const primerMesQueCubre = fechasQueCubre[0];
    const base = new Date(primerMesQueCubre);
    const dia = base.getDate();
    let mesPeriodo = base.getMonth() + 1;
    let anioPeriodo = base.getFullYear();

    if (dia < 26) {
      mesPeriodo = mesPeriodo - 1;
      if (mesPeriodo === 0) { mesPeriodo = 12; anioPeriodo = anioPeriodo - 1; }
    }

    let mesInicio = mesPeriodo - 1;
    let anioInicio = anioPeriodo;
    if (mesInicio === 0) { mesInicio = 12; anioInicio = anioInicio - 1; }

    const fechaInicioCiclo = `${anioInicio}-${String(mesInicio).padStart(2, '0')}-26`;
    const fondosDesdeCiclo = fondos.filter(f => f.mes_que_cubre >= primerMesQueCubre);
    const totalIngresos = fondosDesdeCiclo.reduce((sum, f) => sum + Number(f.monto), 0);

    const { data: gastosEfectivo, error: errorGastos } = await supabase.from('gastos')
      .select('monto, fecha')
      .eq('metodo_pago', 'efectivo')
      .eq('pagado', true)
      .gte('fecha', fechaInicioCiclo);

    if (errorGastos) throw errorGastos;

    const totalEgresosEfectivo = gastosEfectivo?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;
    const saldoLiquido = totalIngresos - totalEgresosEfectivo;

    return NextResponse.json({
      success: true,
      data: fondos,
      resumen: {
        total_ingresos: totalIngresos,
        total_egresos_efectivo: totalEgresosEfectivo,
        saldo_liquido: saldoLiquido,
        primer_mes_que_cubre: primerMesQueCubre,
        fecha_inicio_ciclo: fechaInicioCiclo
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
    const supabase = await createClient();
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No autenticado");

    const body = await request.json();
    const { fecha_pago, mes_que_cubre, tipo, monto, descripcion } = body;

    const { data, error } = await supabase.from('fondos')
      .insert([{ fecha_pago, mes_que_cubre, tipo, monto, descripcion, usuario_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

    const { data, error } = await supabase.from('fondos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
    const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

    const { data, error } = await supabase.from('fondos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

    const { error } = await supabase.from('fondos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}