import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Obtener todos los datos
    const [
      { data: gastos },
      { data: gastosFijos },
      { data: provisiones },
      { data: categorias },
      { data: fondos },
      { data: periodos }
    ] = await Promise.all([
      supabase.from('gastos').select('*').order('fecha', { ascending: false }),
      supabase.from('gastos_fijos').select('*'),
      supabase.from('provisiones').select('*'),
      supabase.from('categorias').select('*'),
      supabase.from('fondos').select('*'),
      supabase.from('periodos').select('*')
    ]);

    const backup = {
      fecha_backup: new Date().toISOString(),
      version: '1.0',
      datos: {
        gastos: gastos || [],
        gastos_fijos: gastosFijos || [],
        provisiones: provisiones || [],
        categorias: categorias || [],
        fondos: fondos || [],
        periodos: periodos || []
      },
      estadisticas: {
        total_gastos: gastos?.length || 0,
        total_gastos_fijos: gastosFijos?.length || 0,
        total_provisiones: provisiones?.length || 0,
        total_categorias: categorias?.length || 0
      }
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error: any) {
    console.error('Error en backup:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
