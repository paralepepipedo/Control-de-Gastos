"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ResumenPage() {
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  
  const [resumen, setResumen] = useState({
    totalMes: 0,
    totalPagado: 0,
    totalPendiente: 0,
    provision: 2055294
  });

  useEffect(() => {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    setMesSeleccionado(mesActual);
  }, []);

  useEffect(() => {
    if (mesSeleccionado) {
      cargarGastos();
    }
  }, [mesSeleccionado]);

  const cargarGastos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gastos?mes=${mesSeleccionado}`);
      const result = await response.json();

      if (result.success) {
        const gastosOrdenados = result.data.sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha_vencimiento || a.fecha);
          const fechaB = new Date(b.fecha_vencimiento || b.fecha);
          return fechaA.getTime() - fechaB.getTime();
        });
        
        setGastos(gastosOrdenados);
        calcularResumen(gastosOrdenados);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularResumen = (gastos: any[]) => {
    const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
    const pagado = gastos.filter(g => g.estado === 'pagado').reduce((sum, g) => sum + Number(g.monto), 0);
    const pendiente = gastos.filter(g => g.estado === 'pendiente').reduce((sum, g) => sum + Number(g.monto), 0);
    
    setResumen({
      totalMes: total,
      totalPagado: pagado,
      totalPendiente: pendiente,
      provision: 2055294
    });
  };

  const agruparPorFecha = () => {
    const grupos: { [key: string]: any[] } = {};
    
    gastos.forEach(gasto => {
      const fecha = gasto.fecha_vencimiento || gasto.fecha;
      const dia = new Date(fecha).getDate();
      const key = `${dia}`;
      
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(gasto);
    });

    return Object.entries(grupos).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  };

  const getDiasRestantes = (fecha: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fecha);
    vencimiento.setHours(0, 0, 0, 0);
    return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const porcentajeGastado = Math.round((resumen.totalPagado / resumen.provision) * 100);
  const porcentajePendiente = Math.round((resumen.totalPendiente / resumen.provision) * 100);
  const saldoDisponible = resumen.provision - resumen.totalMes;

  const gruposGastos = agruparPorFecha();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📊 Resumen Mensual</h1>
        <input
          type="month"
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* Resumen Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
          <p className="text-sm opacity-90">Provisión</p>
          <p className="text-3xl font-bold">{formatCurrency(resumen.provision)}</p>
          <p className="text-xs opacity-75 mt-1">Presupuesto mensual</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
          <p className="text-sm opacity-90">Pagado</p>
          <p className="text-3xl font-bold">{formatCurrency(resumen.totalPagado)}</p>
          <p className="text-xs opacity-75 mt-1">{porcentajeGastado}% de la provisión</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow">
          <p className="text-sm opacity-90">Por Pagar</p>
          <p className="text-3xl font-bold">{formatCurrency(resumen.totalPendiente)}</p>
          <p className="text-xs opacity-75 mt-1">{porcentajePendiente}% de la provisión</p>
        </div>

        <div className={`bg-gradient-to-br ${saldoDisponible >= 0 ? 'from-purple-500 to-purple-600' : 'from-red-500 to-red-600'} text-white p-6 rounded-lg shadow`}>
          <p className="text-sm opacity-90">Saldo Proyectado</p>
          <p className="text-3xl font-bold">{formatCurrency(saldoDisponible)}</p>
          <p className="text-xs opacity-75 mt-1">{saldoDisponible >= 0 ? '✓ En presupuesto' : '⚠ Sobregiro'}</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold mb-3">Uso del Presupuesto</h3>
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute h-full bg-green-500 transition-all"
            style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
          />
          <div 
            className="absolute h-full bg-orange-400 transition-all"
            style={{ left: `${Math.min(porcentajeGastado, 100)}%`, width: `${Math.min(porcentajePendiente, 100 - porcentajeGastado)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
            {porcentajeGastado + porcentajePendiente}% comprometido
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>🟢 Pagado: {porcentajeGastado}%</span>
          <span>🟠 Pendiente: {porcentajePendiente}%</span>
          <span>⚪ Disponible: {100 - porcentajeGastado - porcentajePendiente}%</span>
        </div>
      </div>

      {/* Gastos agrupados por día */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold text-xl mb-4">Calendario de Pagos</h3>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : gruposGastos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay gastos este mes</div>
        ) : (
          <div className="space-y-4">
            {gruposGastos.map(([dia, gastosDelDia]) => {
              const totalDia = gastosDelDia.reduce((sum, g) => sum + Number(g.monto), 0);
              const todoPagado = gastosDelDia.every(g => g.estado === 'pagado');
              const primerGasto = gastosDelDia[0];
              const fechaCompleta = primerGasto.fecha_vencimiento || primerGasto.fecha;
              const diasRestantes = getDiasRestantes(fechaCompleta);
              const esVencido = diasRestantes < 0 && !todoPagado;
              const esProximo = diasRestantes >= 0 && diasRestantes <= 3 && !todoPagado;

              return (
                <div 
                  key={dia}
                  className={`border rounded-lg p-4 ${
                    todoPagado ? 'bg-green-50 border-green-200' : 
                    esVencido ? 'bg-red-50 border-red-300' : 
                    esProximo ? 'bg-yellow-50 border-yellow-300' : 
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${
                        todoPagado ? 'text-green-600' : 
                        esVencido ? 'text-red-600' : 
                        esProximo ? 'text-yellow-600' : 
                        'text-gray-700'
                      }`}>
                        {dia}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-600">
                          {new Date(fechaCompleta).toLocaleDateString('es-CL', { weekday: 'long' })}
                        </p>
                        {!todoPagado && diasRestantes !== null && (
                          <p className={`text-xs font-semibold ${
                            esVencido ? 'text-red-600' : 
                            esProximo ? 'text-yellow-600' : 
                            'text-gray-500'
                          }`}>
                            {diasRestantes < 0 ? `Vencido hace ${Math.abs(diasRestantes)} días` : 
                             diasRestantes === 0 ? '¡Vence HOY!' : 
                             `Faltan ${diasRestantes} días`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(totalDia)}</p>
                      <p className="text-xs text-gray-600">{gastosDelDia.length} gasto{gastosDelDia.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {gastosDelDia.map(gasto => (
                      <div 
                        key={gasto.id}
                        className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{gasto.descripcion}</p>
                          <p className="text-xs text-gray-500">{gasto.categorias?.nombre} • {gasto.metodo_pago}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold">{formatCurrency(gasto.monto)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            gasto.estado === 'pagado' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {gasto.estado === 'pagado' ? '✓' : '⏳'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
