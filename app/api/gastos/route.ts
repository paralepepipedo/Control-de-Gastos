import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha_inicio = searchParams.get('fecha_inicio');
    const fecha_fin = searchParams.get('fecha_fin');

    console.log('📅 Parámetros:', { fecha_inicio, fecha_fin });

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

    console.log('✅ Gastos cargados:', data?.length || 0);

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
  try {
    const body = await request.json();
    
    // Si es un gasto con cuotas
    if (body.cuotas && body.cuotas > 1) {
      const cuotasTotales = body.cuotas;
      const montoCuota = body.monto / cuotasTotales;
      const gastoCuotaId = crypto.randomUUID(); // ID único para agrupar todas las cuotas

      const fechaBase = new Date(body.fecha);
      const cuotasInsert = [];

      for (let i = 1; i <= cuotasTotales; i++) {
        // Calcular fecha para cada cuota (mismo día del mes, pero en el período siguiente)
        const fechaCuota = new Date(fechaBase);
        fechaCuota.setMonth(fechaCuota.getMonth() + (i - 1));

        cuotasInsert.push({
          fecha: fechaCuota.toISOString().split('T')[0],
          descripcion: `${body.descripcion} (${i}/${cuotasTotales})`,
          monto: Math.round(montoCuota),
          categoria_id: body.categoria_id || null,
          metodo_pago: body.metodo_pago || 'efectivo',
          pagado: i === 1 ? (body.pagado || false) : false, // Solo primera cuota puede venir pagada
          es_cuota: true,
          cuota_numero: i,
          cuotas_totales: cuotasTotales,
          gasto_cuota_id: gastoCuotaId
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
        es_cuota: false
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
