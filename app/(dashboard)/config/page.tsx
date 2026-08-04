"use client";

import { useEffect, useState } from "react";
import { formatNombrePeriodo, formatRangoPeriodo } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ConfigPage() {
  const [seccionActiva, setSeccionActiva] = useState<'periodos' | 'importar' | 'exportar' | 'backup' | 'sueldo' | 'fechas' | 'notificaciones' | 'proyeccion'>('periodos');


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">⚙️ Configuración</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex flex-wrap">
            <button
              onClick={() => setSeccionActiva('periodos')}
              className={`px-6 py-3 font-medium transition-colors ${seccionActiva === 'periodos'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              📅 Períodos
            </button>
            <button
              onClick={() => setSeccionActiva('sueldo')}
              className={`px-6 py-3 font-medium transition-colors ${seccionActiva === 'sueldo'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              💰 Sueldo Base
            </button>
            <button
              onClick={() => setSeccionActiva('fechas')}
              className={`px-6 py-3 font-medium transition-colors ${seccionActiva === 'fechas'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              📅 Fechas de Pago
            </button>
            <button
              onClick={() => setSeccionActiva('notificaciones')}
              className={`px-6 py-3 font-medium transition-colors ${seccionActiva === 'notificaciones'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              🔔 Notificaciones
            </button>

            <button
              onClick={() => setSeccionActiva('proyeccion')}
              className={`px-6 py-3 font-medium transition-colors ${seccionActiva === 'proyeccion'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              📊 Proyección Base
            </button>


            <button
              onClick={() => setSeccionActiva('importar')}
              className={`px-6 py-3 font-medium transition-colors ${seccionActiva === 'importar'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              📥 Importar
            </button>
            <button
              onClick={() => setSeccionActiva('exportar')}
              className={`px-6 py-3 font-medium transition-colors ${seccionActiva === 'exportar'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              📤 Exportar
            </button>
            <button
              onClick={() => setSeccionActiva('backup')}
              className={`px-6 py-3 font-medium transition-colors ${seccionActiva === 'backup'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              💾 Respaldo
            </button>
          </div>
        </div>

        <div className="p-6">
          {seccionActiva === 'periodos' && <SeccionPeriodos />}
          {seccionActiva === 'sueldo' && <SeccionSueldoBase />}
          {seccionActiva === 'fechas' && <SeccionFechasPago />}
          {seccionActiva === 'importar' && <SeccionImportar />}
          {seccionActiva === 'exportar' && <SeccionExportar />}
          {seccionActiva === 'backup' && <SeccionBackup />}
          {seccionActiva === 'notificaciones' && <SeccionNotificaciones />}
          {seccionActiva === 'proyeccion' && <SeccionProyeccionBase />}


        </div>
      </div>
    </div>
  );
}

// ============ SECCIÓN PERÍODOS (ORIGINAL) ============
function SeccionPeriodos() {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalEditar, setModalEditar] = useState(false);
  const [periodoEditar, setPeriodoEditar] = useState<any>(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    cargarPeriodos();
  }, []);

  const cargarPeriodos = async () => {
    try {
      const response = await fetch('/api/periodos/listado');
      const result = await response.json();
      if (result.success) {
        setPeriodos(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  const crearPeriodoSiguiente = async () => {
    setGenerando(true);
    try {
      // Obtener el último periodo
      const ultimoPeriodo = periodos[0]; // El primero es el más reciente

      if (!ultimoPeriodo) {
        alert("No hay periodos registrados. Usa 'Generar Históricos' primero.");
        setGenerando(false);
        return;
      }

      // Calcular siguiente mes
      let siguienteMes = ultimoPeriodo.mes + 1;
      let siguienteAnio = ultimoPeriodo.anio;

      if (siguienteMes > 12) {
        siguienteMes = 1;
        siguienteAnio++;
      }

      // Calcular fechas (del 24 al 23 del siguiente mes)
      const fechaInicio = new Date(siguienteAnio, siguienteMes - 1, 24);
      const fechaFin = new Date(siguienteAnio, siguienteMes, 23);

      // Nombre del mes
      const nombreMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][siguienteMes - 1];

      // Mensaje de confirmación
      const mensaje = `¿Crear periodo de ${nombreMes} ${siguienteAnio}?\n\n` +
        `📅 Desde: ${fechaInicio.toLocaleDateString('es-CL')}\n` +
        `📅 Hasta: ${fechaFin.toLocaleDateString('es-CL')}\n\n` +
        `⚠️ Estas son fechas genéricas (24 al 23).\n` +
        `Podrás ajustarlas después con el botón "Editar".`;

      if (!confirm(mensaje)) {
        setGenerando(false);
        return;
      }

      const response = await fetch('/api/periodos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: siguienteMes,
          anio: siguienteAnio,
          fecha_inicio: fechaInicio.toISOString().split('T')[0],
          fecha_fin: fechaFin.toISOString().split('T')[0],
          es_provisional: false,
          fecha_factura: new Date().toISOString().split('T')[0],
          notas: 'Periodo creado automáticamente'
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Periodo ${nombreMes} ${siguienteAnio} creado correctamente`);
        cargarPeriodos();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setGenerando(false);
    }
  };


  const generarPeriodosHistoricos = async () => {
    if (!confirm('¿Generar períodos automáticamente para todos los meses con gastos registrados?')) {
      return;
    }

    setGenerando(true);

    try {
      const response = await fetch('/api/config/generar-periodos', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        alert(`${result.mensaje}\n\nTotal períodos: ${result.total}\nNuevos creados: ${result.creados}`);
        cargarPeriodos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error al generar períodos');
    } finally {
      setGenerando(false);
    }
  };

  const abrirModalEditar = (periodo: any) => {
    // Función que extrae el día exacto que estás viendo en la web (transforma UTC a local)
    const formatearAFechaLocal = (fechaString: string) => {
      if (!fechaString) return '';
      const date = new Date(fechaString);
      const anio = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const dia = String(date.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    };

    setPeriodoEditar({
      ...periodo,
      fecha_inicio: formatearAFechaLocal(periodo.fecha_inicio),
      fecha_fin: formatearAFechaLocal(periodo.fecha_fin)
    });
    setModalEditar(true);
  };

  const guardarPeriodo = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/periodos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: periodoEditar.mes,
          anio: periodoEditar.anio,
          fecha_inicio: periodoEditar.fecha_inicio,
          fecha_fin: periodoEditar.fecha_fin,
          es_provisional: false,
          fecha_factura: new Date().toISOString().split('T')[0],
          notas: periodoEditar.notas
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Período actualizado');
        setModalEditar(false);
        cargarPeriodos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error al guardar período');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando períodos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Gestión de Períodos de Facturación</h2>
          <p className="text-sm text-gray-600 mt-1">
            Ajusta las fechas reales según tu estado de cuenta de Itaú
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={crearPeriodoSiguiente} disabled={generando} size="sm">

            {generando ? "Creando..." : "➕ Crear Periodo Siguiente"}
          </Button>
          <Button onClick={generarPeriodosHistoricos} disabled={generando} size="sm" variant="outline">
            {generando ? "Generando..." : "🔄 Generar Históricos"}
          </Button>
        </div>
      </div>


      {periodos.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-800 font-medium">💡 No hay períodos registrados</p>
          <p className="text-xs text-blue-700 mt-1">
            Click en "Generar Períodos Históricos" para crear automáticamente los períodos según tus gastos registrados
          </p>
        </div>
      )}

      <div className="space-y-3">
        {periodos.map((periodo) => (
          <div
            key={`${periodo.mes}-${periodo.anio}`}
            className={`p-4 rounded-lg border-l-4 ${periodo.es_provisional
              ? 'border-orange-400 bg-orange-50'
              : 'border-green-500 bg-green-50'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">
                    {formatNombrePeriodo(periodo.mes, periodo.anio)}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${periodo.es_provisional
                      ? 'bg-orange-200 text-orange-800'
                      : 'bg-green-200 text-green-800'
                      }`}
                  >
                    {periodo.es_provisional ? '⚠️ Provisional' : '✅ Confirmado'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  📅 {formatRangoPeriodo(periodo.fecha_inicio, periodo.fecha_fin)}
                </p>
                {periodo.notas && (
                  <p className="text-xs text-gray-600 mt-1">📝 {periodo.notas}</p>
                )}
                {periodo.fecha_factura && (
                  <p className="text-xs text-gray-500 mt-1">
                    Ajustado el {new Date(periodo.fecha_factura).toLocaleDateString('es-CL')}
                  </p>
                )}
              </div>
              <Button
                onClick={() => abrirModalEditar(periodo)}
                variant="outline"
                size="sm"
              >
                ✏️ Editar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Editar */}
      {modalEditar && periodoEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              📅 Ajustar Período - {formatNombrePeriodo(periodoEditar.mes, periodoEditar.anio)}
            </h2>

            <form onSubmit={guardarPeriodo} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Ajusta con la factura real de Itaú</p>
                <p className="text-xs">Las fechas exactas están en tu estado de cuenta mensual</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Inicio *</label>
                <Input
                  type="date"
                  required
                  value={periodoEditar.fecha_inicio}
                  onChange={(e) => setPeriodoEditar({ ...periodoEditar, fecha_inicio: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Fin *</label>
                <Input
                  type="date"
                  required
                  value={periodoEditar.fecha_fin}
                  onChange={(e) => setPeriodoEditar({ ...periodoEditar, fecha_fin: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={periodoEditar.notas || ''}
                  onChange={(e) => setPeriodoEditar({ ...periodoEditar, notas: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ej: Ajustado según factura del 25/01/2026"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalEditar(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  💾 Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SECCIÓN SUELDO BASE (NUEVA) ============
function SeccionSueldoBase() {
  const [sueldoBase, setSueldoBase] = useState(1662183);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarSueldoBase();
  }, []);

  const cargarSueldoBase = async () => {
    try {
      const res = await fetch('/api/config?clave=sueldo_base_actual');
      const data = await res.json();
      if (data.success && data.data) {
        setSueldoBase(data.data.valor_numeric || 1662183);
      }
    } catch (error) {
      console.error('Error cargando sueldo base:', error);
    }
  };

  const guardarSueldoBase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave: 'sueldo_base_actual',
          valor_numeric: sueldoBase,
          descripcion: 'Sueldo base para meses futuros',
        }),
      });

      if (res.ok) {
        alert('✅ Sueldo base actualizado correctamente');
      } else {
        alert('❌ Error al guardar sueldo base');
      }
    } catch (error) {
      console.error('Error guardando sueldo base:', error);
      alert('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">💰 Gestión de Sueldo Base</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configura el sueldo base que se usará para proyecciones futuras
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800 font-medium">💡 ¿Cómo funciona?</p>
        <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li>Solo afecta meses futuros en las proyecciones</li>
          <li>Los meses pasados mantienen su valor histórico</li>
          <li>Puedes actualizar el valor cada vez que cambie tu sueldo</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Sueldo Base Mensual</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <input
              type="text"
              value={sueldoBase.toLocaleString('es-CL')}
              onChange={(e) => setSueldoBase(Number(e.target.value.replace(/\D/g, '')))}
              className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
              placeholder="1.662.183"
            />
          </div>
          <Button
            onClick={guardarSueldoBase}
            disabled={loading}
          >
            {loading ? '⏳ Guardando...' : '💾 Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ SECCIÓN FECHAS DE PAGO (NUEVA) ============
function SeccionFechasPago() {
  const [fechasPago, setFechasPago] = useState<any[]>([]);
  const [nuevaFecha, setNuevaFecha] = useState({ mes: 0, anio: 2026, fecha: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarFechasPago();
  }, []);

  const cargarFechasPago = async () => {
    try {
      const res = await fetch('/api/fechas-pago');
      const data = await res.json();
      if (data.success) {
        setFechasPago(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando fechas de pago:', error);
    }
  };

  const agregarFechaPago = async () => {
    if (!nuevaFecha.mes || !nuevaFecha.anio || !nuevaFecha.fecha) {
      alert('⚠️ Complete todos los campos');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/fechas-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: nuevaFecha.mes,
          anio: nuevaFecha.anio,
          fecha_pago: nuevaFecha.fecha,
          descripcion: `Pago ${getNombreMes(nuevaFecha.mes)} ${nuevaFecha.anio}`,
        }),
      });

      if (res.ok) {
        alert('✅ Fecha guardada correctamente');
        cargarFechasPago();
        setNuevaFecha({ mes: 0, anio: 2026, fecha: '' });
      } else {
        alert('❌ Error al guardar fecha');
      }
    } catch (error) {
      console.error('Error guardando fecha:', error);
      alert('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const eliminarFechaPago = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta fecha?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/fechas-pago?id=${id}`, { method: 'DELETE' });

      if (res.ok) {
        alert('✅ Fecha eliminada correctamente');
        cargarFechasPago();
      } else {
        alert('❌ Error al eliminar fecha');
      }
    } catch (error) {
      console.error('Error eliminando fecha:', error);
      alert('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const getNombreMes = (mes: number) => {
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes] || '';
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">📅 Fechas de Pago Mensuales</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configura las fechas en que recibes el pago de cada mes
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800 font-medium">💡 ¿Para qué sirve?</p>
        <p className="text-xs text-blue-700 mt-1">
          Se mostrará en la página de gastos cuántos días faltan para el próximo pago
        </p>
      </div>

      {/* Lista de fechas */}
      <div className="space-y-2">
        {fechasPago.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No hay fechas configuradas</p>
        ) : (
          fechasPago.map((fp: any) => (
            <div key={fp.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors border">
              <div>
                <span className="font-semibold text-gray-700">{getNombreMes(fp.mes)} {fp.anio}</span>
                <span className="text-gray-600 ml-2">→ {new Date(fp.fecha_pago + 'T00:00:00').toLocaleDateString('es-CL')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setNuevaFecha({
                    mes: fp.mes,
                    anio: fp.anio,
                    fecha: fp.fecha_pago,
                  })}
                  className="text-blue-600 hover:bg-blue-100 px-3 py-1 rounded transition-colors text-sm font-medium"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => eliminarFechaPago(fp.id)}
                  className="text-red-600 hover:bg-red-100 px-3 py-1 rounded transition-colors text-sm font-medium"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulario agregar/editar */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          {nuevaFecha.mes > 0 ? '✏️ Editar' : '➕ Agregar nueva'} fecha de pago:
        </p>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={nuevaFecha.mes}
            onChange={(e) => setNuevaFecha({ ...nuevaFecha, mes: Number(e.target.value) })}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value={0}>Seleccionar mes</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>{getNombreMes(m)}</option>
            ))}
          </select>
          <input
            type="number"
            value={nuevaFecha.anio}
            onChange={(e) => setNuevaFecha({ ...nuevaFecha, anio: Number(e.target.value) })}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="2026"
            min="2020"
            max="2030"
          />
          <input
            type="date"
            value={nuevaFecha.fecha}
            onChange={(e) => setNuevaFecha({ ...nuevaFecha, fecha: e.target.value })}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <Button
          onClick={agregarFechaPago}
          disabled={loading}
          className="mt-2 w-full"
        >
          {loading ? '⏳ Guardando...' : (nuevaFecha.mes > 0 ? '💾 Actualizar Fecha' : '✅ Agregar Fecha de Pago')}
        </Button>
      </div>
    </div>
  );
}

// ============ SECCIÓN IMPORTAR (ORIGINAL) ============
function SeccionImportar() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState('');

  const handleImportar = async () => {
    if (!archivo) {
      alert('Selecciona un archivo JSON');
      return;
    }

    setImportando(true);
    setProgreso('Leyendo archivo...');

    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto);

      setProgreso('Importando datos...');

      const response = await fetch('/api/config/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Importación exitosa!\n\n${result.resumen}`);
        setArchivo(null);
        setProgreso('');
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">📥 Importar Datos desde JSON</h2>
        <p className="text-sm text-gray-600 mt-1">
          Sube tu archivo de exportación histórica para importar gastos y gastos fijos
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-sm text-yellow-800 font-medium">⚠️ Advertencia</p>
        <ul className="text-xs text-yellow-700 mt-2 space-y-1 list-disc list-inside">
          <li>Los datos duplicados serán omitidos</li>
          <li>Las categorías se crearán automáticamente si no existen</li>
          <li>Este proceso puede tardar varios minutos</li>
        </ul>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept=".json"
          onChange={(e) => setArchivo(e.target.files?.[0] || null)}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className="text-6xl mb-2">📁</div>
          <p className="text-sm font-medium">
            {archivo ? archivo.name : 'Click para seleccionar archivo JSON'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Formato: datos_financieros_export.json
          </p>
        </label>
      </div>

      {progreso && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">{progreso}</p>
        </div>
      )}

      <Button
        onClick={handleImportar}
        disabled={!archivo || importando}
        className="w-full"
      >
        {importando ? '⏳ Importando...' : '📥 Iniciar Importación'}
      </Button>
    </div>
  );
}

// ============ SECCIÓN EXPORTAR (ORIGINAL) ============
function SeccionExportar() {
  const [exportando, setExportando] = useState(false);
  const [tipoExport, setTipoExport] = useState<'mes' | 'historico'>('mes');

  const handleExportar = async () => {
    setExportando(true);

    try {
      const response = await fetch(`/api/config/exportar?tipo=${tipoExport}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gastos_${tipoExport}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('✅ Exportación exitosa');
    } catch (error) {
      alert('❌ Error al exportar');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">📤 Exportar a Excel</h2>
        <p className="text-sm text-gray-600 mt-1">
          Descarga tus datos financieros en formato Excel
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setTipoExport('mes')}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${tipoExport === 'mes'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">📊</div>
            <div>
              <p className="font-semibold">Resumen del Mes Actual</p>
              <p className="text-xs text-gray-600">Gastos del período actual agrupados por categoría</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setTipoExport('historico')}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${tipoExport === 'historico'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">📚</div>
            <div>
              <p className="font-semibold">Histórico Completo</p>
              <p className="text-xs text-gray-600">Todos los gastos registrados desde el inicio</p>
            </div>
          </div>
        </button>
      </div>

      <Button
        onClick={handleExportar}
        disabled={exportando}
        className="w-full"
      >
        {exportando ? '⏳ Exportando...' : '📥 Descargar Excel'}
      </Button>
    </div>
  );
}

// ============ SECCIÓN BACKUP (ORIGINAL) ============
function SeccionBackup() {
  const [generando, setGenerando] = useState(false);

  const generarBackup = async () => {
    setGenerando(true);

    try {
      const response = await fetch('/api/config/backup');
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('✅ Backup generado exitosamente');
    } catch (error) {
      alert('❌ Error al generar backup');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">💾 Respaldo Completo</h2>
        <p className="text-sm text-gray-600 mt-1">
          Descarga una copia completa de todos tus datos
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800 font-medium">💡 ¿Qué incluye el backup?</p>
        <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li>Todos los gastos registrados</li>
          <li>Gastos fijos y provisiones</li>
          <li>Categorías y fondos</li>
          <li>Períodos de facturación</li>
        </ul>
      </div>

      <Button
        onClick={generarBackup}
        disabled={generando}
        className="w-full"
      >
        {generando ? '⏳ Generando...' : '💾 Generar Backup Completo'}
      </Button>

      <div className="bg-gray-50 border border-gray-200 rounded p-4">
        <p className="text-sm text-gray-700 font-medium">📋 Restaurar desde Backup</p>
        <p className="text-xs text-gray-600 mt-1">
          Próximamente: Podrás restaurar tus datos desde un archivo de backup
        </p>
      </div>
    </div>
  );
}
// ============ SECCIÓN PROYECCIÓN BASE (NUEVA) ============
function SeccionProyeccionBase() {
  const [configTabla1, setConfigTabla1] = useState<any>(null);
  const [configTabla2, setConfigTabla2] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    try {
      const res = await fetch('/api/proyeccion-base');
      const data = await res.json();
      if (data.success) {
        const tabla1 = data.data.find((t: any) => t.tabla === 1);
        const tabla2 = data.data.find((t: any) => t.tabla === 2);
        setConfigTabla1(tabla1 || { tabla: 1, saldo_inicial: 0, ingresos_mes: 0 });
        setConfigTabla2(tabla2 || { tabla: 2, saldo_inicial: 0, ingresos_mes: 0 });
      }
    } catch (error) {
      console.error('Error cargando proyección base:', error);
    }
  };

  const guardarTabla = async (tabla: number) => {
    setLoading(true);
    try {
      const config = tabla === 1 ? configTabla1 : configTabla2;
      const res = await fetch('/api/proyeccion-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabla,
          saldo_inicial: Number(config.saldo_inicial),
          ingresos_mes: Number(config.ingresos_mes)
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.mensaje);
        cargarConfig();
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error guardando:', error);
      alert('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!configTabla1 || !configTabla2) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">📊 Configuración de Proyección Base</h2>
        <p className="text-sm text-gray-600 mt-1">
          Define los valores iniciales para comenzar las proyecciones de cada tabla
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800 font-medium">💡 ¿Para qué sirve?</p>
        <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li>Tabla 1: Proyección de Gastos Fijos</li>
          <li>Tabla 2: Proyección de Gastos en Efectivo</li>
          <li>Estos valores son la base desde donde comienza cada proyección</li>
          <li>Los gastos se calculan automáticamente desde tus datos reales</li>
        </ul>
      </div>

      {/* TABLA 1 */}
      <div className="border-2 border-green-300 rounded-lg p-5 bg-green-50">
        <h3 className="text-lg font-bold text-green-900 mb-4">📊 Tabla 1: Gastos Fijos</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Saldo Inicial</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="text"
                value={configTabla1.saldo_inicial.toLocaleString('es-CL')}
                onChange={(e) => setConfigTabla1({
                  ...configTabla1,
                  saldo_inicial: Number(e.target.value.replace(/\./g, ''))
                })}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ingresos del Mes</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="text"
                value={configTabla1.ingresos_mes.toLocaleString('es-CL')}
                onChange={(e) => setConfigTabla1({
                  ...configTabla1,
                  ingresos_mes: Number(e.target.value.replace(/\./g, ''))
                })}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
              />
            </div>
          </div>

          <Button
            onClick={() => guardarTabla(1)}
            disabled={loading}
            className="w-full"
          >
            {loading ? '⏳ Guardando...' : '💾 Guardar Tabla 1'}
          </Button>
        </div>
      </div>

      {/* TABLA 2 */}
      <div className="border-2 border-purple-300 rounded-lg p-5 bg-purple-50">
        <h3 className="text-lg font-bold text-purple-900 mb-4">💰 Tabla 2: Gastos Efectivo</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Saldo Inicial</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="text"
                value={configTabla2.saldo_inicial.toLocaleString('es-CL')}
                onChange={(e) => setConfigTabla2({
                  ...configTabla2,
                  saldo_inicial: Number(e.target.value.replace(/\./g, ''))
                })}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ingresos del Mes</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="text"
                value={configTabla2.ingresos_mes.toLocaleString('es-CL')}
                onChange={(e) => setConfigTabla2({
                  ...configTabla2,
                  ingresos_mes: Number(e.target.value.replace(/\./g, ''))
                })}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-semibold"
              />
            </div>
          </div>

          <Button
            onClick={() => guardarTabla(2)}
            disabled={loading}
            className="w-full"
          >
            {loading ? '⏳ Guardando...' : '💾 Guardar Tabla 2'}
          </Button>
        </div>
      </div>
    </div>
  );
}


// ============ SECCIÓN NOTIFICACIONES (NUEVA) ============
function SeccionNotificaciones() {
  const [config, setConfig] = useState<any>(null);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [probando, setProbando] = useState(false);

  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    try {
      const res = await fetch('/api/notificaciones/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setTelegramChatId(data.data.telegram_chat_id || '');
      }
    } catch (error) {
      console.error('Error cargando config:', error);
    }
  };

  const guardarConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notificaciones/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_token: telegramToken || config?.telegram_token,
          telegram_chat_id: telegramChatId,
          telegram_activo: true,
          pwa_activo: true,
        }),
      });

      if (res.ok) {
        alert('✅ Configuración guardada correctamente');
        cargarConfig();
        setTelegramToken(''); // Limpiar campo por seguridad
      } else {
        alert('❌ Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error guardando config:', error);
      alert('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const probarNotificacion = async () => {
    setProbando(true);
    try {
      const res = await fetch('/api/notificaciones/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: '🧪 <b>Prueba de Notificación</b>\n\n✅ Tu bot está correctamente configurado y funcionando.',
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ Notificación de prueba enviada a Telegram. Revisa tu chat.');
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Error al enviar notificación de prueba');
    } finally {
      setProbando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">🔔 Configuración de Notificaciones</h2>
        <p className="text-sm text-gray-600 mt-1">
          Recibe alertas de pagos pendientes por Telegram y en la app
        </p>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-900 mb-2">📱 Cómo crear tu bot de Telegram:</p>
        <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
          <li>Abre Telegram y busca <code className="bg-blue-200 px-1 rounded">@BotFather</code></li>
          <li>Envía el comando <code className="bg-blue-200 px-1 rounded">/newbot</code></li>
          <li>Sigue las instrucciones y guarda el <strong>TOKEN</strong></li>
          <li>Inicia conversación con tu bot y envía <code className="bg-blue-200 px-1 rounded">/start</code></li>
          <li>Abre: <code className="bg-blue-200 px-1 rounded text-xs">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></li>
          <li>Busca tu <strong>CHAT_ID</strong> en el JSON (número en &quot;chat&quot;: &#123;&quot;id&quot;:...&#125;)</li>

        </ol>
      </div>

      {/* Formulario */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Token del Bot de Telegram</label>
          <input
            type="password"
            value={telegramToken}
            onChange={(e) => setTelegramToken(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={config?.telegram_token ? 'Token configurado (oculto)' : '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'}
          />
          <p className="text-xs text-gray-500 mt-1">
            Solo ingresa nuevo token si quieres cambiarlo
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tu Chat ID de Telegram</label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="123456789"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={guardarConfig}
            disabled={loading || !telegramChatId}
            className="flex-1"
          >
            {loading ? '⏳ Guardando...' : '💾 Guardar Configuración'}
          </Button>

          <Button
            onClick={probarNotificacion}
            disabled={probando || !config?.telegram_chat_id}
            variant="outline"
          >
            {probando ? '⏳ Enviando...' : '🧪 Probar'}
          </Button>
        </div>
      </div>

      {/* Estado */}
      {config && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-900">✅ Estado del Sistema</p>
          <ul className="text-xs text-green-800 mt-2 space-y-1">
            <li>🤖 Telegram: {config.telegram_activo ? 'Activo' : 'Inactivo'}</li>
            <li>📱 PWA: {config.pwa_activo ? 'Activo' : 'Inactivo'}</li>
            <li>⏰ Horario: 8:00 AM - 11:00 PM</li>
            <li>🔔 Notificaciones HOY: Cada 1 hora</li>
            <li>🔔 Notificaciones MAÑANA: Una vez a las 9:00 AM</li>
          </ul>
        </div>
      )}
    </div>
  );
}


