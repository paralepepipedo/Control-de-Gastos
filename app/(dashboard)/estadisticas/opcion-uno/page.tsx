'use client';

import { useEffect, useState } from 'react';
import { formatearMoneda } from '../utils/proyecciones';
import { ArrowLeft, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface GastoDetalle {
  id: number;
  nombre: string;
  monto: number;
  monto_original: number;
  tiene_override: boolean;
  categoria: string;
}

interface ProyeccionMensual {
  mes: string;
  mes_nombre: string;
  mes_numero: number;
  anio: number;
  saldo_inicial: number;
  ingresos: number;
  ingresos_tiene_override: boolean;
  gastos_fijos: number;
  gastos_fijos_detalle: GastoDetalle[];
  saldo_final: number;
  variacion: number;
  solvencia_porcentaje: number;
  estado: 'superavit' | 'equilibrio' | 'deficit';
}

export default function OpcionUnoPage() {
  const [proyeccion, setProyeccion] = useState<ProyeccionMensual[]>([]);
  const [gastosFijos, setGastosFijos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesesMostrar, setMesesMostrar] = useState(12);
  const [expandido, setExpandido] = useState(false);
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    cargarProyeccion();
  }, [mesesMostrar]);

  const cargarProyeccion = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estadisticas/proyectar?meses=${mesesMostrar}`);
      const data = await res.json();
      
      if (data.error) {
        console.error('Error en API:', data.error);
        alert('Error al cargar proyección: ' + data.error);
        return;
      }

      setProyeccion(data.proyeccion);
      setGastosFijos(data.gastos_fijos || []);
      setConfig(data.config || {});
    } catch (error) {
      console.error('Error cargando proyección:', error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const guardarOverride = async (tipo: string, referencia_id: number, anio: number, mes: number, monto: number) => {
    try {
      const response = await fetch('/api/estadisticas/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          referencia_id,
          anio,
          mes,
          monto_override: monto,
          descripcion: `Modificado manualmente ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await cargarProyeccion();
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar cambio');
    }
  };

  const exportarCSV = () => {
    const headers = ['Concepto', ...proyeccion.map(p => p.mes_nombre)];
    const filas = [
      ['Saldo Inicial', ...proyeccion.map(p => p.saldo_inicial)],
      ['Sueldo', ...proyeccion.map(p => p.ingresos)],
      ['Gastos Fijos', ...proyeccion.map(p => p.gastos_fijos)],
      ['Saldo Final', ...proyeccion.map(p => p.saldo_final)],
    ];

    const csv = [headers, ...filas].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proyeccion-gastos-fijos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Cargando proyección...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/estadisticas" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tabla 1 - Gastos Fijos</h1>
            <p className="text-gray-600 text-sm">
              Saldo inicial: {formatearMoneda(config.saldo_inicial || 0)} | 
              Sueldo base: {formatearMoneda(config.sueldo_minimo || 0)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/estadisticas/opcion-dos"
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            📊 Ver Tabla 2 (Gastos Efectivo)
          </Link>

          <select
            value={mesesMostrar}
            onChange={(e) => setMesesMostrar(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
          </select>

          <button
            onClick={exportarCSV}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={cargarProyeccion}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px] sticky left-0 bg-gray-100 z-10">
                  Concepto
                </th>
                {proyeccion.map((p, idx) => (
                  <th key={idx} className="px-4 py-3 text-center font-semibold text-gray-700 min-w-[140px]">
                    {p.mes_nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Fila: Saldo Inicial */}
              <tr className="border-b bg-blue-50 hover:bg-blue-100">
                <td className="px-4 py-3 font-semibold text-blue-800 sticky left-0 bg-blue-50 z-10">
                  💰 Saldo Inicial
                </td>
                {proyeccion.map((p, idx) => (
                  <td key={idx} className="px-4 py-3 text-center font-bold text-blue-700">
                    {formatearMoneda(p.saldo_inicial)}
                  </td>
                ))}
              </tr>

                            {/* Fila: Sueldo (EDITABLE CON FORMATO) */}
              <tr className="border-b bg-green-50 hover:bg-green-100">
                <td className="px-4 py-3 font-semibold text-green-800 sticky left-0 bg-green-50 z-10">
                  ➕ Sueldo
                </td>
                {proyeccion.map((p, idx) => (
                  <td key={idx} className="px-4 py-2 text-center">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const texto = e.currentTarget.textContent || '';
                        const valor = Number(texto.replace(/\./g, '').replace(/\$/g, '').trim());
                        if (valor !== p.ingresos && valor > 0) {
                          guardarOverride('ingreso_sueldo', 1, p.anio, p.mes_numero, valor);
                        }
                      }}
                      onFocus={(e) => {
                        // Mostrar sin formato al editar
                        e.currentTarget.textContent = p.ingresos.toString();
                        // Seleccionar todo
                        const range = document.createRange();
                        range.selectNodeContents(e.currentTarget);
                        const sel = window.getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        // Permitir solo números
                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className={`
                        px-2 py-1 text-center rounded border font-bold cursor-text
                        ${p.ingresos_tiene_override
                          ? 'border-blue-400 bg-blue-50 text-blue-600' 
                          : 'border-green-300 bg-white text-green-700 hover:border-green-400'
                        }
                        focus:outline-none focus:ring-2 focus:ring-green-400
                      `}
                    >
                      {p.ingresos.toLocaleString('es-CL')}
                    </div>
                  </td>
                ))}
              </tr>


              {/* Fila: Gastos Fijos (Expandible) */}
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 sticky left-0 bg-white z-10">
                  <button
                    onClick={() => setExpandido(!expandido)}
                    className="flex items-center gap-2 font-semibold text-orange-800 hover:text-orange-600"
                  >
                    {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    📌 Gastos Fijos
                  </button>
                </td>
                {proyeccion.map((p, idx) => (
                  <td key={idx} className="px-4 py-3 text-center text-orange-700 font-bold">
                    {formatearMoneda(p.gastos_fijos)}
                  </td>
                ))}
              </tr>

              {/* Filas expandidas: Detalle de cada gasto */}
              {expandido && gastosFijos.map((gasto) => (
                <tr key={gasto.id} className="border-b hover:bg-gray-50 bg-orange-50">
                  <td className="px-8 py-2 text-sm text-gray-700 sticky left-0 bg-orange-50 z-10">
                    └─ {gasto.nombre}
                  </td>
                  {proyeccion.map((p, idx) => {
                    const detalle = p.gastos_fijos_detalle?.find(g => g.id === gasto.id);
                    return (
                      <td key={idx} className="px-4 py-2 text-center text-sm">
                        <input
                          type="number"
                          defaultValue={detalle?.monto || 0}
                          onBlur={(e) => guardarOverride(
                            'gasto_fijo',
                            gasto.id,
                            p.anio,
                            p.mes_numero,
                            Number(e.target.value)
                          )}
                          className={`
                            w-full px-2 py-1 text-center rounded border
                            ${detalle?.tiene_override 
                              ? 'border-blue-400 bg-blue-50 text-blue-600 font-bold' 
                              : 'border-gray-300 bg-white hover:border-blue-300'
                            }
                            focus:outline-none focus:ring-2 focus:ring-blue-400
                          `}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Fila: Saldo Final */}
              <tr className="border-b font-bold bg-gray-50">
                <td className="px-4 py-3 text-gray-900 sticky left-0 bg-gray-50 z-10">
                  💵 Saldo Final
                </td>
                {proyeccion.map((p, idx) => (
                  <td
                    key={idx}
                    className={`px-4 py-3 text-center font-bold ${
                      p.saldo_final > 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {formatearMoneda(p.saldo_final)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info adicional */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">ℹ️ Tabla 1 - Gastos Fijos</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Sueldo</strong> y <strong>Gastos Fijos</strong> son editables por mes</li>
          <li>• Los valores en <span className="text-blue-600 font-bold">azul</span> tienen modificaciones guardadas</li>
          <li>• Click en "📌 Gastos Fijos" para expandir/contraer el detalle</li>
          <li>• Todos los cambios se guardan automáticamente y recalculan los meses siguientes</li>
        </ul>
      </div>
    </div>
  );
}
