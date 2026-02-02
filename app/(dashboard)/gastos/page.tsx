"use client";

import { useEffect, useState, Fragment } from "react";
import { formatCurrency, formatNombrePeriodo } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function GastosPage() {
  const [saldoFondos, setSaldoFondos] = useState<number>(0);
  const [gastos, setGastos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>("actual");
  const [provisionTotal, setProvisionTotal] = useState<number>(0);
  const [resumenProvisiones, setResumenProvisiones] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proximoPago, setProximoPago] = useState<any>(null);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [gastoEditar, setGastoEditar] = useState<any>(null);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [verSoloTarjeta, setVerSoloTarjeta] = useState(false);
  const [verSoloEfectivo, setVerSoloEfectivo] = useState(false);
  const [nuevoGasto, setNuevoGasto] = useState({
    fecha: new Date().toISOString().split("T")[0],
    descripcion: "",
    monto: "",
    categoria_id: "",
    metodo_pago: "efectivo",
    pagado: false,
    cuotas: 1,
  });
  const [modalDuplicados, setModalDuplicados] = useState(false);
  const [duplicados, setDuplicados] = useState<{[key: string]: any[]}>({});
  const [gruposExpandidos, setGruposExpandidos] = useState<{[key: string]: boolean}>({});
  const [editandoGasto, setEditandoGasto] = useState<{[key: number]: {fecha: string, monto: string, descripcion: string}}>({});

  useEffect(() => {
    cargarPeriodos();
    cargarCategorias();
    cargarProximoPago();
  }, []);

  useEffect(() => {
    if (periodos.length > 0) {
      cargarGastos();
      cargarProvisionTotal();
      cargarSaldoFondos();
    }
  }, [periodoSeleccionado, periodos]);

  const cargarPeriodos = async () => {
    try {
      const response = await fetch("/api/periodos/listado");
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setPeriodos(result.data);
      } else {
        cargarGastos();
      }
    } catch (error) {
      console.error("Error:", error);
      cargarGastos();
    }
  };

  const cargarGastos = async () => {
  setLoading(true);
  try {
    let url = "/api/gastos";

    if (periodos.length > 0 && periodoSeleccionado !== "todos") {

        let periodoActivo;

        if (periodoSeleccionado === "actual") {
          periodoActivo = periodos[0];
        } else {
          periodoActivo = periodos.find(
            (p) => `${p.mes}-${p.anio}` === periodoSeleccionado
          );
        }

        if (periodoActivo) {
          url = `/api/gastos?fecha_inicio=${periodoActivo.fecha_inicio}&fecha_fin=${periodoActivo.fecha_fin}`;
        }
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) setGastos(result.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarCategorias = async () => {
    try {
      const response = await fetch("/api/categorias");
      const result = await response.json();
      if (result.success) setCategorias(result.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const cargarProvisionTotal = async () => {
    try {
      let mes, anio;

      if (periodos.length > 0) {
        const periodoActivo =
          periodoSeleccionado === "actual"
            ? periodos[0]
            : periodos.find((p) => `${p.mes}-${p.anio}` === periodoSeleccionado);

        if (periodoActivo) {
          mes = periodoActivo.mes;
          anio = periodoActivo.anio;
        }
      }

      if (!mes || !anio) {
        console.log("No hay mes/año definido");
        return;
      }

      const response = await fetch(
        `/api/provisiones/resumen?mes=${mes}&anio=${anio}`
      );
      const result = await response.json();

      if (result.success) {
        setProvisionTotal(result.resumen.total_provisionado);
        setResumenProvisiones(result);
      } else {
        console.error("Error en resultado:", result.error);
      }
    } catch (error) {
      console.error("Error cargando provisión:", error);
    }
  };
  
  const cargarProximoPago = async () => {
    try {
      const res = await fetch('/api/fechas-pago');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const proxima = data.data
          .map((fp: any) => ({
            ...fp,
            fechaDate: new Date(fp.fecha_pago + 'T00:00:00'),
          }))
          .filter((fp: any) => fp.fechaDate >= hoy)
          .sort((a: any, b: any) => a.fechaDate.getTime() - b.fechaDate.getTime())[0];

        if (proxima) {
          const dias = Math.ceil((proxima.fechaDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          setProximoPago({
            fecha: proxima.fechaDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }),
            dias: dias,
          });
        }
      }
    } catch (error) {
      console.error('Error cargando próximo pago:', error);
    }
  };

  const cargarSaldoFondos = async () => {
    try {
      const response = await fetch("/api/fondos");
      const result = await response.json();
      if (result.success && result.resumen) {
        setSaldoFondos(result.resumen.saldo_liquido);
      }
    } catch (error) {
      console.error("Error cargando fondos:", error);
    }
  };

  const agregarGasto = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nuevoGasto,
          monto: parseFloat(nuevoGasto.monto),
          categoria_id: nuevoGasto.categoria_id || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Gasto agregado");
        setModalAgregar(false);
        setNuevoGasto({
          fecha: new Date().toISOString().split("T")[0],
          descripcion: "",
          monto: "",
          categoria_id: "",
          metodo_pago: "efectivo",
          pagado: false,
          cuotas: 1,
        });
        cargarGastos();
        cargarProvisionTotal();
        cargarSaldoFondos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al agregar gasto");
    }
  };

  const abrirModalEditar = (gasto: any) => {
    setGastoEditar({
      ...gasto,
      fecha: gasto.fecha.split("T")[0],
      categoria_id: gasto.categoria_id || "",
    });
    setModalEditar(true);
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/gastos/${gastoEditar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: gastoEditar.fecha,
          descripcion: gastoEditar.descripcion,
          monto: parseFloat(gastoEditar.monto),
          categoria_id: gastoEditar.categoria_id || null,
          metodo_pago: gastoEditar.metodo_pago,
          pagado: gastoEditar.pagado,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Gasto actualizado");
        setModalEditar(false);
        cargarGastos();
        cargarProvisionTotal();
        cargarSaldoFondos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al actualizar gasto");
    }
  };

  const togglePagado = async (id: number, pagadoActual: boolean) => {
    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagado: !pagadoActual }),
      });

      const result = await response.json();

      if (result.success) {
        cargarGastos();
        cargarProvisionTotal();
        cargarSaldoFondos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al actualizar estado");
    }
  };

  const eliminarGasto = async (id: number, descripcion: string) => {
    if (!confirm(`¿Seguro que deseas eliminar el gasto "${descripcion}"?`))
      return;

    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Gasto eliminado");
        cargarGastos();
        cargarProvisionTotal();
        cargarSaldoFondos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al eliminar gasto");
    }
  };

  const detectarDuplicados = () => {
    if (!periodos.length || periodoSeleccionado === "todos") {
      alert("⚠️ Selecciona un período específico para detectar duplicados");
      return;
    }

    const gastosDelPeriodo = gastos;
    const grupos: {[key: string]: any[]} = {};

    gastosDelPeriodo.forEach(gasto => {
      const descripcionNormalizada = (gasto.descripcion || "").toLowerCase().trim();
      if (!grupos[descripcionNormalizada]) {
        grupos[descripcionNormalizada] = [];
      }
      grupos[descripcionNormalizada].push(gasto);
    });

    const soloConDuplicados = Object.fromEntries(
      Object.entries(grupos).filter(([_, items]) => items.length > 1)
    );

    if (Object.keys(soloConDuplicados).length === 0) {
      alert("✅ No se encontraron duplicados en este período");
      return;
    }

    setDuplicados(soloConDuplicados);
    setModalDuplicados(true);
  };

  const toggleGrupo = (descripcion: string) => {
    setGruposExpandidos(prev => ({
      ...prev,
      [descripcion]: !prev[descripcion]
    }));
  };

  const iniciarEdicion = (gastoId: number, gasto: any) => {
    setEditandoGasto(prev => ({
      ...prev,
      [gastoId]: {
        fecha: gasto.fecha.split('T')[0],
        monto: gasto.monto.toString(),
        descripcion: gasto.descripcion
      }
    }));
  };

  const cancelarEdicion = (gastoId: number) => {
    setEditandoGasto(prev => {
      const nuevo = {...prev};
      delete nuevo[gastoId];
      return nuevo;
    });
  };

  const guardarEdicionInline = async (gastoId: number) => {
    const datos = editandoGasto[gastoId];
    if (!datos) return;

    try {
      const response = await fetch(`/api/gastos/${gastoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: datos.fecha,
          descripcion: datos.descripcion,
          monto: parseFloat(datos.monto),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Gasto actualizado");
        cancelarEdicion(gastoId);
        cargarGastos();
        detectarDuplicados();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al actualizar gasto");
    }
  };

  const eliminarGastoInline = async (id: number, descripcion: string) => {
    if (!confirm(`¿Eliminar "${descripcion}"?`)) return;

    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Gasto eliminado");
        cargarGastos();
        detectarDuplicados();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al eliminar gasto");
    }
  };

  const gastosFiltrados = gastos
    .filter((gasto) => {
      if (filtroCategoria && gasto.categoria_id !== parseInt(filtroCategoria))
        return false;
      if (filtroEstado === "pagados" && !gasto.pagado) return false;
      if (filtroEstado === "pendientes" && gasto.pagado) return false;

      if (verSoloTarjeta && gasto.metodo_pago !== "tarjeta") return false;
      if (verSoloEfectivo && gasto.metodo_pago !== "efectivo") return false;

      return true;
    })
    .sort((a, b) => {
      if (a.pagado !== b.pagado) {
        return a.pagado ? 1 : -1;
      }
      if (!a.pagado && !b.pagado) {
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      }
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

  const pendientesEfectivo = gastosFiltrados.filter(
    (g) => !g.pagado && g.metodo_pago === "efectivo"
  );
  const pendientesTarjeta = gastosFiltrados.filter(
    (g) => !g.pagado && g.metodo_pago === "tarjeta"
  );
  const gastosPagados = gastosFiltrados.filter((g) => g.pagado);

  const totalPendienteEfectivo = pendientesEfectivo.reduce(
    (sum, g) => sum + Number(g.monto),
    0
  );
  const totalPendienteTarjeta = pendientesTarjeta.reduce(
    (sum, g) => sum + Number(g.monto),
    0
  );

  const periodoActivo =
    periodoSeleccionado === "actual"
      ? periodos[0]
      : periodos.find((p) => `${p.mes}-${p.anio}` === periodoSeleccionado);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">💳 Gastos</h1>
          {periodoActivo && (
                          <div className="flex items-center gap-3 flex-wrap mt-1">
                <p className="text-sm text-gray-600">
                  {formatNombrePeriodo(periodoActivo.mes, periodoActivo.anio)}
                </p>
                {proximoPago && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-semibold border border-yellow-300">
                    📅 Próximo sueldo: {proximoPago.fecha}
                    {proximoPago.dias === 0 ? ' (hoy)' : ` (faltan ${proximoPago.dias} día${proximoPago.dias > 1 ? 's' : ''})`}
                  </span>
                )}
              </div>

          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={detectarDuplicados} variant="outline">
            🔍 Detectar Duplicados
          </Button>
          <Button onClick={() => setModalAgregar(true)}>+ Nuevo Gasto</Button>
        </div>
      </div>

      {/* Resumen en Fichas */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Provisión Total */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow">
            <p className="text-xs opacity-90 mb-2">💰 Provisión Total</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                resumenProvisiones?.resumen.total_provisionado || 0
              )}
            </p>

            {resumenProvisiones && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>
                    Usado:{" "}
                    {resumenProvisiones.resumen.porcentaje_usado.toFixed(1)}%
                  </span>
                  <span>
                    {formatCurrency(
                      resumenProvisiones.resumen.total_gastado
                    )}
                  </span>
                </div>
                <div className="w-full bg-purple-300/30 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${resumenProvisiones.resumen.porcentaje_usado > 90
                      ? "bg-red-300"
                      : resumenProvisiones.resumen.porcentaje_usado > 70
                        ? "bg-yellow-300"
                        : "bg-green-300"
                      }`}
                    style={{
                      width: `${Math.min(
                        resumenProvisiones.resumen.porcentaje_usado,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ficha TC */}
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-4 rounded-lg shadow">
            <p className="text-xs opacity-90 mb-1">💳 Tarjeta de Crédito</p>
            <div className="flex justify-between items-end gap-4">
              <div>
                <p className="text-xs opacity-75">Gastado TC</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    resumenProvisiones?.resumen.tc_total_gastado || 0
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-75">Por Pagar (Efec.)</p>
                <p className="text-xl font-bold text-yellow-100">
                  {formatCurrency(
                    resumenProvisiones?.resumen.tc_por_pagar || 0
                  )}
                </p>
              </div>
            </div>

            {(resumenProvisiones?.resumen.tc_por_pagar || 0) !== 0 && (
              <button
                onClick={() => {
                  setNuevoGasto({
                    ...nuevoGasto,
                    descripcion: "TC Itau pago",
                    monto: (
                      resumenProvisiones?.resumen.tc_por_pagar || 0
                    ).toString(),
                    metodo_pago: "efectivo",
                    pagado: true,
                  });
                  setModalAgregar(true);
                }}
                className="mt-2 w-full bg-white/20 hover:bg-white/30 text-xs py-1 rounded text-white transition-colors"
              >
                💸 Registrar Pago TC
              </button>
            )}
          </div>

          {/* Pendientes */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow">
            <p className="text-xs opacity-90 mb-1">⏳ Pendientes de Pago</p>
            <div className="flex justify-between items-end gap-4">
              <div>
                <p className="text-xs opacity-75">Efectivo</p>
                <p className="text-lg font-bold">
                  {formatCurrency(totalPendienteEfectivo)}
                </p>
                <p className="text-xs opacity-75 mt-0.5">
                  {pendientesEfectivo.length} sin pagar
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-75">Tarjeta</p>
                <p className="text-xl font-bold text-yellow-100">
                  {formatCurrency(totalPendienteTarjeta)}
                </p>
                <p className="text-xs opacity-75 mt-0.5">
                  {pendientesTarjeta.length} sin pagar
                </p>
              </div>
            </div>
          </div>

          {/* Saldo Fondos */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow">
            <p className="text-xs opacity-90">💰 Saldo Fondos</p>
            <p className="text-2xl md:text-3xl font-bold">
              {formatCurrency(saldoFondos)}
            </p>
            <p className="text-xs opacity-75 mt-1">Efectivo disponible</p>
          </div>
        </div>

        {/* Fichas de Presupuestos Variables */}
        {resumenProvisiones?.detalles &&
          resumenProvisiones.detalles.filter(
            (d: any) => d.tipo === "presupuesto"
          ).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {resumenProvisiones.detalles
                .filter((d: any) => d.tipo === "presupuesto")
                .map((detalle: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white border-2 border-blue-200 p-3 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-700">
                        {detalle.icono} {detalle.nombre}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${detalle.saldo >= 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                          }`}
                      >
                        {detalle.saldo >= 0 ? "✓" : "⚠"}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(detalle.gastado)}
                      </span>
                      <span className="text-xs text-gray-500">
                        / {formatCurrency(detalle.provisionado)}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                      <div
                        className={`h-1.5 rounded-full transition-all ${detalle.porcentaje > 100
                          ? "bg-red-500"
                          : detalle.porcentaje > 80
                            ? "bg-yellow-500"
                            : "bg-green-500"
                          }`}
                        style={{
                          width: `${Math.min(detalle.porcentaje, 100)}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs text-gray-600">
                      {detalle.saldo >= 0
                        ? `Quedan ${formatCurrency(detalle.saldo)}`
                        : `Excedido en ${formatCurrency(
                          Math.abs(detalle.saldo)
                        )}`}
                    </p>
                  </div>
                ))}
            </div>
          )}
      </div>

      {/* Filtros + Selector de Período */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {periodos.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Período</label>
              <select
  value={periodoSeleccionado}
  onChange={(e) => setPeriodoSeleccionado(e.target.value)}
  className="w-full border rounded px-3 py-2"
>
  <option value="todos">📊 Todos los Gastos</option>
  <option value="actual">📅 Período Actual</option>
  {periodos.length > 1 && (

                  <optgroup label="Períodos Anteriores">
                    {periodos.slice(1).map((periodo) => (
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
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todas</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icono} {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="todos">Todos ({gastos.length})</option>
              <option value="pendientes">
                Pendientes ({gastos.filter((g) => !g.pagado).length})
              </option>
              <option value="pagados">
                Pagados ({gastos.filter((g) => g.pagado).length})
              </option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mt-2 md:mt-0 justify-end">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="verSoloTarjeta"
                checked={verSoloTarjeta}
                onChange={(e) => {
                  setVerSoloTarjeta(e.target.checked);
                  if (e.target.checked) setVerSoloEfectivo(false);
                }}
                className="w-4 h-4"
              />
              <label htmlFor="verSoloTarjeta" className="text-sm">
                Ver solo gastos tarjeta
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="verSoloEfectivo"
                checked={verSoloEfectivo}
                onChange={(e) => {
                  setVerSoloEfectivo(e.target.checked);
                  if (e.target.checked) setVerSoloTarjeta(false);
                }}
                className="w-4 h-4"
              />
              <label htmlFor="verSoloEfectivo" className="text-sm">
                Ver solo gastos en efectivo
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de categoría filtrada */}
      {filtroCategoria && !loading && (
        <div className="bg-blue-50 border-2 border-blue-200 text-blue-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-base">
                {categorias.find(c => String(c.id) === String(filtroCategoria))?.icono}{' '}
                {categorias.find(c => String(c.id) === String(filtroCategoria))?.nombre || "Categoría"}
              </p>
              <p className="text-sm text-blue-600 mt-0.5">Resumen de gastos filtrados</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {formatCurrency(gastosFiltrados.reduce((sum, g) => sum + Number(g.monto), 0))}
              </p>
              <p className="text-sm text-blue-600">
                {gastosFiltrados.length} gasto{gastosFiltrados.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <>
          {/* Versión Desktop - Tabla */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">Fecha</th>
                  <th className="text-left p-3 font-semibold">Descripción</th>
                  <th className="text-left p-3 font-semibold">Categoría</th>
                  <th className="text-right p-3 font-semibold">Monto</th>
                  <th className="text-center p-3 font-semibold">Método</th>
                  <th className="text-center p-3 font-semibold">
                    Estado Pago
                  </th>
                  <th className="text-center p-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastosFiltrados.map((gasto) => {
                  const soloFecha = gasto.fecha?.split("T")[0] || "";
                  const [year, month, day] = soloFecha ? soloFecha.split("-") : ["", "", ""];
                  const fechaCorta = soloFecha ? `${day}/${month}` : "";

                  let diffDias = 0;
                  if (soloFecha) {
                    const hoy = new Date();
                    const fechaGasto = new Date(
                      Number(year),
                      Number(month) - 1,
                      Number(day)
                    );
                    const hoySinHora = new Date(
                      hoy.getFullYear(),
                      hoy.getMonth(),
                      hoy.getDate()
                    );
                    const diffMs = fechaGasto.getTime() - hoySinHora.getTime();
                    diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
                  }

                  const esPendiente = !gasto.pagado;
                  const esVencido = esPendiente && diffDias < 1;
                  const esPorVencer = esPendiente && diffDias >= 0 && diffDias <= 3;

                  let rowClass = "border-b ";
                  if (esVencido) {
                    rowClass += "bg-red-100 border-l-4 border-l-red-600 border-2 border-red-300";
                  } else if (esPorVencer) {
                    rowClass += "bg-yellow-100 border-l-4 border-l-yellow-500 border-2 border-yellow-300";
                  } else if (esPendiente) {
                    rowClass += "bg-gray-50";
                  } else {
                    rowClass += "hover:bg-gray-50";
                  }

                  let diasLabel = "";
                  if (soloFecha) {
                    if (diffDias === 0) diasLabel = "Hoy";
                    else if (diffDias > 0) diasLabel = `${diffDias}d`;
                    else diasLabel = `${Math.abs(diffDias)}d`;
                  }

                  const idx = gastosFiltrados.indexOf(gasto);
                  const prev = idx > 0 ? gastosFiltrados[idx - 1] : null;
                  const esInicioPagados = gasto.pagado && prev && !prev.pagado;

                  return (
                    <Fragment key={gasto.id}>
                      {esInicioPagados && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />
                          </td>
                        </tr>
                      )}
                      <tr className={rowClass}>

                        <td className="p-3">
                          <div className="font-medium">{fechaCorta}</div>
                          <div className="text-xs text-gray-600">{diasLabel}</div>
                        </td>
                        <td className="p-3 font-medium">{gasto.descripcion}</td>
                        <td className="p-3">
                          {gasto.categorias ? (
                            <span className="text-sm">
                              {gasto.categorias.icono} {gasto.categorias.nombre}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-red-600">
                          {formatCurrency(gasto.monto)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${gasto.metodo_pago === "tarjeta"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                              }`}
                          >
                            {gasto.metodo_pago}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => togglePagado(gasto.id, gasto.pagado)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${gasto.pagado
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-red-400 text-white hover:bg-red-500"
                              }`}
                          >
                            {gasto.pagado ? "✅ Pagado" : "⏳ Pendiente"}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => abrirModalEditar(gasto)}
                              className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => eliminarGasto(gasto.id, gasto.descripcion)}
                              className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Versión Mobile - Cards */}
          <div className="md:hidden space-y-3">
            {gastosFiltrados.map((gasto) => {
              const soloFecha = gasto.fecha?.split("T")[0] || "";
              const [year, month, day] = soloFecha ? soloFecha.split("-") : ["", "", ""];
              const fechaCorta = soloFecha ? `${day}/${month}` : "";

              let diffDias = 0;
              if (soloFecha) {
                const hoy = new Date();
                const fechaGasto = new Date(
                  Number(year),
                  Number(month) - 1,
                  Number(day)
                );
                const hoySinHora = new Date(
                  hoy.getFullYear(),
                  hoy.getMonth(),
                  hoy.getDate()
                );
                const diffMs = fechaGasto.getTime() - hoySinHora.getTime();
                diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
              }

              const esPendiente = !gasto.pagado;
              const esVencido = esPendiente && diffDias < 1;
              const esPorVencer = esPendiente && diffDias >= 0 && diffDias <= 3;

              let cardClass = "p-4 rounded-lg shadow ";
              if (esVencido) {
                cardClass += "bg-red-100 border-l-4 border-l-red-600 border-2 border-red-300";
              } else if (esPorVencer) {
                cardClass += "bg-yellow-100 border-l-4 border-l-yellow-500 border-2 border-yellow-300";
              } else if (esPendiente) {
                cardClass += "bg-gray-50 border border-gray-200";
              } else {
                cardClass += "bg-white";
              }

              let diasLabel = "";
              if (soloFecha) {
                if (diffDias === 0) diasLabel = "Hoy";
                else if (diffDias > 0) diasLabel = `${diffDias}d`;
                else diasLabel = `${Math.abs(diffDias)}d`;
              }

              const idx = gastosFiltrados.indexOf(gasto);
              const prev = idx > 0 ? gastosFiltrados[idx - 1] : null;
              const esInicioPagados = gasto.pagado && prev && !prev.pagado;

              return (
                <Fragment key={gasto.id}>
                  {esInicioPagados && (
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3" />
                  )}

                  <div className={cardClass}>

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-base">
                          {gasto.descripcion}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {fechaCorta}
                          </span>
                          {diasLabel && (
                            <span className="text-xs text-gray-600">
                              {diasLabel}
                            </span>
                          )}
                          {gasto.categorias && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {gasto.categorias.icono} {gasto.categorias.nombre}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${gasto.metodo_pago === "tarjeta"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                              }`}
                          >
                            {gasto.metodo_pago}
                          </span>
                        </div>
                      </div>
                      <p className="font-bold text-lg text-red-600">
                        {formatCurrency(gasto.monto)}
                      </p>
                    </div>

                    <button
                      onClick={() => togglePagado(gasto.id, gasto.pagado)}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all mb-3 ${gasto.pagado
                        ? "bg-green-500 text-white hover:bg-green-600 active:bg-green-700"
                        : "bg-red-400 text-white hover:bg-red-500 active:bg-red-600"
                        }`}
                    >
                      {gasto.pagado
                        ? "✅ Pagado - Toca para desmarcar"
                        : "⏳ Pendiente de Pago - Toca para marcar"}
                    </button>

                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() => abrirModalEditar(gasto)}
                        className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() =>
                          eliminarGasto(gasto.id, gasto.descripcion)
                        }
                        className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>

          {gastosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
              No hay gastos que coincidan con los filtros
            </div>
          )}
        </>
      )}

      {/* Modal Agregar */}
      {modalAgregar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">+ Nuevo Gasto</h2>

            <form onSubmit={agregarGasto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha *
                </label>
                <Input
                  type="date"
                  required
                  value={nuevoGasto.fecha}
                  onChange={(e) =>
                    setNuevoGasto({ ...nuevoGasto, fecha: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Descripción *
                </label>
                <Input
                  type="text"
                  required
                  value={nuevoGasto.descripcion}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      descripcion: e.target.value,
                    })
                  }
                  placeholder="Ej: Supermercado, Combustible, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Monto *
                </label>
                <Input
                  type="number"
                  required
                  value={nuevoGasto.monto}
                  onChange={(e) =>
                    setNuevoGasto({ ...nuevoGasto, monto: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cuotas</label>
                <select
                  value={nuevoGasto.cuotas}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      cuotas: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value={1}>Sin cuotas (pago único)</option>
                  <option value={2}>2 cuotas</option>
                  <option value={3}>3 cuotas</option>
                  <option value={4}>4 cuotas</option>
                  <option value={5}>5 cuotas</option>
                  <option value={6}>6 cuotas</option>
                  <option value={7}>7 cuotas</option>
                  <option value={8}>8 cuotas</option>
                  <option value={9}>9 cuotas</option>
                  <option value={10}>10 cuotas</option>
                  <option value={11}>11 cuotas</option>
                  <option value={12}>12 cuotas</option>
                  <option value={18}>18 cuotas</option>
                  <option value={24}>24 cuotas</option>
                </select>
                {nuevoGasto.cuotas > 1 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Se crearán {nuevoGasto.cuotas} cuotas de{" "}
                    {formatCurrency(
                      parseFloat(nuevoGasto.monto || "0") / nuevoGasto.cuotas
                    )}{" "}
                    cada una
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Categoría
                </label>
                <select
                  value={nuevoGasto.categoria_id}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      categoria_id: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Método de Pago *
                </label>
                <select
                  value={nuevoGasto.metodo_pago}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      metodo_pago: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={nuevoGasto.pagado}
                    onChange={(e) =>
                      setNuevoGasto({
                        ...nuevoGasto,
                        pagado: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    Marcar como pagado
                  </span>
                </label>
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
                  💾 Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && gastoEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">✏️ Editar Gasto</h2>

            <form onSubmit={guardarEdicion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha *
                </label>
                <Input
                  type="date"
                  required
                  value={gastoEditar.fecha}
                  onChange={(e) =>
                    setGastoEditar({
                      ...gastoEditar,
                      fecha: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Descripción *
                </label>
                <Input
                  type="text"
                  required
                  value={gastoEditar.descripcion}
                  onChange={(e) =>
                    setGastoEditar({
                      ...gastoEditar,
                      descripcion: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Monto *
                </label>
                <Input
                  type="number"
                  required
                  value={gastoEditar.monto}
                  onChange={(e) =>
                    setGastoEditar({
                      ...gastoEditar,
                      monto: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Categoría
                </label>
                <select
                  value={gastoEditar.categoria_id}
                  onChange={(e) =>
                    setGastoEditar({
                      ...gastoEditar,
                      categoria_id: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Método de Pago *
                </label>
                <select
                  value={gastoEditar.metodo_pago}
                  onChange={(e) =>
                    setGastoEditar({
                      ...gastoEditar,
                      metodo_pago: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={gastoEditar.pagado}
                    onChange={(e) =>
                      setGastoEditar({
                        ...gastoEditar,
                        pagado: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Pagado</span>
                </label>
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

      {/* Modal Duplicados */}
      {modalDuplicados && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🔍 Gastos Duplicados</h2>
              <button
                onClick={() => setModalDuplicados(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {Object.keys(duplicados).length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay duplicados en este período
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(duplicados).map(([descripcion, items]) => (
                  <div key={descripcion} className="border rounded-lg">
                    {/* Cabecera del grupo */}
                    <button
                      onClick={() => toggleGrupo(descripcion)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {gruposExpandidos[descripcion] ? "▼" : "▶"}
                        </span>
                        <div className="text-left">
                          <p className="font-semibold">{items[0].descripcion}</p>
                          <p className="text-xs text-gray-600">
                            {items.length} coincidencias • Total: {formatCurrency(items.reduce((sum, g) => sum + Number(g.monto), 0))}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Filas expandidas */}
                    {gruposExpandidos[descripcion] && (
                      <div className="p-3 space-y-2">
                        {items.map((gasto) => {
                          const estaEditando = !!editandoGasto[gasto.id];
                          const datosEdicion = editandoGasto[gasto.id];

                          return (
                            <div
                              key={gasto.id}
                              className="bg-white border rounded p-3 space-y-2"
                            >
                              {estaEditando ? (
                                /* Modo edición */
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-600">Fecha</label>
                                    <input
                                      type="date"
                                      value={datosEdicion.fecha}
                                      onChange={(e) => setEditandoGasto(prev => ({
                                        ...prev,
                                        [gasto.id]: { ...prev[gasto.id], fecha: e.target.value }
                                      }))}
                                      className="w-full border rounded px-2 py-1 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Monto</label>
                                    <input
                                      type="number"
                                      value={datosEdicion.monto}
                                      onChange={(e) => setEditandoGasto(prev => ({
                                        ...prev,
                                        [gasto.id]: { ...prev[gasto.id], monto: e.target.value }
                                      }))}
                                      className="w-full border rounded px-2 py-1 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Descripción</label>
                                    <input
                                      type="text"
                                      value={datosEdicion.descripcion}
                                      onChange={(e) => setEditandoGasto(prev => ({
                                        ...prev,
                                        [gasto.id]: { ...prev[gasto.id], descripcion: e.target.value }
                                      }))}
                                      className="w-full border rounded px-2 py-1 text-sm"
                                    />
                                  </div>
                                  <div className="md:col-span-3 flex gap-2 justify-end">
                                    <button
                                      onClick={() => guardarEdicionInline(gasto.id)}
                                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                    >
                                      💾 Guardar
                                    </button>
                                    <button
                                      onClick={() => cancelarEdicion(gasto.id)}
                                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Modo vista */
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-600 text-xs">Fecha: </span>
                                      <span className="font-medium">
                                        {new Date(gasto.fecha).toLocaleDateString('es-CL')}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600 text-xs">Monto: </span>
                                      <span className="font-bold text-red-600">
                                        {formatCurrency(gasto.monto)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600 text-xs">Método: </span>
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        gasto.metodo_pago === "tarjeta"
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-green-100 text-green-700"
                                      }`}>
                                        {gasto.metodo_pago}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => iniciarEdicion(gasto.id, gasto)}
                                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => eliminarGastoInline(gasto.id, gasto.descripcion)}
                                      className="bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
