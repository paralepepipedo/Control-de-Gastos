/**
 * Obtiene el período al que pertenece una fecha específica
 * Busca en la BD o calcula provisional
 */
export async function obtenerPeriodoDeFecha(fecha: string | Date): Promise<{
  mes: number;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  es_provisional: boolean;
}> {
  const fechaDate = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  // Calcular período provisional para esta fecha
  const provisional = calcularPeriodoProvisional(fechaDate);
  
  return {
    mes: provisional.mes,
    anio: provisional.anio,
    fecha_inicio: provisional.fecha_inicio,
    fecha_fin: provisional.fecha_fin,
    es_provisional: true
  };
}
/**
 * Formatea el nombre del período (ej: "Enero 2026")
 */
export function formatNombrePeriodo(mes: number, anio: number): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${meses[mes - 1]} ${anio}`;
}

/**
 * Formatea el rango de fechas de un período
 */
export function formatRangoPeriodo(fechaInicio: string, fechaFin: string): string {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  const formatFecha = (date: Date) => {
    return date.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };
  
  return `${formatFecha(inicio)} - ${formatFecha(fin)}`;
}

/**
 * Formatea moneda chilena
 */
export function formatCurrency(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(monto);
}
/**
 * Calcula el período provisional para una fecha dada
 * Regla: del 26 del mes anterior al 25 del mes actual
 */
export function calcularPeriodoProvisional(fecha: Date): {
  mes: number;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
} {
  const dia = fecha.getDate();
  let mes = fecha.getMonth() + 1; // getMonth() es 0-indexed
  let anio = fecha.getFullYear();

  // Si estamos antes del día 26, el período corresponde al mes anterior
  if (dia < 26) {
    mes = mes - 1;
    if (mes === 0) {
      mes = 12;
      anio = anio - 1;
    }
  }

  // Calcular fecha_inicio (día 26 del mes anterior)
  let mesInicio = mes - 1;
  let anioInicio = anio;
  if (mesInicio === 0) {
    mesInicio = 12;
    anioInicio = anioInicio - 1;
  }

  const fechaInicio = `${anioInicio}-${String(mesInicio).padStart(2, '0')}-26`;
  const fechaFin = `${anio}-${String(mes).padStart(2, '0')}-25`;

  return {
    mes,
    anio,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin
  };
}
// SOLUCIÓN FECHAS: Tratamos la fecha como string local, sin pasar por UTC
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  }
  return new Date(dateString).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}




