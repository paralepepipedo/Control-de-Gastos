import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mes, anio, modo } = body; // modo: 'nuevo' | 'regenerar'

    if (!mes || !anio) {
      return NextResponse.json({ success: false, error: 'Mes y año son requeridos' }, { status: 400 });
    }

    // 1. Verificar si ya existen provisiones para ese mes/año
    const { data: provisionesExistentes, error: errorExistentes } = await supabase
      .from('provisiones')
      .select('id, gasto_fijo_id')
      .eq('mes', mes)
      .eq('anio', anio);

    if (errorExistentes) throw errorExistentes;

    const yaExisten = (provisionesExistentes && provisionesExistentes.length > 0);

    // Si ya existen y no viene modo, el frontend debe preguntar
    if (yaExisten && !modo) {
      return NextResponse.json({
        success: false,
        requiereConfirmacion: true,
        error: 'Ya existen provisiones para este mes'
      }, { status: 400 });
    }

    // 2. Obtener gastos fijos activos
    const { data: gastosFijos, error: errorFijos } = await supabase
      .from('gastos_fijos')
      .select('*')
      .eq('activo', true);

    if (errorFijos) throw errorFijos;
    if (!gastosFijos || gastosFijos.length === 0) {
      return NextResponse.json({ success: false, error: 'No hay gastos fijos activos para generar' }, { status: 400 });
    }

    // 3. Si modo = 'regenerar', borramos provisiones del mes/año
    if (yaExisten && modo === 'regenerar') {
      const { error: errorDeleteProv } = await supabase
        .from('provisiones')
        .delete()
        .eq('mes', mes)
        .eq('anio', anio);

      if (errorDeleteProv) throw errorDeleteProv;
    }

    // 4. Si modo = 'nuevo', construimos un set de gasto_fijo_id que YA tienen provisión este mes
    const gastoFijoIdsConProvision = new Set<number>();
    if (yaExisten && modo === 'nuevo') {
      for (const p of provisionesExistentes || []) {
        if (p.gasto_fijo_id != null) {
          gastoFijoIdsConProvision.add(p.gasto_fijo_id);
        }
      }
    }

    // 5. Obtener gastos existentes del período para no duplicar GASTOS
    const inicioMes = `${anio}-${mes.toString().padStart(2, '0')}-01`;
    const finMesDate = new Date(anio, mes, 0);
    const finMes = `${anio}-${mes.toString().padStart(2, '0')}-${finMesDate.getDate().toString().padStart(2, '0')}`;

    const { data: gastosExistentes, error: errorGastosExistentes } = await supabase
      .from('gastos')
      .select('id, descripcion, fecha');

    if (errorGastosExistentes) throw errorGastosExistentes;

    const gastosExistentesSet = new Set(
      (gastosExistentes || [])
        .filter(g => g.fecha >= inicioMes && g.fecha <= finMes)
        .map(g => `${g.descripcion}__${g.fecha}`)
    );

    const provisionesInsert: any[] = [];
    const gastosInsert: any[] = [];

    for (const gf of gastosFijos) {
      // Si estamos en modo "nuevo" y este gasto fijo YA tiene provisión para el mes, saltamos
      if (modo === 'nuevo' && gastoFijoIdsConProvision.has(gf.id)) {
        continue;
      }

      const ultimoDiaMes = new Date(anio, mes, 0).getDate();
      const dia = Math.min(gf.dia_vencimiento, ultimoDiaMes);
      const fechaVencimiento = `${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

      provisionesInsert.push({
        mes,
        anio,
        gasto_fijo_id: gf.id,
        monto_provision: gf.monto_provision,
        fecha_vencimiento: fechaVencimiento,
        estado: 'pendiente'
      });

      // Para gastos: solo insertar si NO existe ya un gasto con misma descripcion + fecha en el mes
      const claveGasto = `${gf.nombre}__${fechaVencimiento}`;
      if (!gastosExistentesSet.has(claveGasto)) {
        gastosInsert.push({
          descripcion: gf.nombre,
          monto: gf.monto_provision,
          fecha: fechaVencimiento,
          categoria_id: gf.categoria_id,
          metodo_pago: gf.metodo_pago,
          pagado: false
        });
      }
    }

    // 6. Insertar provisiones nuevas (si hay)
    if (provisionesInsert.length > 0) {
      const { error: errorProv } = await supabase.from('provisiones').insert(provisionesInsert);
      if (errorProv) throw errorProv;
    }

    // 7. Insertar gastos faltantes (si hay)
    if (gastosInsert.length > 0) {
      const { error: errorGastos } = await supabase.from('gastos').insert(gastosInsert);
      if (errorGastos) throw errorGastos;
    }

    return NextResponse.json({
      success: true,
      message: 'Generado correctamente',
      generadas: provisionesInsert.length,
      gastosCreados: gastosInsert.length,
      yaExisten,
      modo: modo || 'nuevo'
    });

  } catch (error: any) {
    console.error('Error generando:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}
