'use client';

import { useEffect, useState } from 'react';
import { formatearMoneda } from '../utils/proyecciones';
import { ArrowLeft, Download, RefreshCw, ChevronDown, ChevronUp, Save } from 'lucide-react';
import Link from 'next/link';

interface GastoEfectivoDetalle {
  categoria_id: number;
  categoria_nombre: string;
  categoria_icono: string;
  monto: number;
  monto_original: number;
  tiene_override: boolean;
}

interface ProyeccionMensual {
  mes: string;
  mes_nombre: string;
  mes_numero: number;
  anio: number;
  saldo_inicial: number;
  saldo_inicial_tabla2?: number;
  ingresos: number;
  ingresos_tiene_override: boolean;
  gastos_efectivo: number;
  gastos_efectivo_detalle: GastoEfectivoDetalle[];
  saldo_final_con_efectivo: number;
  variacion: number;
  solvencia_porcentaje: number;
  estado: string;
  es_periodo_actual: boolean;
  es_futuro: boolean;
}

export default function OpcionDosPage() {
  const [proyeccion, setProyeccion] = useState<ProyeccionMensual[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesesMostrar, setMesesMostrar] = useState(12);
  const [mesExpandido, setMesExpandido] = useState<string | null>(null);
  const [config, setConfig] = useState<any>({});
  const [cambiosPendientes, setCambiosPendientes] = useState<any>({});
  const [guardando, setGuardando] = useState(false);

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

      const categoriasMap = new Map();
      data.proyeccion.forEach((p: ProyeccionMensual) => {
        p.gastos_efectivo_detalle?.forEach(detalle => {
          if (!categoriasMap.has(detalle.categoria_id)) {
            categoriasMap.set(detalle.categoria_id, {
              categoria_id: detalle.categoria_id,
              categoria_nombre: detalle.categoria_nombre,
              categoria_icono: detalle.categoria_icono,
            });
          }
        });
      });

      setCategorias(Array.from(categoriasMap.values()));
      setConfig(data.config || {});
      setCambiosPendientes({});
    } catch (error) {
      console.error('Error cargando proyección:', error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCambioLocal = (tipo: string, key: string, valor: number) => {
    setCambiosPendientes((prev: any) => ({
      ...prev,
      [`${tipo}_${key}`]: valor,
    }));
  };

  const guardarTodosCambios = async () => {
    if (Object.keys(cambiosPendientes).length === 0) {
      alert('No hay cambios pendientes');
      return;
    }

    setGuardando(true);
    try {
      const promesas = Object.entries(cambiosPendientes).map(async ([key, monto]) => {
        const [tipo, ...rest] = key.split('_');
        const identificador = rest.join('_');

        let tipoAPI = '';
        let referenciaId = 0;
        let anio = 0;
        let mes = 0;

        if (tipo === 'sueldo') {
          tipoAPI = 'ingreso_sueldo';
          [anio, mes] = identificador.split('-').map(Number);
        } else if (tipo === 'efectivo') {
          tipoAPI = 'gasto_efectivo';
          const [catId, anioStr, mesStr] = identificador.split('-');
          referenciaId = Number(catId);
          anio = Number(anioStr);
          mes = Number(mesStr);
        }

        const response = await fetch('/api/estadisticas/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: tipoAPI,
            referencia_id: referenciaId || null,
            anio,
            mes,
            monto_override: monto,
            descripcion: `Modificado desde Tabla 2 - ${new Date().toLocaleString()}`,
          }),
        });

        if (!response.ok) throw new Error('Error guardando cambio');
      });

      await Promise.all(promesas);
      alert('✅ Todos los cambios guardados correctamente');
      await cargarProyeccion();
    } catch (error) {
      console.error('Error guardando cambios:', error);
      alert('❌ Error al guardar algunos cambios');
    } finally {
      setGuardando(false);
    }
  };

  const exportarCSV = () => {
    const headers = ['Concepto', ...proyeccion.map(p => p.mes_nombre)];
    const filas = [
      ['Saldo Inicial', ...proyeccion.map(p => p.saldo_inicial)],
      ['Sueldo', ...proyeccion.map(p => p.ingresos)],
      ['Gastos Efectivo', ...proyeccion.map(p => p.gastos_efectivo)],
      ['Saldo Final', ...proyeccion.map(p => p.saldo_final_con_efectivo)],
    ];

    const csv = [headers, ...filas].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proyeccion-tabla2-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const toggleExpandir = (mesKey: string) => {
    setMesExpandido(mesExpandido === mesKey ? null : mesKey);
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

  const hayCambiosPendientes = Object.keys(cambiosPendientes).length > 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/estadisticas" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tabla 2 - Gastos Reales en Efectivo</h1>
            <p className="text-gray-600 text-sm">
              Saldo inicial: {formatearMoneda(config.saldo_inicial || 0)} |
              Sueldo base: {formatearMoneda(config.sueldo_minimo || 0)}
              {config.periodo_actual && ` | Período actual: ${config.periodo_actual.mes}/${config.periodo_actual.anio}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/estadisticas/opcion-uno"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-md"
          >
            📊 Ver Tabla 1
          </Link>

          <select
            value={mesesMostrar}
            onChange={(e) => setMesesMostrar(Number(e.target.value))}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
          </select>

          <button
            onClick={exportarCSV}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 shadow-md transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={cargarProyeccion}
            disabled={guardando}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 shadow-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${guardando ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>
      </div>

      {/* Botón Actualizar Tabla */}
      {hayCambiosPendientes && (
        <div className="mb-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-700 font-semibold">
              ⚠️ Tienes {Object.keys(cambiosPendientes).length} cambio(s) sin guardar
            </span>
          </div>
          <button
            onClick={guardarTodosCambios}
            disabled={guardando}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2 font-semibold disabled:opacity-50 shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Actualizar Tabla'}
          </button>
        </div>
      )}

      {/* Tabla Principal */}
      <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-800 min-w-[200px] sticky left-0 bg-gradient-to-r from-gray-100 to-gray-200 z-20 border-r-2 border-gray-300">
                  Concepto
                </th>
                {proyeccion.map((p) => (
                  <th
                    key={p.mes}
                    className="px-4 py-3 text-center font-bold text-gray-800 min-w-[140px] border-l border-gray-200"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base">{p.mes_nombre}</span>
                      {p.es_periodo_actual && (
                        <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                          Actual
                        </span>
                      )}
                      {p.es_futuro && (
                        <span className="text-xs bg-gray-500 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                          Proyección
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Saldo Inicial */}
              <tr className="border-b-2 border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-white z-10 border-r-2 border-gray-200">
                  💵 Saldo Inicial
                </td>
                {proyeccion.map((p) => (
                  <td key={p.mes} className="px-4 py-3 text-center font-medium border-l border-gray-100">
                    {formatearMoneda(p.saldo_inicial_tabla2 || p.saldo_inicial)}
                  </td>
                ))}
              </tr>


              {/* Sueldo - TODO EN FORMATO MONEDA */}
              <tr className="border-b-2 border-gray-200 bg-green-50 hover:bg-green-100 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-green-50 z-10 border-r-2 border-gray-200">
                  💰 Sueldo
                </td>
                {proyeccion.map((p) => {
                  const key = `sueldo_${p.anio}-${p.mes_numero}`;
                  const valorActual = cambiosPendientes[key] ?? p.ingresos;
                  const tieneOverride = p.ingresos_tiene_override || cambiosPendientes[key] !== undefined;

                  return (
                    <td key={p.mes} className="px-4 py-3 text-center border-l border-gray-100">
                      {p.es_futuro ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="text"
                            value={valorActual.toLocaleString('es-CL')}
                            onChange={(e) => {
                              const numero = Number(e.target.value.replace(/\D/g, ''));
                              handleCambioLocal('sueldo', `${p.anio}-${p.mes_numero}`, numero);
                            }}
                            className={`w-full pl-6 pr-2 py-2 border-2 rounded-lg text-right font-medium transition-all ${tieneOverride
                                ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                                : 'border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                              }`}
                          />
                        </div>
                      ) : (
                        <span className={`font-semibold ${tieneOverride ? 'text-yellow-600' : 'text-green-700'}`}>
                          {formatearMoneda(valorActual)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Gastos Efectivo - Fila Principal */}
              <tr className="border-b-2 border-gray-200 bg-red-50">
                <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-red-50 z-10 border-r-2 border-gray-200">
                  <button
                    onClick={() => setMesExpandido(mesExpandido ? null : 'todos')}
                    className="flex items-center gap-2 hover:text-red-600 transition-colors"
                  >
                    {mesExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    🛒 Gastos Efectivo
                  </button>
                </td>
                {proyeccion.map((p) => (
                  <td key={p.mes} className="px-4 py-3 text-center border-l border-gray-100">
                    <span className="text-red-600 font-bold">
                      {formatearMoneda(p.gastos_efectivo)}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Gastos Efectivo - Detalle Expandido por Categoría */}
              {mesExpandido && categorias.map((cat) => (
                <tr key={cat.categoria_id} className="border-b border-gray-100 bg-red-50/30 hover:bg-red-100/50 transition-colors">
                  <td className="px-4 py-2 text-sm text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-base">{cat.categoria_icono}</span>
                      <span className="font-medium">{cat.categoria_nombre}</span>
                    </div>
                  </td>
                  {proyeccion.map((p) => {
                    const detalle = p.gastos_efectivo_detalle?.find(d => d.categoria_id === cat.categoria_id);

                    if (!detalle) {
                      return (
                        <td key={p.mes} className="px-4 py-2 text-center text-gray-400 text-sm border-l border-gray-100">
                          -
                        </td>
                      );
                    }

                    const key = `efectivo_${detalle.categoria_id}-${p.anio}-${p.mes_numero}`;
                    const valorActual = cambiosPendientes[key] ?? detalle.monto;
                    const tieneOverride = detalle.tiene_override || cambiosPendientes[key] !== undefined;

                    return (
                      <td key={p.mes} className="px-2 py-2 text-center border-l border-gray-100">
                        {p.es_futuro ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                            <input
                              type="text"
                              value={valorActual.toLocaleString('es-CL')}
                              onChange={(e) => {
                                const numero = Number(e.target.value.replace(/\D/g, ''));
                                handleCambioLocal('efectivo', `${detalle.categoria_id}-${p.anio}-${p.mes_numero}`, numero);
                              }}
                              className={`w-full pl-5 pr-2 py-1 border-2 rounded text-right text-xs font-medium transition-all ${tieneOverride
                                  ? 'border-yellow-500 bg-yellow-100 text-yellow-700'
                                  : 'border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                                }`}
                            />
                          </div>
                        ) : (
                          <span className={`text-sm font-semibold ${tieneOverride ? 'text-yellow-600' : 'text-red-600'}`}>
                            {formatearMoneda(valorActual)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}


              {/* Saldo Final */}
              <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-blue-100 font-bold">
                <td className="px-4 py-4 sticky left-0 bg-gradient-to-r from-blue-50 to-blue-100 z-10 border-r-2 border-gray-300 text-gray-800">
                  💵 Saldo Final
                </td>
                {proyeccion.map((p) => (
                  <td
                    key={p.mes}
                    className={`px-4 py-4 text-center text-lg font-bold border-l border-gray-200 ${p.saldo_final_con_efectivo < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                  >
                    {formatearMoneda(p.saldo_final_con_efectivo)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Botón Actualizar Tabla (abajo) */}
      {hayCambiosPendientes && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={guardarTodosCambios}
            disabled={guardando}
            className="px-8 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2 font-bold text-lg disabled:opacity-50 shadow-lg transition-colors"
          >
            <Save className="w-5 h-5" />
            {guardando ? 'Guardando...' : 'Actualizar Tabla'}
          </button>
        </div>
      )}
    </div>
  );
}
