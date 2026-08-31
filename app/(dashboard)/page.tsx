"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { formatCurrency, formatNombrePeriodo, parseFechaLocal } from "@/lib/utils";
import { Wallet, CreditCard, DollarSign, Clock, TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight, BarChart3, Plus } from "lucide-react";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });

const PALETA_CATEGORIAS = ["#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4", "#F43F5E", "#84CC16"];

type FiltroFeed = "todos" | "vencimientos" | "gastos";

export default function DashboardPage() {
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroFeed>("todos");

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

  const vencimientosFeed = useMemo(() => {
    if (!datos) return [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return (datos.proximosVencimientos || []).map((p: any) => {
      const fechaVenc = parseFechaLocal(p.fecha_vencimiento);
      const dias = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      const esHoy = dias === 0;
      const esUrgente = dias <= 3;
      return {
        id: `v-${p.id}`,
        tipo: 'vencimiento' as const,
        nombre: p.gastos_fijos?.nombre || 'Sin nombre',
        monto: p.monto_provision,
        esHoy,
        esUrgente,
        subt: esHoy ? 'Vence hoy' : `En ${dias} día${dias === 1 ? '' : 's'} · ${fechaVenc.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`,
        href: `/gastos?provision_id=${p.id}&gasto_fijo_id=${p.gasto_fijo_id}&nombre=${encodeURIComponent(p.gastos_fijos?.nombre || '')}&monto=${p.monto_provision}&fecha=${p.fecha_vencimiento.split('T')[0]}`,
      };
    });
  }, [datos]);

  const gastosFeed = useMemo(() => {
    if (!datos) return [];
    return (datos.ultimosGastos || []).map((g: any) => ({
      id: `g-${g.id}`,
      tipo: 'gasto' as const,
      nombre: g.descripcion,
      monto: g.monto,
      icono: g.categorias?.icono || '📦',
      subt: `${parseFechaLocal(g.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · ${g.metodo_pago} · ${g.pagado ? 'pagado' : 'pendiente'}`,
      pagado: g.pagado,
    }));
  }, [datos]);

  const feedItems = filtro === 'vencimientos' ? vencimientosFeed : filtro === 'gastos' ? gastosFeed : [...vencimientosFeed, ...gastosFeed];

  const donut = useMemo(() => {
    if (!datos) return { stops: [], total: 0, gradient: undefined as string | undefined };
    const categorias: any[] = datos.gastosPorCategoria || [];
    const total = categorias.reduce((sum, c) => sum + Number(c.total), 0);
    let acumulado = 0;
    const stops = categorias.map((c, i) => {
      const pct = total > 0 ? (c.total / total) * 100 : 0;
      const start = acumulado;
      acumulado += pct;
      return { ...c, color: PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length], pct, start, end: acumulado };
    });
    const gradient = stops.length
      ? `conic-gradient(${stops.map((s) => `${s.color} ${s.start}% ${s.end}%`).join(', ')})`
      : undefined;
    return { stops, total, gradient };
  }, [datos]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-700 mb-4"></div>
        <p className="text-gray-500">Cargando dashboard...</p>
      </div>
    );
  }

  if (!datos) {
    return <div className="text-center py-12 text-red-500">Error al cargar datos</div>;
  }

  const { resumen, periodo, proximoPago } = datos;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-neutral-900 rounded-2xl px-6 py-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-xs text-neutral-400">
            Período: {formatNombrePeriodo(periodo.mes, periodo.anio)}
            {periodo.es_provisional && (
              <span className="ml-2 bg-amber-400 text-amber-900 px-2 py-0.5 rounded text-[11px] font-semibold">Provisional</span>
            )}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`${spaceGrotesk.className} text-3xl md:text-4xl font-bold text-white`}>
              {formatCurrency(resumen.saldoTotal)}
            </span>
            <span className="text-xs text-neutral-400">saldo disponible</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400">Gastos del período: {formatCurrency(resumen.gastosMes)}</span>
            {resumen.cambioGastos !== 0 && (
              <span className={`flex items-center gap-1 font-semibold ${resumen.cambioGastos > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {resumen.cambioGastos > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {Math.abs(resumen.cambioGastos).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {proximoPago && (
          <>
            <div className="hidden md:block w-px self-stretch bg-neutral-700" />
            <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-2 md:gap-1.5">
              <span className="text-xs text-neutral-400">Próximo sueldo · {proximoPago.fecha}</span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full text-neutral-900 ${
                proximoPago.dias <= 1 ? 'bg-red-400' : proximoPago.dias <= 3 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}>
                {proximoPago.dias === 0 ? 'Hoy' : `${proximoPago.dias} día${proximoPago.dias === 1 ? '' : 's'}`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Chip strip */}
      <div className="flex flex-wrap items-center gap-3">
        <ChipStat icon={<CreditCard className="w-4 h-4" />} label="Tarjeta" valor={resumen.pendientesTarjeta?.total || 0} />
        <ChipStat icon={<Wallet className="w-4 h-4" />} label="Efectivo" valor={resumen.pendientesEfectivo?.total || 0} />
        <ChipStat icon={<Clock className="w-4 h-4" />} label="Gastos fijos" valor={resumen.totalGastosFijos} />
        <ChipStat icon={<DollarSign className="w-4 h-4" />} label="Provisiones" valor={resumen.provisionesActivas} />
        <Link
          href="/gastos"
          className="ml-auto flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo gasto
        </Link>
      </div>

      {/* Feed + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(['todos', 'vencimientos', 'gastos'] as FiltroFeed[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors capitalize ${
                  filtro === f ? 'bg-neutral-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {feedItems.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm">No hay movimientos para mostrar</p>
              </div>
            ) : (
              feedItems.map((item: any, i: number) => {
                const contenido = item.tipo === 'vencimiento' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.esHoy ? 'bg-red-50 text-red-600' : item.esUrgente ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{item.nombre}</span>
                        <span className={`text-xs font-medium ${item.esHoy ? 'text-red-600' : item.esUrgente ? 'text-amber-600' : 'text-gray-500'}`}>
                          {item.subt}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(item.monto)}</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-base">
                        {item.icono}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{item.nombre}</span>
                        <span className={`text-xs ${item.pagado ? 'text-gray-500' : 'text-amber-600 font-medium'}`}>{item.subt}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(item.monto)}</span>
                  </>
                );

                const claseFila = `flex items-center justify-between px-4 py-3 ${i !== feedItems.length - 1 ? 'border-b border-gray-100' : ''}`;

                return item.tipo === 'vencimiento' ? (
                  <Link key={item.id} href={item.href} className={`${claseFila} hover:bg-gray-50 transition-colors`}>
                    {contenido}
                  </Link>
                ) : (
                  <div key={item.id} className={claseFila}>
                    {contenido}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <span className="font-bold text-sm text-gray-900 block mb-4">Por categoría</span>
            {donut.stops.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin gastos en este período</p>
            ) : (
              <div className="flex items-center gap-5">
                <div
                  className="relative w-[100px] h-[100px] rounded-full flex-shrink-0"
                  style={{ background: donut.gradient }}
                >
                  <div className="absolute inset-[15px] rounded-full bg-white flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-900 text-center leading-tight px-1">
                      {formatCurrency(donut.total)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {donut.stops.slice(0, 5).map((s: any) => (
                    <div key={s.categoria_id || s.nombre} className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                      {s.nombre} · {s.pct.toFixed(0)}%
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/estadisticas"
            className="flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 text-sm font-semibold px-4 py-3 rounded-2xl transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Ver proyecciones
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ChipStat({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: number }) {
  return (
    <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-4 py-2">
      <span className="text-gray-500">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900">{formatCurrency(valor)}</span>
    </div>
  );
}
