import { addMonths, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ProyeccionMensual, GastoFijoProyectado, FondoProyectado } from '@/types';

interface DatosBase {
  gastos_fijos: any[];
  fondos: any[];
  gastos_variables_historicos: any[];
}

export function proyectarFinanzas(
  fechaInicio: Date,
  mesesProyeccion: number,
  datos: DatosBase
): ProyeccionMensual[] {
  const proyeccion: ProyeccionMensual[] = [];
  
  // Calcular promedio de gastos variables de últimos 3 meses
  const promedioGastosVariables = calcularPromedioGastosVariables(datos.gastos_variables_historicos);

  for (let i = 0; i < mesesProyeccion; i++) {
    const mes = addMonths(startOfMonth(fechaInicio), i);
    const mesNumero = mes.getMonth() + 1;
    const anio = mes.getFullYear();

    // 1. Calcular ingresos del mes (fondos que cubren ese mes)
    const ingresos = calcularIngresosMes(mes, datos.fondos);

    // 2. Calcular gastos fijos activos
    const gastosFijos = calcularGastosFijosMes(datos.gastos_fijos);

    // 3. Usar promedio de gastos variables
    const gastosVariables = promedioGastosVariables;

    // 4. Total gastos
    const totalGastos = gastosFijos + gastosVariables;

    // 5. Calcular saldo
    const saldo = ingresos - totalGastos;
    const solvencia = ingresos > 0 ? (saldo / ingresos) * 100 : 0;

    // 6. Determinar estado
    let estado: 'superavit' | 'equilibrio' | 'deficit';
    if (saldo > ingresos * 0.1) estado = 'superavit';
    else if (saldo >= 0) estado = 'equilibrio';
    else estado = 'deficit';

    proyeccion.push({
      mes,
      mes_nombre: format(mes, 'MMM yyyy', { locale: es }),
      ingresos,
      gastos_fijos: gastosFijos,
      provisiones: gastosFijos, // Las provisiones son los gastos fijos provisionados
      gastos_variables_promedio: gastosVariables,
      total_gastos: totalGastos,
      saldo,
      solvencia_porcentaje: solvencia,
      estado,
    });
  }

  return proyeccion;
}

function calcularIngresosMes(mes: Date, fondos: any[]): number {
  const mesNumero = mes.getMonth() + 1;
  const anio = mes.getFullYear();

  return fondos
    .filter((fondo) => {
      const fechaCubre = new Date(fondo.mes_que_cubre);
      return (
        fechaCubre.getMonth() + 1 === mesNumero &&
        fechaCubre.getFullYear() === anio
      );
    })
    .reduce((sum, fondo) => sum + Number(fondo.monto), 0);
}

function calcularGastosFijosMes(gastosFijos: any[]): number {
  return gastosFijos
    .filter((gasto) => gasto.activo)
    .reduce((sum, gasto) => sum + Number(gasto.monto_provision), 0);
}

function calcularPromedioGastosVariables(gastosHistoricos: any[]): number {
  if (gastosHistoricos.length === 0) return 0;

  const total = gastosHistoricos.reduce((sum, gasto) => sum + Number(gasto.monto), 0);
  return total / 3; // Promedio de últimos 3 meses
}

export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(monto);
}

export function obtenerColorSolvencia(estado: 'superavit' | 'equilibrio' | 'deficit'): string {
  switch (estado) {
    case 'superavit':
      return 'bg-green-100 text-green-800';
    case 'equilibrio':
      return 'bg-yellow-100 text-yellow-800';
    case 'deficit':
      return 'bg-red-100 text-red-800';
  }
}
