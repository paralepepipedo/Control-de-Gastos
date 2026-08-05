import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    const supabase = await createClient();
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No autenticado");

    const datos = await request.json();
    let gastosImportados = 0;
    let gastosFijosImportados = 0;
    let categoriasCreadas = 0;
    const errores: string[] = [];

    const categoriasUnicas = new Set<string>();
    if (datos.gastos_reales && Array.isArray(datos.gastos_reales)) {
      datos.gastos_reales.forEach((gasto: any) => {
        if (gasto.categoria) {
          categoriasUnicas.add(gasto.categoria.toLowerCase());
        }
      });
    }

    for (const nombreCat of categoriasUnicas) {
      const { data: existe } = await supabase.from('categorias')
        .select('id')
        .ilike('nombre', nombreCat)
        .single();

      if (!existe) {
        const { error } = await supabase.from('categorias').insert({
          nombre: nombreCat.charAt(0).toUpperCase() + nombreCat.slice(1),
          icono: '📦',
          tipo: 'gasto',
          usuario_id: user.id
        });
        if (!error) categoriasCreadas++;
      }
    }

    if (datos.gastos_fijos && Array.isArray(datos.gastos_fijos)) {
      for (const gf of datos.gastos_fijos) {
        try {
          const { data: existe } = await supabase.from('gastos_fijos')
            .select('id')
            .ilike('nombre', gf.nombre)
            .single();

          if (!existe) {
            const { error } = await supabase.from('gastos_fijos').insert({
              nombre: gf.nombre,
              descripcion: gf.descripcion || '',
              monto_provision: gf.monto_promedio || gf.monto_provision || 0,
              dia_vencimiento: 15,
              metodo_pago: gf.metodo_pago || 'efectivo',
              activo: true,
              usuario_id: user.id
            });
            if (!error) gastosFijosImportados++;
            else errores.push(`Gasto fijo ${gf.nombre}: ${error.message}`);
          }
        } catch (e: any) { errores.push(`Gasto fijo ${gf.nombre}: ${e.message}`); }
      }
    }

    if (datos.gastos_reales && Array.isArray(datos.gastos_reales)) {
      const { data: categorias } = await supabase.from('categorias').select('id, nombre');
      const mapaCategorias = new Map(categorias?.map(cat => [cat.nombre.toLowerCase(), cat.id]) || []);

      for (const gasto of datos.gastos_reales) {
        try {
          const fecha = new Date(gasto.fecha);
          if (isNaN(fecha.getTime())) {
            errores.push(`Fecha inválida: ${gasto.fecha}`);
            continue;
          }

          const { data: existe } = await supabase.from('gastos')
            .select('id')
            .eq('fecha', gasto.fecha)
            .eq('descripcion', gasto.detalle || gasto.descripcion || 'Sin detalle')
            .eq('monto', Math.abs(gasto.monto))
            .single();

          if (!existe && gasto.monto > 0) {
            const categoriaId = mapaCategorias.get(gasto.categoria?.toLowerCase()) || null;
            const { error } = await supabase.from('gastos').insert({
              fecha: gasto.fecha,
              descripcion: gasto.detalle || gasto.descripcion || 'Sin detalle',
              monto: Math.abs(gasto.monto),
              categoria_id: categoriaId,
              metodo_pago: gasto.metodo_pago || 'tarjeta',
              pagado: true,
              usuario_id: user.id
            });
            if (!error) gastosImportados++;
            else errores.push(`Gasto ${gasto.fecha}: ${error.message}`);
          }
        } catch (e: any) { errores.push(`Gasto ${gasto.fecha}: ${e.message}`); }
      }
    }

    const resumen = `✅ Categorías creadas: ${categoriasCreadas}\n✅ Gastos fijos importados: ${gastosFijosImportados}\n✅ Gastos importados: ${gastosImportados}`;

    return NextResponse.json({
      success: true,
      resumen,
      detalles: { categoriasCreadas, gastosFijosImportados, gastosImportados, errores: errores.slice(0, 10) }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}