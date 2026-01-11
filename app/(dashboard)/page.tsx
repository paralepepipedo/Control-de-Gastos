"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatNombrePeriodo } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertCircle, Calendar, Wallet, CreditCard, DollarSign, Clock } from "lucide-react";

export default function DashboardPage() {
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      if (result.success) {
        setDatos(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Cargando dashboard...</p>
      </div>
    );
  }

  if (!datos) {
    return <div className="text-center py-12 text-red-500">Error al cargar datos</div>;
  }

  const { resumen, proximosVencimientos, ultimosGastos, gastosPorCategoria, periodo, proximoPago, saldoFondos } = datos;

  return (
    <div className="space-y-6">
      {/* Header con Período Actual */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">💰 Control Financiero</h1>
            {periodo && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-blue-100 text-sm">
                  📅 Período: {formatNombrePeriodo(periodo.mes, periodo.anio)}
                </span>
                {periodo.es_provisional && (
                  <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-semibold">
                    ⚠️ Provisional
                  </span>
                )}
                {proximoPago && (
                  <span className="bg-green-400 text-green-900 px-3 py-1 rounded-full text-xs font-semibold">
                    💵 Próximo sueldo: {proximoPago.fecha} ({proximoPago.dias} días)
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/estadisticas"
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-sm"
            >
              📊 Proyecciones
            </Link>
            <Link
              href="/gastos"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold text-sm"
            >
              ➕ Nuevo Gasto
            </Link>
          </div>
        </div>
      </div>

      {/* Cards Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardResumen
          titulo="Saldo en Fondos"
          valor={saldoFondos?.saldo_liquido || 0}
          icono={<Wallet className="w-6 h-6" />}
          color="bg-gradient-to-br from-green-500 to-green-600"
          detalle="Efectivo disponible"
        />
        
        <CardResumen
          titulo="Gastos del Período"
          valor={resumen.gastosMes}
          icono={<CreditCard className="w-6 h-6" />}
          color="bg-gradient-to-br from-red-500 to-red-600"
          cambio={resumen.cambioGastos}
        />
        
        <CardResumen
          titulo="Provisiones Activas"
          valor={resumen.provisionesActivas}
          icono={<DollarSign className="w-6 h-6" />}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          detalle={`${resumen.provisionesTotales || 0} totales`}
        />
        
        <CardResumen
          titulo="Gastos Fijos"
          valor={resumen.totalGastosFijos}
          icono={<Clock className="w-6 h-6" />}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          detalle={`${resumen.gastosFijosActivos} activos`}
        />
      </div>

      {/* Resumen Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-1">💳 Pendientes Tarjeta</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(resumen.pendientesTarjeta || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {resumen.cantidadPendientesTarjeta || 0} pago(s) sin pagar
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 mb-1">💵 Pendientes Efectivo</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(resumen.pendientesEfectivo || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {resumen.cantidadPendientesEfectivo || 0} pago(s) sin pagar
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm text-gray-600 mb-1">⏰ Vencimientos Próximos</p>
          <p className="text-2xl font-bold text-orange-600">
            {proximosVencimientos.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            En los próximos 7 días
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Vencimientos */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold">⏰ Próximos Vencimientos</h2>
          </div>
          
          {proximosVencimientos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">✅</p>
              <p className="text-gray-500 text-sm">No hay vencimientos próximos</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {proximosVencimientos.map((provision: any) => {
                const fechaVenc = new Date(provision.fecha_vencimiento);
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const diasRestantes = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                const esUrgente = diasRestantes <= 3;
                const esHoy = diasRestantes === 0;
                
                return (
                  <Link 
                    key={provision.id} 
                    href={`/gastos?provision_id=${provision.id}&gasto_fijo_id=${provision.gasto_fijo_id}&nombre=${encodeURIComponent(provision.gastos_fijos?.nombre || '')}&monto=${provision.monto_provision}&fecha=${provision.fecha_vencimiento.split('T')[0]}`}
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      esHoy 
                        ? 'border-red-500 bg-red-50 hover:bg-red-100' 
                        : esUrgente 
                        ? 'border-orange-400 bg-orange-50 hover:bg-orange-100'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">
                          {provision.gastos_fijos?.nombre || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          📅 {fechaVenc.toLocaleDateString('es-CL', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">
                          {formatCurrency(provision.monto_provision)}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          esHoy 
                            ? 'bg-red-200 text-red-800' 
                            : esUrgente 
                            ? 'bg-orange-200 text-orange-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {esHoy ? '🚨 HOY' : `⏰ ${diasRestantes}d`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                        → Click para registrar pago
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          
          <Link 
            href="/provisiones" 
            className="block mt-4 text-center text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline"
          >
            Ver todas las provisiones →
          </Link>
        </div>

        {/* Últimos Gastos */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold">📝 Últimos Gastos</h2>
          </div>
          
          {ultimosGastos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">📭</p>
              <p className="text-gray-500 text-sm">No hay gastos registrados</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {ultimosGastos.map((gasto: any) => (
                <div 
                  key={gasto.id} 
                  className="flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{gasto.descripcion}</p>
                    <div className="flex gap-2 items-center mt-2 flex-wrap">
                      <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                        📅 {new Date(gasto.fecha).toLocaleDateString('es-CL', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                      {gasto.categorias && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                          {gasto.categorias.icono} {gasto.categorias.nombre}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        gasto.pagado 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {gasto.pagado ? '✅ Pagado' : '⏳ Pendiente'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-lg text-red-600">
                      {formatCurrency(gasto.monto)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
                      gasto.metodo_pago === 'tarjeta' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {gasto.metodo_pago === 'tarjeta' ? '💳' : '💵'} {gasto.metodo_pago}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Link 
            href="/gastos" 
            className="block mt-4 text-center text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline"
          >
            Ver todos los gastos →
          </Link>
        </div>
      </div>

      {/* Gastos por Categoría */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">📊 Gastos del Período por Categoría</h2>
        
        {gastosPorCategoria.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-2">📊</p>
            <p className="text-gray-500 text-sm">No hay gastos en este período</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gastosPorCategoria.map((cat: any) => {
              const porcentaje = resumen.gastosMes > 0 
                ? (cat.total / resumen.gastosMes) * 100 
                : 0;
              
              return (
                <div key={cat.categoria_id || 'sin-categoria'} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      <span className="text-xl mr-2">{cat.icono}</span>
                      {cat.nombre}
                    </span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="text-xs text-gray-600 ml-2">
                        ({porcentaje.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-inner"
                      style={{ width: `${porcentaje}%` }}
                    />
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

function CardResumen({ 
  titulo, 
  valor, 
  icono, 
  color, 
  cambio, 
  detalle 
}: { 
  titulo: string; 
  valor: number; 
  icono: React.ReactNode; 
  color: string; 
  cambio?: number;
  detalle?: string;
}) {
  return (
    <div className={`${color} text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm opacity-90 font-medium">{titulo}</p>
        <div className="opacity-90">{icono}</div>
      </div>
      <p className="text-3xl font-bold mb-2">{formatCurrency(valor)}</p>
      {cambio !== undefined && cambio !== 0 && (
        <div className={`flex items-center gap-1 text-xs ${
          cambio > 0 ? 'text-red-200' : 'text-green-200'
        }`}>
          {cambio > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{Math.abs(cambio).toFixed(1)}% vs anterior</span>
        </div>
      )}
      {detalle && (
        <p className="text-xs opacity-80 mt-2">{detalle}</p>
      )}
    </div>
  );
}
