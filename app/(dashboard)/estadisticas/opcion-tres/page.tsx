'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';
import Link from 'next/link';
import { formatearMoneda } from '../utils/proyecciones';

interface Escenario {
  id: string;
  nombre: string;
  cambios: Cambio[];
}

interface Cambio {
  tipo: 'aumentar_sueldo' | 'reducir_gasto' | 'eliminar_gasto' | 'nuevo_gasto';
  descripcion: string;
  monto: number;
}

export default function OpcionTresPage() {
  const [escenarioBase, setEscenarioBase] = useState<any>(null);
  const [escenarios, setEscenarios] = useState<Escenario[]>([
    { id: '1', nombre: 'Escenario Actual', cambios: [] }
  ]);
  const [escenarioSeleccionado, setEscenarioSeleccionado] = useState('1');
  const [loading, setLoading] = useState(true);

  // Formulario nuevo cambio
  const [nuevoCambio, setNuevoCambio] = useState({
    tipo: 'aumentar_sueldo' as Cambio['tipo'],
    descripcion: '',
    monto: 0,
  });

  useEffect(() => {
    cargarDatosBase();
  }, []);

  const cargarDatosBase = async () => {
    try {
      const res = await fetch('/api/estadisticas/proyectar?meses=12');
      const data = await res.json();
      setEscenarioBase(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const agregarCambio = () => {
    if (!nuevoCambio.descripcion || nuevoCambio.monto === 0) return;

    const escenario = escenarios.find(e => e.id === escenarioSeleccionado);
    if (escenario) {
      escenario.cambios.push({ ...nuevoCambio });
      setEscenarios([...escenarios]);
      setNuevoCambio({ tipo: 'aumentar_sueldo', descripcion: '', monto: 0 });
    }
  };

  const eliminarCambio = (index: number) => {
    const escenario = escenarios.find(e => e.id === escenarioSeleccionado);
    if (escenario) {
      escenario.cambios.splice(index, 1);
      setEscenarios([...escenarios]);
    }
  };

  const calcularImpacto = () => {
    const escenario = escenarios.find(e => e.id === escenarioSeleccionado);
    if (!escenario || !escenarioBase) return { ingresos: 0, gastos: 0, saldo: 0 };

    const proyeccionBase = escenarioBase.proyeccion[0];
    let ingresos = proyeccionBase.ingresos;
    let gastos = proyeccionBase.total_gastos;

    escenario.cambios.forEach(cambio => {
      switch (cambio.tipo) {
        case 'aumentar_sueldo':
          ingresos += cambio.monto;
          break;
        case 'reducir_gasto':
          gastos -= cambio.monto;
          break;
        case 'eliminar_gasto':
          gastos -= cambio.monto;
          break;
        case 'nuevo_gasto':
          gastos += cambio.monto;
          break;
      }
    });

    return { ingresos, gastos, saldo: ingresos - gastos };
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  const impacto = calcularImpacto();
  const escenarioActual = escenarios.find(e => e.id === escenarioSeleccionado);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/estadisticas" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Escenarios</h1>
          <p className="text-gray-600 text-sm">Simula "¿Qué pasa si...?" y compara resultados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Izquierdo: Creador de Escenarios */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Crear Simulación</h2>

            {/* Selector de Tipo de Cambio */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cambio
                </label>
                <select
                  value={nuevoCambio.tipo}
                  onChange={(e) => setNuevoCambio({ ...nuevoCambio, tipo: e.target.value as Cambio['tipo'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="aumentar_sueldo">💰 Aumentar Sueldo</option>
                  <option value="reducir_gasto">📉 Reducir Gasto</option>
                  <option value="eliminar_gasto">🗑️ Eliminar Gasto</option>
                  <option value="nuevo_gasto">➕ Agregar Nuevo Gasto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <input
                  type="text"
                  value={nuevoCambio.descripcion}
                  onChange={(e) => setNuevoCambio({ ...nuevoCambio, descripcion: e.target.value })}
                  placeholder="Ej: Aumento del 10%"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto Mensual
                </label>
                <input
                  type="number"
                  value={nuevoCambio.monto}
                  onChange={(e) => setNuevoCambio({ ...nuevoCambio, monto: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={agregarCambio}
                className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Agregar Cambio
              </button>
            </div>
          </div>

          {/* Lista de Cambios Aplicados */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Cambios en el Escenario ({escenarioActual?.cambios.length || 0})
            </h3>
            
            {escenarioActual && escenarioActual.cambios.length > 0 ? (
              <div className="space-y-2">
                {escenarioActual.cambios.map((cambio, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cambio.descripcion}</p>
                      <p className="text-sm text-gray-600">
                        {cambio.tipo === 'aumentar_sueldo' && '💰 Aumentar Sueldo'}
                        {cambio.tipo === 'reducir_gasto' && '📉 Reducir Gasto'}
                        {cambio.tipo === 'eliminar_gasto' && '🗑️ Eliminar Gasto'}
                        {cambio.tipo === 'nuevo_gasto' && '➕ Nuevo Gasto'}
                        {' - '}
                        {formatearMoneda(cambio.monto)}
                      </p>
                    </div>
                    <button
                      onClick={() => eliminarCambio(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay cambios aplicados. Agrega uno arriba.
              </p>
            )}
          </div>
        </div>

        {/* Panel Derecho: Resultados de Comparación */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="w-6 h-6" />
              Impacto Proyectado
            </h2>

            <div className="space-y-4">
              {/* Ingresos */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Ingresos Mensuales</span>
                  <span className="text-xs text-gray-500">vs Base</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-700">
                    {formatearMoneda(impacto.ingresos)}
                  </span>
                  <span className={`text-sm font-semibold ${
                    impacto.ingresos > (escenarioBase?.proyeccion[0]?.ingresos || 0)
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {impacto.ingresos > (escenarioBase?.proyeccion[0]?.ingresos || 0)
                      ? `+${formatearMoneda(impacto.ingresos - (escenarioBase?.proyeccion[0]?.ingresos || 0))}`
                      : 'Sin cambios'}
                  </span>
                </div>
              </div>

              {/* Gastos */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Gastos Mensuales</span>
                  <span className="text-xs text-gray-500">vs Base</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-red-700">
                    {formatearMoneda(impacto.gastos)}
                  </span>
                  <span className={`text-sm font-semibold ${
                    impacto.gastos < (escenarioBase?.proyeccion[0]?.total_gastos || 0)
                      ? 'text-green-600'
                      : impacto.gastos > (escenarioBase?.proyeccion[0]?.total_gastos || 0)
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}>
                    {impacto.gastos !== (escenarioBase?.proyeccion[0]?.total_gastos || 0)
                      ? formatearMoneda(impacto.gastos - (escenarioBase?.proyeccion[0]?.total_gastos || 0))
                      : 'Sin cambios'}
                  </span>
                </div>
              </div>

              {/* Saldo */}
              <div className={`p-4 rounded-lg ${
                impacto.saldo > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Saldo Mensual</span>
                </div>
                <div className="text-3xl font-bold">
                  <span className={impacto.saldo > 0 ? 'text-green-700' : 'text-red-700'}>
                    {formatearMoneda(impacto.saldo)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {impacto.saldo > 0
                    ? `✓ Tienes ${formatearMoneda(impacto.saldo)} disponible`
                    : `✗ Déficit de ${formatearMoneda(Math.abs(impacto.saldo))}`}
                </p>
              </div>
            </div>
          </div>

          {/* Alertas y Recomendaciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-2">💡 Análisis Rápido</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {impacto.saldo < 0 && (
                <li>⚠️ Este escenario genera déficit mensual</li>
              )}
              {impacto.saldo > 0 && impacto.saldo < 100000 && (
                <li>⚠️ Saldo bajo, considera aumentar el ahorro</li>
              )}
              {impacto.saldo > 500000 && (
                <li>✓ Excelente solvencia proyectada</li>
              )}
              {escenarioActual?.cambios.length === 0 && (
                <li>ℹ️ Agrega cambios para ver el impacto</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
