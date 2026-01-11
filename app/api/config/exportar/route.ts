import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'mes';

    let gastosData: any[] = [];

    if (tipo === 'mes') {
      // Obtener período actual
      const periodoResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/periodos`);
      const periodoResult = await periodoResponse.json();
      const periodo = periodoResult.data;

      const { data } = await supabase
        .from('gastos')
        .select(`
          id,
          fecha,
          descripcion,
          monto,
          metodo_pago,
          pagado,
          categorias(nombre, icono)
        `)
        .gte('fecha', periodo.fecha_inicio)
        .lte('fecha', periodo.fecha_fin)
        .order('fecha', { ascending: false });

      gastosData = data || [];
    } else {
      // Histórico completo
      const { data } = await supabase
        .from('gastos')
        .select(`
          id,
          fecha,
          descripcion,
          monto,
          metodo_pago,
          pagado,
          categorias(nombre, icono)
        `)
        .order('fecha', { ascending: false });

      gastosData = data || [];
    }

    // Formatear datos para Excel
    const datosExcel = gastosData.map(g => ({
      'Fecha': new Date(g.fecha).toLocaleDateString('es-CL'),
      'Descripción': g.descripcion,
      'Categoría': g.categorias?.nombre || 'Sin categoría',
      'Monto': g.monto,
      'Método Pago': g.metodo_pago,
      'Pagado': g.pagado ? 'Sí' : 'No'
    }));

    // Crear libro Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 40 },  // Descripción
      { wch: 20 },  // Categoría
      { wch: 12 },  // Monto
      { wch: 12 },  // Método Pago
      { wch: 8 }    // Pagado
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

    // Si es del mes, agregar hoja de resumen
    if (tipo === 'mes') {
      const resumen = gastosData.reduce((acc: any, g: any) => {
        const cat = g.categorias?.nombre || 'Sin categoría';
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += Number(g.monto);
        return acc;
      }, {});

      const datosResumen = Object.entries(resumen).map(([categoria, total]) => ({
        'Categoría': categoria,
        'Total': total
      }));

      const wsResumen = XLSX.utils.json_to_sheet(datosResumen);
      wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    }

    // Generar buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Retornar como blob
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="gastos_${tipo}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Error en exportación:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
