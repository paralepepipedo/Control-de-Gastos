"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatNombrePeriodo } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ProvisionesPage() {
  const [provisiones, setProvisiones] = useState<any[]>([]);
  const [gastosFijos, setGastosFijos] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('actual');
  const [loading, setLoading] = useState(true);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [provisionEditar, setProvisionEditar] = useState<any>(null);
  const [nuevaProvision, setNuevaProvision] = useState({
    gasto_fijo_id: '',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    fecha_vencimiento: '',
    monto_provision: ''
  });

  useEffect(() => {
    cargarPeriodos();
    cargarGastosFijos();
  }, []);

  useEffect(() => {
    if (periodos.length > 0) {
      cargarProvisiones();
    }
  }, [periodoSeleccionado, periodos]);

  const cargarPeriodos = async () => {
    try {
      const response = await fetch('/api/periodos/listado');
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setPeriodos(result.data);
      } else {
        cargarProvisiones();
      }
    } catch (error) {
      console.error('Error:', error);
      cargarProvisiones();
    }
  };

  const obtenerPeriodoActivo = () => {
    if (periodos.length === 0) return null;

    if (periodoSeleccionado === 'actual') {
      return periodos[0];
    }

    return periodos.find(
      (p: any) => `${p.mes}-${p.anio}` === periodoSeleccionado
    );
  };

  const cargarProvisiones = async () => {
    setLoading(true);
    try {
      const periodoActivo = obtenerPeriodoActivo();

      let url = '/api/provisiones';

      if (periodoActivo) {
        url = `/api/provisiones?mes=${periodoActivo.mes}&anio=${periodoActivo.anio}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) setProvisiones(result.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarGastosFijos = async () => {
    try {
      const response = await fetch('/api/gastos-fijos');
      const result = await response.json();
      if (result.success) setGastosFijos(result.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const generarProvisiones = async () => {
    const periodoActivo = obtenerPeriodoActivo();
    const hoy = new Date();

    const mes = periodoActivo?.mes || (hoy.getMonth() + 1);
    const anio = periodoActivo?.anio || hoy.getFullYear();

    const nombreMes = formatNombrePeriodo(mes, anio);

    if (!confirm(
      `¿Generar provisiones para ${nombreMes.toUpperCase()}?\n\n` +
      `Se crearán provisiones basadas en los gastos fijos activos.`
    )) return;

    try {
      // Primer intento: modo "nuevo" (no borrar nada, crear lo que falte)
      let response = await fetch('/api/provisiones/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, anio, modo: 'nuevo' })
      });

      let result = await response.json();

      // Si el backend dice que ya existen provisiones y requiere confirmación extra
      if (!result.success && result.requiereConfirmacion) {
        const confirmarRegenerar = confirm(
          `Ya existen provisiones para ${nombreMes.toUpperCase()}.\n\n` +
          `Aceptar: borrar provisiones de ese mes y regenerarlas.\n` +
          `Cancelar: mantener las provisiones actuales y no hacer cambios.`
        );

        if (!confirmarRegenerar) {
          alert('Operación cancelada. No se modificaron las provisiones existentes.');
          return;
        }

        // Segundo intento: modo "regenerar"
        response = await fetch('/api/provisiones/generar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mes, anio, modo: 'regenerar' })
        });

        result = await response.json();
      }

      if (result.success) {
        alert(
          `✅ Provisiones generadas/actualizadas para ${nombreMes}\n\n` +
          `Provisiones nuevas: ${result.generadas}\n` +
          `Gastos creados nuevos: ${result.gastosCreados}`
        );
        cargarProvisiones();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error al generar provisiones');
    }
  };

  const agregarProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/provisiones/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevaProvision,
          gasto_fijo_id: parseInt(nuevaProvision.gasto_fijo_id),
          monto_provision: parseFloat(nuevaProvision.monto_provision)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Provisión creada');
        setModalAgregar(false);
        setNuevaProvision({
          gasto_fijo_id: '',
          mes: new Date().getMonth() + 1,
          anio: new Date().getFullYear(),
          fecha_vencimiento: '',
          monto_provision: ''
        });
        cargarProvisiones();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error al crear provisión');
    }
  };

  const abrirModalEditar = (provision: any) => {
    setProvisionEditar({
      ...provision,
      fecha_vencimiento: provision.fecha_vencimiento.split('T')[0]
    });
    setModalEditar(true);
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/provisiones/${provisionEditar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha_vencimiento: provisionEditar.fecha_vencimiento,
          monto_provision: parseFloat(provisionEditar.monto_provision),
          estado: provisionEditar.estado
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Provisión actualizada');
        setModalEditar(false);
        cargarProvisiones();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error al actualizar provisión');
    }
  };

  const marcarPagada = async (id: number) => {
    if (!confirm('¿Marcar esta provisión como pagada?')) return;

    try {
      const response = await fetch(`/api/provisiones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'pagada' })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Provisión marcada como pagada');
        cargarProvisiones();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error al actualizar provisión');
    }
  };

  const eliminarProvision = async (id: number, nombre: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la provisión "${nombre}"?`)) return;
    
    try {
      const response = await fetch(`/api/provisiones/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Provisión eliminada');
        cargarProvisiones();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error al eliminar provisión');
    }
  };

  const pendientes = provisiones.filter(p => p.estado === 'pendiente');
  const pagadas = provisiones.filter(p => p.estado === 'pagada');

  const periodoActivo = obtenerPeriodoActivo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📋 Provisiones Mensuales</h1>
          {periodoActivo && (
            <p className="text-sm text-gray-600 mt-1">
              {formatNombrePeriodo(periodoActivo.mes, periodoActivo.anio)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModalAgregar(true)} variant="outline">
            + Nueva Provisión
          </Button>
          <Button onClick={generarProvisiones}>
            🔄 Generar Provisiones del Mes
          </Button>
        </div>
      </div>

      {/* Selector de Período */}
      {periodos.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Período</label>
              <select
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="actual">📅 Período Actual</option>
                {periodos.length > 1 && (
                  <optgroup label="Períodos Anteriores">
                    {periodos.slice(1).map((periodo: any) => (
                      <option 
                        key={`${periodo.mes}-${periodo.anio}`} 
                        value={`${periodo.mes}-${periodo.anio}`}
                      >
                        {formatNombrePeriodo(periodo.mes, periodo.anio)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <>
          {/* Pendientes */}
          <div className="bg-white rounded-lg shadow">
            <div className="bg-yellow-500 text-white px-6 py-3 rounded-t-lg">
              <h2 className="text-xl font-bold">⏳ Pendientes ({pendientes.length})</h2>
            </div>
            <div className="p-6">
              {pendientes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay provisiones pendientes en este período
                </p>
              ) : (
                <div className="space-y-3">
                  {pendientes.map((provision: any) => {
                    const diasRestantes = Math.ceil(
                      (new Date(provision.fecha_vencimiento).getTime() - new Date().getTime()) / 
                      (1000 * 60 * 60 * 24)
                    );
                    const esUrgente = diasRestantes <= 3;

                    return (
                      <div 
                        key={provision.id} 
                        className={`flex justify-between items-center p-4 rounded border-l-4 ${
                          esUrgente ? 'border-red-500 bg-red-50' : 'border-yellow-400 bg-yellow-50'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-lg">
                            {provision.gastos_fijos?.nombre || 'Sin nombre'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Vence: {new Date(provision.fecha_vencimiento).toLocaleDateString('es-CL')}
                            {esUrgente && (
                              <span className="text-red-600 font-semibold ml-2">¡URGENTE!</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-bold text-xl">
                            {formatCurrency(provision.monto_provision)}
                          </p>
                          <p className={`text-sm ${esUrgente ? 'text-red-600' : 'text-yellow-600'}`}>
                            {diasRestantes === 0
                              ? 'Hoy'
                              : diasRestantes < 0
                              ? `Vencida (${Math.abs(diasRestantes)}d)`
                              : `${diasRestantes} días`}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => marcarPagada(provision.id)}
                            className="text-green-600 hover:bg-green-50 p-2 rounded"
                            title="Marcar pagada"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => abrirModalEditar(provision)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() =>
                              eliminarProvision(
                                provision.id,
                                provision.gastos_fijos?.nombre || 'Sin nombre'
                              )
                            }
                            className="text-red-600 hover:bg-red-50 p-2 rounded"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pagadas */}
          {pagadas.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="bg-green-500 text-white px-6 py-3 rounded-t-lg">
                <h2 className="text-xl font-bold">✅ Pagadas ({pagadas.length})</h2>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {pagadas.map((provision: any) => (
                    <div 
                      key={provision.id} 
                      className="flex justify-between items-center p-3 bg-green-50 rounded border-l-4 border-green-500"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">
                          {provision.gastos_fijos?.nombre || 'Sin nombre'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Pagado: {provision.fecha_pago
                            ? new Date(provision.fecha_pago).toLocaleDateString('es-CL')
                            : '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-green-700">
                          {formatCurrency(provision.monto_provision)}
                        </p>
                        <button
                          onClick={() =>
                            eliminarProvision(
                              provision.id,
                              provision.gastos_fijos?.nombre || 'Sin nombre'
                            )
                          }
                          className="text-red-600 hover:bg-red-50 p-2 rounded"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Agregar */}
      {modalAgregar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">+ Nueva Provisión</h2>
            
            <form onSubmit={agregarProvision} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Gasto Fijo *</label>
                <select
                  required
                  value={nuevaProvision.gasto_fijo_id}
                  onChange={(e) =>
                    setNuevaProvision({ ...nuevaProvision, gasto_fijo_id: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccionar...</option>
                  {gastosFijos.map((gf: any) => (
                    <option key={gf.id} value={gf.id}>
                      {gf.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mes *</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    max="12"
                    value={nuevaProvision.mes}
                    onChange={(e) =>
                      setNuevaProvision({
                        ...nuevaProvision,
                        mes: parseInt(e.target.value)
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Año *</label>
                  <Input
                    type="number"
                    required
                    value={nuevaProvision.anio}
                    onChange={(e) =>
                      setNuevaProvision({
                        ...nuevaProvision,
                        anio: parseInt(e.target.value)
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Vencimiento *</label>
                <Input
                  type="date"
                  required
                  value={nuevaProvision.fecha_vencimiento}
                  onChange={(e) =>
                    setNuevaProvision({
                      ...nuevaProvision,
                      fecha_vencimiento: e.target.value
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Monto *</label>
                <Input
                  type="number"
                  required
                  value={nuevaProvision.monto_provision}
                  onChange={(e) =>
                    setNuevaProvision({
                      ...nuevaProvision,
                      monto_provision: e.target.value
                    })
                  }
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalAgregar(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  💾 Crear
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && provisionEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">✏️ Editar Provisión</h2>
            
            <form onSubmit={guardarEdicion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Gasto Fijo</label>
                <Input
                  type="text"
                  disabled
                  value={provisionEditar.gastos_fijos?.nombre || 'Sin nombre'}
                  className="bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Vencimiento *</label>
                <Input
                  type="date"
                  required
                  value={provisionEditar.fecha_vencimiento}
                  onChange={(e) =>
                    setProvisionEditar({
                      ...provisionEditar,
                      fecha_vencimiento: e.target.value
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Monto *</label>
                <Input
                  type="number"
                  required
                  value={provisionEditar.monto_provision}
                  onChange={(e) =>
                    setProvisionEditar({
                      ...provisionEditar,
                      monto_provision: e.target.value
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={provisionEditar.estado}
                  onChange={(e) =>
                    setProvisionEditar({
                      ...provisionEditar,
                      estado: e.target.value
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
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
