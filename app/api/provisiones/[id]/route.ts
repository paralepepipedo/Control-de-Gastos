import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Preparar el objeto de actualización
    const updateData: any = { ...body };

    // Si se marca como pagada, agregar fecha_pago
    if (body.estado === 'pagada' && !body.fecha_pago) {
      updateData.fecha_pago = new Date().toISOString().split('T')[0];
    }

    // Remover campos undefined o null que puedan causar problemas
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    const { data, error } = await supabase
      .from('provisiones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error en PATCH provision:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;  // ← AWAIT aquí!

    // FIX: Validar ID después de await
    if (!resolvedParams.id || resolvedParams.id === 'undefined') {
      return NextResponse.json(
        { error: 'ID de provisión requerido' },
        { status: 400 }
      );
    }

    const provisionId = parseInt(resolvedParams.id);
    if (isNaN(provisionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('provisiones')
      .delete()
      .eq('id', provisionId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE provision:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


