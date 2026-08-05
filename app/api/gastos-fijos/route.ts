import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// LISTAR gastos fijos
export async function GET() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from('gastos_fijos')
      .select(`
        *,
        categorias (
          id,
          nombre,
          icono
        )
      `)
      .order('dia_vencimiento', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Error en GET gastos_fijos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREAR gasto fijo
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    // 1. Validar identidad
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No autenticado");

    const body = await request.json();

    const { nombre, dia_vencimiento, monto_provision, categoria_id, metodo_pago, tipo } = body;

    if (!nombre || !dia_vencimiento || !monto_provision || !metodo_pago) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos obligatorios'
      }, { status: 400 });
    }

    const { data, error } = await supabase.from('gastos_fijos')
      .insert([{
        nombre,
        dia_vencimiento,
        monto_provision,
        categoria_id: categoria_id || null,
        metodo_pago,
        tipo: tipo || 'fijo',
        activo: true,
        usuario_id: user.id // <-- INYECCIÓN DE USUARIO
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error en POST gastos_fijos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ACTUALIZAR gasto fijo
export async function PUT(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID requerido'
      }, { status: 400 });
    }

    const { data, error } = await supabase.from('gastos_fijos')
      .update({
        ...fields,
        categoria_id: fields.categoria_id || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error en PUT gastos_fijos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ELIMINAR / DESACTIVAR gasto fijo (opcional; aquí lo desactivamos)
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

    const { error } = await supabase.from('gastos_fijos')
      .update({ activo: false })
      .eq('id', Number(id));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE gastos_fijos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

