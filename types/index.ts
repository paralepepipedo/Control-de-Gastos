export interface Gasto {
  id: number;
  fecha: string;
  monto: number;
  categoria_id: number;
  subcategoria_id?: number;
  metodo_pago: 'efectivo' | 'tarjeta';
  descripcion?: string;
  estado: 'pagado' | 'pendiente';
  fecha_vencimiento?: string;
  es_recurrente: boolean;
  created_at: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  tipo: 'efectivo' | 'tarjeta';
  es_fijo: boolean;
  icono?: string;
  color?: string;
}

export interface Subcategoria {
  id: number;
  categoria_id: number;
  nombre: string;
}

export interface GastoFijo {
  id: number;
  nombre: string;
  categoria_id: number;
  monto_provision: number;
  metodo_pago: 'efectivo' | 'tarjeta';
  activo: boolean;
}

export interface ProvisionMensual {
  id: number;
  mes: string;
  gasto_fijo_id: number;
  monto: number;
}

export interface ServicioRecurrente {
  id: number;
  nombre: string;
  categoria_id: number;
  monto_aprox: number;
  activo: boolean;
}

export interface Fondo {
  id: number;
  fecha_pago: string;
  mes_que_cubre: string;
  tipo: 'sueldo' | 'ingreso_extra';
  monto: number;
  descripcion?: string;
  created_at: string;
}

export interface TarjetaCreditoItau {
  id: number;
  mes: string;
  fecha_inicio_estimada: string;
  fecha_fin_estimada: string;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  fecha_factura?: string;
  fecha_vencimiento?: string;
  monto_minimo?: number;
  total_gastado: number;
  monto_resto?: number;
  fecha_pago_minimo?: string;
  minimo_pagado: boolean;
  fecha_pago_resto: string;
  resto_pagado: boolean;
  factura_registrada: boolean;
  created_at: string;
}

export interface SaldoActual {
  id: number;
  fecha_actualizacion: string;
  monto: number;
}

export interface ResumenMensual {
  mes: string;
  total_gastado: number;
  total_provision: number;
  saldo: number;
  gastos_efectivo: number;
  gastos_tarjeta: number;
  pagos_pendientes: number;
}
// ============================================
// TIPOS PARA MÓDULO DE ESTADÍSTICAS
// ============================================

export interface ProyeccionMensual {
  mes: Date;
  mes_nombre: string;
  ingresos: number;
  gastos_fijos: number;
  provisiones: number;
  gastos_variables_promedio: number;
  total_gastos: number;
  saldo: number;
  solvencia_porcentaje: number;
  estado: 'superavit' | 'equilibrio' | 'deficit';
}

export interface GastoFijoProyectado {
  id: number;
  nombre: string;
  monto_provision: number;
  dia_vencimiento: number;
  categoria_nombre?: string;
  activo: boolean;
  editable: boolean;
}

export interface FondoProyectado {
  id: number;
  tipo: string;
  monto: number;
  mes_que_cubre: Date;
  descripcion?: string;
  editable: boolean;
}

export interface ConfigEstadisticas {
  opcion_uno_visible: boolean;
  opcion_dos_visible: boolean;
  opcion_tres_visible: boolean;
  meses_proyeccion: number;
  incluir_gastos_variables: boolean;
  promedio_gastos_variables_meses: number;
}

export interface CeldaEditable {
  fila: number;
  columna: number;
  tipo: 'gasto_fijo' | 'fondo' | 'provision';
  id: number;
  valor_original: number;
  valor_nuevo: number;
  mes: Date;
}

export interface DatosProyeccion {
  proyeccion: ProyeccionMensual[];
  gastos_fijos: GastoFijoProyectado[];
  fondos: FondoProyectado[];
  inicio: Date;
  fin: Date;
  config: ConfigEstadisticas;
}
// ============================================
// TIPOS PARA MÓDULO DE ESTADÍSTICAS
// ============================================

export interface ProyeccionMensual {
  mes: Date;
  mes_nombre: string;
  ingresos: number;
  gastos_fijos: number;
  provisiones: number;
  gastos_variables_promedio: number;
  total_gastos: number;
  saldo: number;
  solvencia_porcentaje: number;
  estado: 'superavit' | 'equilibrio' | 'deficit';
}

export interface GastoFijoProyectado {
  id: number;
  nombre: string;
  monto_provision: number;
  dia_vencimiento: number;
  categoria_nombre?: string;
  activo: boolean;
  editable: boolean;
}

export interface FondoProyectado {
  id: number;
  tipo: string;
  monto: number;
  mes_que_cubre: Date;
  descripcion?: string;
  editable: boolean;
}

export interface ConfigEstadisticas {
  opcion_uno_visible: boolean;
  opcion_dos_visible: boolean;
  opcion_tres_visible: boolean;
  meses_proyeccion: number;
  incluir_gastos_variables: boolean;
  promedio_gastos_variables_meses: number;
}

export interface CeldaEditable {
  fila: number;
  columna: number;
  tipo: 'gasto_fijo' | 'fondo' | 'provision';
  id: number;
  valor_original: number;
  valor_nuevo: number;
  mes: Date;
}

export interface DatosProyeccion {
  proyeccion: ProyeccionMensual[];
  gastos_fijos: GastoFijoProyectado[];
  fondos: FondoProyectado[];
  inicio: Date;
  fin: Date;
  config: ConfigEstadisticas;
}
// ============================================
// TIPOS PARA MÓDULO DE ESTADÍSTICAS
// ============================================

export interface ProyeccionMensual {
  mes: Date;
  mes_nombre: string;
  ingresos: number;
  gastos_fijos: number;
  provisiones: number;
  gastos_variables_promedio: number;
  total_gastos: number;
  saldo: number;
  solvencia_porcentaje: number;
  estado: 'superavit' | 'equilibrio' | 'deficit';
}

export interface GastoFijoProyectado {
  id: number;
  nombre: string;
  monto_provision: number;
  dia_vencimiento: number;
  categoria_nombre?: string;
  activo: boolean;
  editable: boolean;
}

export interface FondoProyectado {
  id: number;
  tipo: string;
  monto: number;
  mes_que_cubre: Date;
  descripcion?: string;
  editable: boolean;
}

export interface ConfigEstadisticas {
  opcion_uno_visible: boolean;
  opcion_dos_visible: boolean;
  opcion_tres_visible: boolean;
  meses_proyeccion: number;
  incluir_gastos_variables: boolean;
  promedio_gastos_variables_meses: number;
}

export interface CeldaEditable {
  fila: number;
  columna: number;
  tipo: 'gasto_fijo' | 'fondo' | 'provision';
  id: number;
  valor_original: number;
  valor_nuevo: number;
  mes: Date;
}

export interface DatosProyeccion {
  proyeccion: ProyeccionMensual[];
  gastos_fijos: GastoFijoProyectado[];
  fondos: FondoProyectado[];
  inicio: Date;
  fin: Date;
  config: ConfigEstadisticas;
}
