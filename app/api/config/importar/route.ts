import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const datos = await request.json();
    
    let gastosImportados = 0;
    let gastosFijosImportados = 0;
    let categoriasCreadas = 0;
    const errores: string[] = [];

    // 1. Importar categorías únicas desde gastos_reales
    const categoriasUnicas = new Set<string>();
    if (datos.gastos_reales && Array.isArray(datos.gastos_reales)) {
      datos.gastos_reales.forEach((gasto: any) => {
        if (gasto.categoria) {
          categoriasUnicas.add(gasto.categoria.toLowerCase());
        }
      });
    }

    // Crear categorías que no existen
    for (const nombreCat of categoriasUnicas) {
      const { data: existe } = await supabase
        .from('categorias')
        .select('id')
        .ilike('nombre', nombreCat)
        .single();

      if (!existe) {
        const { error } = await supabase
          .from('categorias')
          .insert({
            nombre: nombreCat.charAt(0).toUpperCase() + nombreCat.slice(1),
            icono: '📦',
            tipo: 'gasto'
          });

        if (!error) categoriasCreadas++;
      }
    }

    // 2. Importar gastos_fijos
    if (datos.gastos_fijos && Array.isArray(datos.gastos_fijos)) {
      for (const gf of datos.gastos_fijos) {
        try {
          const { data: existe } = await supabase
            .from('gastos_fijos')
            .select('id')
            .ilike('nombre', gf.nombre)
            .single();

          if (!existe) {
            const { error } = await supabase
              .from('gastos_fijos')
              .insert({
                nombre: gf.nombre,
                descripcion: gf.descripcion || '',
                monto_provision: gf.monto_promedio || gf.monto_provision || 0,
                dia_vencimiento: 15,
                metodo_pago: gf.metodo_pago || 'efectivo',
                activo: true
              });

            if (!error) gastosFijosImportados++;
            else errores.push(`Gasto fijo ${gf.nombre}: ${error.message}`);
          }
        } catch (e: any) {
          errores.push(`Gasto fijo ${gf.nombre}: ${e.message}`);
        }
      }
    }

    // 3. Importar gastos_reales
    if (datos.gastos_reales && Array.isArray(datos.gastos_reales)) {
      // Obtener mapa de categorías
      const { data: categorias } = await supabase
        .from('categorias')
        .select('id, nombre');

      const mapaCategorias = new Map(
        categorias?.map(cat => [cat.nombre.toLowerCase(), cat.id]) || []
      );

      for (const gasto of datos.gastos_reales) {
        try {
          // Validar fecha
          const fecha = new Date(gasto.fecha);
          if (isNaN(fecha.getTime())) {
            errores.push(`Fecha inválida: ${gasto.fecha}`);
            continue;
          }

          // Verificar duplicado
          const { data: existe } = await supabase
            .from('gastos')
            .select('id')
            .eq('fecha', gasto.fecha)
            .eq('descripcion', gasto.detalle || gasto.descripcion || 'Sin detalle')
            .eq('monto', Math.abs(gasto.monto))
            .single();

          if (!existe && gasto.monto > 0) {
            const categoriaId = mapaCategorias.get(gasto.categoria?.toLowerCase()) || null;

            const { error } = await supabase
              .from('gastos')
              .insert({
                fecha: gasto.fecha,
                descripcion: gasto.detalle || gasto.descripcion || 'Sin detalle',
                monto: Math.abs(gasto.monto),
                categoria_id: categoriaId,
                metodo_pago: gasto.metodo_pago || 'tarjeta',
                pagado: true
              });

            if (!error) gastosImportados++;
            else errores.push(`Gasto ${gasto.fecha}: ${error.message}`);
          }
        } catch (e: any) {
          errores.push(`Gasto ${gasto.fecha}: ${e.message}`);
        }
      }
    }

    const resumen = `✅ Categorías creadas: ${categoriasCreadas}
✅ Gastos fijos importados: ${gastosFijosImportados}
✅ Gastos importados: ${gastosImportados}
${errores.length > 0 ? `\n⚠️ Errores: ${errores.length} (ver consola)` : ''}`;

    if (errores.length > 0) {
      console.log('Errores de importación:', errores);
    }

    return NextResponse.json({ 
      success: true, 
      resumen,
      detalles: {
        categoriasCreadas,
        gastosFijosImportados,
        gastosImportados,
        errores: errores.slice(0, 10)
      }
    });

  } catch (error: any) {
    console.error('Error en importación:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
