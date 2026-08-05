import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const fecha_inicio = searchParams.get('fecha_inicio');
    const fecha_fin = searchParams.get('fecha_fin');

    let query = supabase
      .from('gastos')
      .select(`
        *,
        categorias (
          id,
          nombre,
          icono,
          color
        )
      `)
      .order('fecha', { ascending: false });

    // Filtrar por rango de fechas si se proporciona
    if (fecha_inicio && fecha_fin) {
      query = query
        .gte('fecha', fecha_inicio)
        .lte('fecha', fecha_fin);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error Supabase:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error: any) {
    console.error('💥 Error catch:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    // 1. Validar identidad
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No autenticado");

    const body = await request.json();

    // Si es un gasto con cuotas
    if (body.cuotas && body.cuotas > 1) {
      const cuotasTotales = body.cuotas;
      const montoCuota = body.monto / cuotasTotales;
      const gastoCuotaId = crypto.randomUUID();

      const fechaBase = new Date(body.fecha);
      const cuotasInsert = [];

      for (let i = 1; i <= cuotasTotales; i++) {
        const fechaCuota = new Date(fechaBase);
        fechaCuota.setMonth(fechaCuota.getMonth() + (i - 1));

        cuotasInsert.push({
          fecha: fechaCuota.toISOString().split('T')[0],
          descripcion: `${body.descripcion} (${i}/${cuotasTotales})`,
          monto: Math.round(montoCuota),
          categoria_id: body.categoria_id || null,
          metodo_pago: body.metodo_pago || 'efectivo',
          pagado: i === 1 ? (body.pagado || false) : false,
          es_cuota: true,
          cuota_numero: i,
          cuotas_totales: cuotasTotales,
          gasto_cuota_id: gastoCuotaId,
          usuario_id: user.id // <-- DINÁMICO Y SEGURO
        });
      }

      const { data, error } = await supabase
        .from('gastos')
        .insert(cuotasInsert)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data,
        message: `${cuotasTotales} cuotas creadas`
      });
    }

    // Gasto normal (sin cuotas)
    const { data, error } = await supabase
      .from('gastos')
      .insert([{
        fecha: body.fecha,
        descripcion: body.descripcion,
        monto: body.monto,
        categoria_id: body.categoria_id || null,
        metodo_pago: body.metodo_pago || 'efectivo',
        pagado: body.pagado || false,
        es_cuota: false,
        usuario_id: user.id // <-- DINÁMICO Y SEGURO
      }])
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data[0]
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    const { data, error } = await supabase
      .from('gastos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data[0]
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    const { data, error } = await supabase
      .from('gastos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data[0]
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID no proporcionado'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
