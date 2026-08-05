import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { calcularPeriodoProvisional } from '@/lib/utils';

export async function GET(request: Request) {
    const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    if (mes && anio) {
      const { data, error } = await supabase.from('periodos')
        .select('*')
        .eq('mes', parseInt(mes))
        .eq('anio', parseInt(anio))
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        const provisional = calcularPeriodoProvisional(new Date(parseInt(anio), parseInt(mes) - 1, 15));
        return NextResponse.json({
          success: true,
          data: { ...provisional, es_provisional: true, id: null }
        });
      }
      return NextResponse.json({ success: true, data });
    } else {
      const hoy = new Date();
      const periodoProvisional = calcularPeriodoProvisional(hoy);

      const { data, error } = await supabase.from('periodos')
        .select('*')
        .eq('mes', periodoProvisional.mes)
        .eq('anio', periodoProvisional.anio)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        const { data: nuevoPeriodo, error: errorInsert } = await supabase.from('periodos')
          .insert({
            mes: periodoProvisional.mes,
            anio: periodoProvisional.anio,
            fecha_inicio: periodoProvisional.fecha_inicio,
            fecha_fin: periodoProvisional.fecha_fin,
            es_provisional: true
          })
          .select().single();

        if (errorInsert) throw errorInsert;
        return NextResponse.json({ success: true, data: nuevoPeriodo });
      }
      return NextResponse.json({ success: true, data });
    }
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

    const { data, error } = await supabase.from('periodos')
      .upsert({
        mes: body.mes,
        anio: body.anio,
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin,
        es_provisional: body.es_provisional ?? false,
        fecha_factura: body.fecha_factura || null,
        notas: body.notas || null,
        usuario_id: user.id
      }, {
        onConflict: 'mes,anio'
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}