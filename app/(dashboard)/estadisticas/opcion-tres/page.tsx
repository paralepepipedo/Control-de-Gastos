'use client';

import { useEffect, useState, useMemo } from 'react';
import { formatearMoneda } from '../utils/proyecciones';
import { ArrowLeft, Download, RefreshCw, ChevronDown, ChevronUp, Save, Plus, Trash2, Power, Pencil } from 'lucide-react';
import Link from 'next/link';

interface GastoDetalle {
  categoria_id?: number;
  categoria_nombre?: string;
  id?: number;
  nombre?: string;
  categoria_icono?: string;
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
  gastos_efectivo_detalle: GastoDetalle[];
  gastos_fijos: number;
  gastos_fijos_detalle: GastoDetalle[];
  saldo_final_con_efectivo: number;
  es_periodo_actual: boolean;
  es_futuro: boolean;
}

interface Simulacion {
  id: string;
  descripcion: string;
  monto: number;
  cuotas: number;
  mes_inicio: number;
  anio_inicio: number;
  activa: boolean;
}

export default function OpcionTresPage() {
  const [proyeccion, setProyeccion] = useState<ProyeccionMensual[]>([]);
  const [categoriasEfectivo, setCategoriasEfectivo] = useState<any[]>([]);
  const [categoriasFijos, setCategoriasFijos] = useState<any[]>([]); // Para las provisiones
  const [loading, setLoading] = useState(true);

  const [mesesMostrar, setMesesMostrar] = useState(12);
  const [mesExpandidoEfectivo, setMesExpandidoEfectivo] = useState(false);
  const [mesExpandidoFijos, setMesExpandidoFijos] = useState(false);
  const [simulacionesExpandidas, setSimulacionesExpandidas] = useState(true);

  // Estados para la realidad del mes actual
  const [saldoFondosReal, setSaldoFondosReal] = useState<number>(0);
  const [pendientesEfectivoActual, setPendientesEfectivoActual] = useState<number>(0);
  const [pendientesProvisionesActual, setPendientesProvisionesActual] = useState<number>(0);

  const [config, setConfig] = useState<any>({});
  const [cambiosPendientes, setCambiosPendientes] = useState<any>({});
  const [guardando, setGuardando] = useState(false);

  // Estado de Simulaciones
  const [simulaciones, setSimulaciones] = useState<Simulacion[]>([]);
  const [modalSimulacion, setModalSimulacion] = useState(false);
  const [simulacionEditando, setSimulacionEditando] = useState<string | null>(null);
  const [formSimulacion, setFormSimulacion] = useState({
    descripcion: '',
    monto: '',
    cuotas: 12,
    mes_inicio: new Date().getMonth() + 1,
    anio_inicio: new Date().getFullYear(),
  });

  useEffect(() => {
    cargarDatosRealesActuales().then(() => {
      cargarProyeccion();
    });
    cargarSimulacionesDB();
  }, [mesesMostrar]);

  // Carga tu dinero actual y lo que falta por pagar este mes (Efectivo y Tarjetas)
  const cargarDatosRealesActuales = async () => {
    try {
      const resF = await fetch("/api/fondos");
      const dataF = await resF.json();
      if (dataF.success && dataF.resumen) {
        setSaldoFondosReal(dataF.resumen.saldo_liquido);
      }

      const hoy = new Date();
      const mesHoy = hoy.getMonth() + 1;
      const anioHoy = hoy.getFullYear();

      const resP = await fetch('/api/periodos/listado');
      const dataP = await resP.json();
      const periodoActual = dataP.data?.find((p: any) => p.mes === mesHoy && p.anio === anioHoy);

      let urlGastos = '/api/gastos';
      if (periodoActual) {
        urlGastos += `?fecha_inicio=${periodoActual.fecha_inicio}&fecha_fin=${periodoActual.fecha_fin}`;
      }

      const resG = await fetch(urlGastos);
      const dataG = await resG.json();

      if (dataG.success) {
        let pEfectivo = 0;
        let pProvisiones = 0;
        dataG.data.forEach((g: any) => {
          if (!g.pagado) {
            if (g.metodo_pago === 'efectivo') {
              pEfectivo += Number(g.monto);
            } else {
              // Todo lo que no sea efectivo, lo sumamos como provisión/tarjeta pendiente
              pProvisiones += Number(g.monto);
            }
          }
        });
        setPendientesEfectivoActual(pEfectivo);
        setPendientesProvisionesActual(pProvisiones);
      }
    } catch (error) {
      console.error("Error cargando datos reales:", error);
    }
  };

  // Carga Base de Proyección
  const cargarProyeccion = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estadisticas/proyectar?meses=60&t=${Date.now()}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      const hoy = new Date();
      const mesHoy = hoy.getMonth() + 1;
      const anioHoy = hoy.getFullYear();

      let indexInicio = data.proyeccion.findIndex((p: any) => p.anio === anioHoy && p.mes_numero === mesHoy);
      if (indexInicio === -1) indexInicio = 0;

      const proyeccionBruta = data.proyeccion.slice(indexInicio, indexInicio + mesesMostrar);

      // Normalizador para comparar nombres sin tildes ni mayúsculas
      const normalizar = (str: string) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

      // Filtro estricto: Si el gasto ya existe en efectivo, se elimina de tarjetas para no mezclar
      const proyeccionFiltrada = proyeccionBruta.map((p: any) => {
        const nombresEfectivo = p.gastos_efectivo_detalle?.map((d: any) => normalizar(d.categoria_nombre)) || [];

        const fijosLimpios = p.gastos_fijos_detalle?.filter((f: any) => {
          const nombreFijo = normalizar(f.nombre);
          const estaEnEfectivo = nombresEfectivo.some((ne: string) =>
            ne === nombreFijo || ne.includes(nombreFijo) || nombreFijo.includes(ne)
          );
          return !estaEnEfectivo; // Si está en efectivo, se bloquea de tarjetas
        }) || [];

        return { ...p, gastos_fijos_detalle: fijosLimpios };
      });

      setProyeccion(proyeccionFiltrada);

      // Agrupar categorías únicas para Efectivo y Fijos(Provisiones)
      const mapEfectivo = new Map();
      const mapFijos = new Map();

      proyeccionFiltrada.forEach((p: ProyeccionMensual) => {
        p.gastos_efectivo_detalle?.forEach((detalle: any) => {
          if (!mapEfectivo.has(detalle.categoria_id)) {
            mapEfectivo.set(detalle.categoria_id, {
              categoria_id: detalle.categoria_id,
              categoria_nombre: detalle.categoria_nombre,
              categoria_icono: detalle.categoria_icono,
            });
          }
        });
        p.gastos_fijos_detalle?.forEach((detalle: any) => {
          // Fijos usa "id" y "nombre"
          if (!mapFijos.has(detalle.id)) {
            mapFijos.set(detalle.id, {
              categoria_id: detalle.id,
              categoria_nombre: detalle.nombre,
              categoria_icono: '💳',
            });
          }
        });
      });

      setCategoriasEfectivo(Array.from(mapEfectivo.values()));
      setCategoriasFijos(Array.from(mapFijos.values()));
      setConfig(data.config || {});
      setCambiosPendientes({});
    } catch (error) {
      console.error('Error cargando proyección:', error);
      alert('Error de conexión al cargar la proyección');
    } finally {
      setLoading(false);
    }
  };

  // Gestión de Simulaciones (Usamos try-catch porque la API config puede dar 404, pero localStorage respalda)
  const cargarSimulacionesDB = async () => {
    try {
      const res = await fetch('/api/config?clave=proyecciones_guardadas');
      if (!res.ok) throw new Error('API config no disponible, usando local');
      const data = await res.json();
      if (data.success && data.data?.valor_text) {
        setSimulaciones(JSON.parse(data.data.valor_text));
      } else {
        throw new Error('Sin datos en API');
      }
    } catch (error) {
      const local = localStorage.getItem('simulaciones_locales');
      if (local) setSimulaciones(JSON.parse(local));
    }
  };

  const guardarSimulacionesDB = async (nuevas: Simulacion[]) => {
    localStorage.setItem('simulaciones_locales', JSON.stringify(nuevas));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave: 'proyecciones_guardadas',
          valor_text: JSON.stringify(nuevas),
          descripcion: 'Simulaciones de proyección (JSON)',
        }),
      });
    } catch (error) {
      console.log('Respaldo de simulaciones en localStorage (API no activa).');
    }
  };

  const guardarNuevaSimulacion = (e: React.FormEvent) => {
    e.preventDefault();
    let actualizadas;

    if (simulacionEditando) {
      actualizadas = simulaciones.map(s =>
        s.id === simulacionEditando
          ? { ...s, descripcion: formSimulacion.descripcion, monto: Number(formSimulacion.monto), cuotas: formSimulacion.cuotas, mes_inicio: formSimulacion.mes_inicio, anio_inicio: formSimulacion.anio_inicio }
          : s
      );
    } else {
      const nueva: Simulacion = {
        id: Date.now().toString(),
        descripcion: formSimulacion.descripcion,
        monto: Number(formSimulacion.monto),
        cuotas: formSimulacion.cuotas,
        mes_inicio: formSimulacion.mes_inicio,
        anio_inicio: formSimulacion.anio_inicio,
        activa: true,
      };
      actualizadas = [...simulaciones, nueva];
    }

    setSimulaciones(actualizadas);
    guardarSimulacionesDB(actualizadas);
    setModalSimulacion(false);
    setSimulacionEditando(null);
    setFormSimulacion({ descripcion: '', monto: '', cuotas: 12, mes_inicio: new Date().getMonth() + 1, anio_inicio: new Date().getFullYear() });
  };

  const abrirModalEdicion = (sim: Simulacion) => {
    setSimulacionEditando(sim.id);
    setFormSimulacion({
      descripcion: sim.descripcion,
      monto: sim.monto.toString(),
      cuotas: sim.cuotas,
      mes_inicio: sim.mes_inicio,
      anio_inicio: sim.anio_inicio,
    });
    setModalSimulacion(true);
  };

  const abrirModalNueva = () => {
    setSimulacionEditando(null);
    setFormSimulacion({ descripcion: '', monto: '', cuotas: 12, mes_inicio: new Date().getMonth() + 1, anio_inicio: new Date().getFullYear() });
    setModalSimulacion(true);
  };

  const toggleSimulacion = (id: string) => {
    const actualizadas = simulaciones.map(s => s.id === id ? { ...s, activa: !s.activa } : s);
    setSimulaciones(actualizadas);
    guardarSimulacionesDB(actualizadas);
  };

  const eliminarSimulacion = (id: string) => {
    if (!confirm("¿Eliminar esta simulación?")) return;
    const actualizadas = simulaciones.filter(s => s.id !== id);
    setSimulaciones(actualizadas);
    guardarSimulacionesDB(actualizadas);
  };

  // Motor de Cálculo Dinámico en Cascada
  const proyeccionCalculada = useMemo(() => {
    if (!proyeccion.length) return [];

    // Inicia con tu saldo líquido real de hoy
    let saldoAcumulado = saldoFondosReal;

    return proyeccion.map((p, index) => {
      // Formatear mes a español (Ej: Ago 2026)
      const fechaMes = new Date(p.anio, p.mes_numero - 1);
      const mesEspanol = fechaMes.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }).replace('.', '');
      const mesNombreCapitalizado = mesEspanol.charAt(0).toUpperCase() + mesEspanol.slice(1);

      const keySueldo = `sueldo_${p.anio}-${p.mes_numero}`;
      let ingresoFinal = cambiosPendientes[keySueldo] ?? p.ingresos;
      let gastoEfectivoTotal = 0;
      let gastoProvisionesTotal = 0;

      if (index === 0) {
        // MES 1 (Actual): Sueldo 0, descontamos pendientes de efectivo y provisiones reales
        ingresoFinal = 0;
        gastoEfectivoTotal = pendientesEfectivoActual;
        gastoProvisionesTotal = pendientesProvisionesActual;
      } else {
        // MESES FUTUROS: Sueldo normal, descontamos proyección de efectivo y fijos(provisiones)
        p.gastos_efectivo_detalle?.forEach((d: any) => {
          const keyEf = `efectivo_${d.categoria_id}-${p.anio}-${p.mes_numero}`;
          gastoEfectivoTotal += (cambiosPendientes[keyEf] ?? d.monto);
        });

        p.gastos_fijos_detalle?.forEach((d: any) => {
          const keyFijo = `fijo_${d.id}-${p.anio}-${p.mes_numero}`;
          gastoProvisionesTotal += (cambiosPendientes[keyFijo] ?? d.monto);
        });
      }

      // Gastos de Simulación
      let simulacionTotalMes = 0;
      simulaciones.filter(s => s.activa).forEach(sim => {
        const mesesTranscurridos = (p.anio - sim.anio_inicio) * 12 + (p.mes_numero - sim.mes_inicio);
        if (mesesTranscurridos >= 0 && mesesTranscurridos < sim.cuotas) {
          simulacionTotalMes += sim.monto;
        }
      });

      const saldoInicial = index === 0 ? saldoAcumulado : saldoAcumulado;
      const saldoFinal = saldoInicial + ingresoFinal - gastoEfectivoTotal - gastoProvisionesTotal - simulacionTotalMes;

      saldoAcumulado = saldoFinal;

      return {
        ...p,
        mes_nombre: mesNombreCapitalizado,
        saldoInicialCalc: saldoInicial,
        ingresoCalc: ingresoFinal,
        gastoEfectivoCalc: gastoEfectivoTotal,
        gastoProvisionesCalc: gastoProvisionesTotal,
        simulacionCalc: simulacionTotalMes,
        saldoFinalCalc: saldoFinal
      };
    });
  }, [proyeccion, cambiosPendientes, simulaciones, saldoFondosReal, pendientesEfectivoActual, pendientesProvisionesActual]);

  const handleCambioLocal = (tipo: string, key: string, valor: number) => {
    setCambiosPendientes((prev: any) => ({
      ...prev,
      [`${tipo}_${key}`]: valor,
    }));
  };

  const guardarTodosCambios = async () => {
    if (Object.keys(cambiosPendientes).length === 0) return;
    setGuardando(true);
    try {
      const promesas = Object.entries(cambiosPendientes).map(async ([key, monto]) => {
        const [tipo, ...rest] = key.split('_');
        const identificador = rest.join('_');
        let tipoAPI = '';
        let referenciaId = 0;
        let anio = 0, mes = 0;

        if (tipo === 'sueldo') {
          tipoAPI = 'ingreso_sueldo';
          referenciaId = 0;
          [anio, mes] = identificador.split('-').map(Number);
        } else if (tipo === 'efectivo' || tipo === 'fijo') {
          // Si es fijo (provisión), la API probablemente usa el mismo endpoint pero cambia el tipo.
          // Nota: Ajusta 'gasto_fijo' abajo si tu API requiere un texto distinto para guardar provisiones.
          tipoAPI = tipo === 'efectivo' ? 'gasto_efectivo' : 'gasto_fijo';
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
            referencia_id: referenciaId,
            anio,
            mes,
            monto_override: monto,
            descripcion: `Modificado desde Escenarios - ${new Date().toLocaleString()}`,
          }),
        });

        if (!response.ok) throw new Error(`Error guardando ${tipoAPI}`);
      });

      await Promise.all(promesas);
      alert('✅ Cambios base guardados correctamente');
      await cargarProyeccion();
    } catch (error) {
      alert('❌ Error al guardar. Verifica tu conexión o base de datos.');
    } finally {
      setGuardando(false);
    }
  };

  const exportarExcel = () => {
    try {
      const headers = ['Concepto', ...proyeccionCalculada.map(p => p.mes_nombre)];

      const formatValue = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? '0' : Math.round(num).toString();
      };

      // 1. BLOQUE DE RESUMEN (Totales)
      const filas = [
        ['Saldo Inicial', ...proyeccionCalculada.map(p => formatValue(p.saldoInicialCalc))],
        ['Sueldo', ...proyeccionCalculada.map(p => formatValue(p.ingresoCalc))],
        ['Total Gastos Efectivo', ...proyeccionCalculada.map(p => formatValue(p.gastoEfectivoCalc))],
        ['Total Provisiones', ...proyeccionCalculada.map(p => formatValue(p.gastoProvisionesCalc))],
        ['Gastos Simulación', ...proyeccionCalculada.map(p => formatValue(p.simulacionCalc))],
        ['Saldo Final', ...proyeccionCalculada.map(p => formatValue(p.saldoFinalCalc))],
      ];

      // Espacio separador
      filas.push([]);
      filas.push(['=== DETALLE GASTOS EFECTIVO ===', ...proyeccionCalculada.map(() => '')]);

      // 2. DETALLE DE EFECTIVO
      // Recopilamos todas las categorías únicas que existen en cualquier mes
      const categoriasEfectivo = new Set<string>();
      proyeccionCalculada.forEach(p => {
        if (p.gastos_efectivo_detalle) {
          p.gastos_efectivo_detalle.forEach((g: any) => categoriasEfectivo.add(g.categoria_nombre));
        }
      });

      // Creamos una fila por cada categoría
      categoriasEfectivo.forEach(catNombre => {
        const filaDetalle = [`  - ${catNombre}`];
        proyeccionCalculada.forEach(p => {
          const gasto = p.gastos_efectivo_detalle?.find((g: any) => g.categoria_nombre === catNombre);
          filaDetalle.push(gasto ? formatValue(gasto.monto) : '0');
        });
        filas.push(filaDetalle);
      });

      // Espacio separador
      filas.push([]);
      filas.push(['=== DETALLE PROVISIONES (FIJOS) ===', ...proyeccionCalculada.map(() => '')]);

      // 3. DETALLE DE PROVISIONES / FIJOS
      // Recopilamos todos los nombres únicos de gastos fijos
      const nombresFijos = new Set<string>();
      proyeccionCalculada.forEach(p => {
        if (p.gastos_fijos_detalle) {
          p.gastos_fijos_detalle.forEach((g: any) => nombresFijos.add(g.nombre));
        }
      });

      // Creamos una fila por cada gasto fijo
      nombresFijos.forEach(nombre => {
        const filaDetalle = [`  - ${nombre}`];
        proyeccionCalculada.forEach(p => {
          const gasto = p.gastos_fijos_detalle?.find((g: any) => g.nombre === nombre);
          filaDetalle.push(gasto ? formatValue(gasto.monto) : '0');
        });
        filas.push(filaDetalle);
      });

      // 4. GENERAR ARCHIVO
      const csv = '\uFEFF' + [headers, ...filas].map(row => row.join(';')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `proyeccion-detallada-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error al generar el Excel:", error);
      alert("Hubo un problema al exportar los datos.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Cargando proyecciones y escenarios...</p>
        </div>
      </div>
    );
  }

  const hayCambiosPendientes = Object.keys(cambiosPendientes).length > 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/estadisticas" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema de Escenarios</h1>
            <p className="text-gray-600 text-sm">
              Proyecta y simula gastos futuros sin alterar tus finanzas reales.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={abrirModalNueva}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar Simulación
          </button>

          <select
            value={mesesMostrar}
            onChange={(e) => setMesesMostrar(Number(e.target.value))}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
            <option value={48}>48 meses</option>
          </select>

          <button onClick={exportarExcel} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 shadow-md">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Panel de Simulaciones Activas */}
      {simulaciones.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            🔬 Simulaciones Guardadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {simulaciones.map(sim => (
              <div key={sim.id} className={`p-3 rounded-lg border-2 transition-all ${sim.activa ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{sim.descripcion}</h3>
                    <p className="text-sm text-gray-600">
                      {formatearMoneda(sim.monto)} x {sim.cuotas} cuotas
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Inicio: Mes {sim.mes_inicio} / {sim.anio_inicio}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleSimulacion(sim.id)} className={`p-1.5 rounded-md ${sim.activa ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`} title={sim.activa ? 'Desactivar' : 'Activar'}>
                      <Power className="w-4 h-4" />
                    </button>
                    <button onClick={() => abrirModalEdicion(sim)} className="p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminarSimulacion(sim.id)} className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón Actualizar Tabla Base */}
      {hayCambiosPendientes && (
        <div className="mb-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 flex justify-between shadow-lg">
          <span className="text-yellow-700 font-semibold">⚠️ Tienes cambios manuales pendientes.</span>
          <button onClick={guardarTodosCambios} disabled={guardando} className="px-6 py-2 bg-yellow-500 text-white rounded-lg flex gap-2 font-semibold shadow-md">
            <Save className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Actualizar Tabla Base'}
          </button>
        </div>
      )}

      {/* Tabla Dinámica */}
      <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-20">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-800 min-w-[200px] sticky left-0 bg-gradient-to-r from-gray-100 to-gray-200 z-30 border-r-2 border-gray-300">
                  Concepto
                </th>
                {proyeccionCalculada.map((p, index) => (
                  <th key={p.mes} className="px-4 py-3 text-center font-bold text-gray-800 min-w-[140px] border-l border-gray-200">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base">{p.mes_nombre}</span>
                      {index === 0 && <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full">Actual</span>}
                      {index !== 0 && <span className="text-xs bg-gray-500 text-white px-3 py-1 rounded-full">Proyección</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* Saldo Inicial Calculado */}
              <tr className="border-b-2 border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-white z-10 border-r-2 border-gray-200">
                  💵 Saldo Inicial
                </td>
                {proyeccionCalculada.map((p) => (
                  <td key={p.mes} className="px-4 py-3 text-center font-medium border-l border-gray-100">
                    {formatearMoneda(p.saldoInicialCalc)}
                  </td>
                ))}
              </tr>

              {/* Sueldo (Editable) */}
              <tr className="border-b-2 border-gray-200 bg-green-50 hover:bg-green-100">
                <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-green-50 z-10 border-r-2 border-gray-200">
                  💰 Sueldo Base
                </td>
                {proyeccionCalculada.map((p, index) => {
                  const key = `sueldo_${p.anio}-${p.mes_numero}`;
                  const tieneOverride = p.ingresos_tiene_override || cambiosPendientes[key] !== undefined;

                  return (
                    <td key={p.mes} className="px-4 py-3 text-center border-l border-gray-100">
                      {index !== 0 ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="text"
                            value={p.ingresoCalc.toLocaleString('es-CL')}
                            onChange={(e) => handleCambioLocal('sueldo', `${p.anio}-${p.mes_numero}`, Number(e.target.value.replace(/\D/g, '')))}
                            className={`w-full pl-6 pr-2 py-2 border-2 rounded-lg text-right font-medium ${tieneOverride ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`}
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-400">
                          {formatearMoneda(p.ingresoCalc)} <span className="text-xs block">(Ya en fondos)</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* ----------------- GASTOS EFECTIVO ----------------- */}
              <tr className="border-b-2 border-gray-200 bg-red-50">
                <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-red-50 z-10 border-r-2 border-gray-200">
                  <button onClick={() => setMesExpandidoEfectivo(!mesExpandidoEfectivo)} className="flex items-center gap-2 hover:text-red-600">
                    {mesExpandidoEfectivo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    🛒 Gastos Efectivo
                  </button>
                </td>
                {proyeccionCalculada.map((p, index) => (
                  <td key={`header-efectivo-${p.mes}`} className="px-4 py-3 text-center border-l border-gray-100">
                    <span className="text-red-600 font-bold">
                      {formatearMoneda(p.gastoEfectivoCalc)}
                      {index === 0 && <span className="text-[10px] block font-normal text-gray-500">(Pendientes efect.)</span>}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Detalle Categorías Efectivo */}
              {mesExpandidoEfectivo && categoriasEfectivo.map((cat) => (
                <tr key={`cat-efectivo-${cat.categoria_id}`} className="border-b border-gray-100 bg-red-50/30">
                  <td className="px-4 py-2 text-sm text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-base">{cat.categoria_icono}</span>
                      <span className="font-medium">{cat.categoria_nombre}</span>
                    </div>
                  </td>
                  {proyeccionCalculada.map((p, index) => {
                    if (index === 0) return <td key={p.mes} className="px-4 py-2 text-center text-gray-400 border-l text-xs">-</td>;
                    const detalle = p.gastos_efectivo_detalle?.find(d => d.categoria_id === cat.categoria_id);
                    if (!detalle) return <td key={p.mes} className="px-4 py-2 text-center text-gray-400 border-l">-</td>;

                    const key = `efectivo_${detalle.categoria_id}-${p.anio}-${p.mes_numero}`;
                    const valorActual = cambiosPendientes[key] ?? detalle.monto;
                    const tieneOverride = detalle.tiene_override || cambiosPendientes[key] !== undefined;

                    return (
                      <td key={p.mes} className="px-2 py-2 text-center border-l border-gray-100">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                          <input
                            type="text"
                            value={valorActual.toLocaleString('es-CL')}
                            onChange={(e) => handleCambioLocal('efectivo', `${detalle.categoria_id}-${p.anio}-${p.mes_numero}`, Number(e.target.value.replace(/\D/g, '')))}
                            className={`w-full pl-5 pr-2 py-1 border-2 rounded text-right text-xs font-medium ${tieneOverride ? 'border-yellow-500 bg-yellow-100 text-yellow-700' : 'border-gray-300 focus:border-blue-500'}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ----------------- PROVISIONES / TARJETAS ----------------- */}
              <tr className="border-b-2 border-gray-200 bg-orange-50">
                <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-orange-50 z-10 border-r-2 border-gray-200">
                  <button onClick={() => setMesExpandidoFijos(!mesExpandidoFijos)} className="flex items-center gap-2 hover:text-orange-600">
                    {mesExpandidoFijos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    💳 Provisiones (Tarj)
                  </button>
                </td>
                {proyeccionCalculada.map((p, index) => (
                  <td key={`header-prov-${p.mes}`} className="px-4 py-3 text-center border-l border-gray-100">
                    <span className="text-orange-600 font-bold">
                      {formatearMoneda(p.gastoProvisionesCalc)}
                      {index === 0 && <span className="text-[10px] block font-normal text-gray-500">(Pendientes tarj.)</span>}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Detalle Categorías Provisiones (Fijos) */}
              {mesExpandidoFijos && categoriasFijos.map((cat) => (
                <tr key={`cat-fijo-${cat.categoria_id}`} className="border-b border-gray-100 bg-orange-50/30">
                  <td className="px-4 py-2 text-sm text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-base">{cat.categoria_icono}</span>
                      <span className="font-medium">{cat.categoria_nombre}</span>
                    </div>
                  </td>
                  {proyeccionCalculada.map((p, index) => {
                    if (index === 0) return <td key={p.mes} className="px-4 py-2 text-center text-gray-400 border-l text-xs">-</td>;
                    const detalle = p.gastos_fijos_detalle?.find((d: any) => d.id === cat.categoria_id);
                    if (!detalle) return <td key={p.mes} className="px-4 py-2 text-center text-gray-400 border-l">-</td>;

                    const key = `fijo_${detalle.id}-${p.anio}-${p.mes_numero}`;
                    const valorActual = cambiosPendientes[key] ?? detalle.monto;
                    const tieneOverride = detalle.tiene_override || cambiosPendientes[key] !== undefined;

                    return (
                      <td key={p.mes} className="px-2 py-2 text-center border-l border-gray-100">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                          <input
                            type="text"
                            value={valorActual.toLocaleString('es-CL')}
                            onChange={(e) => handleCambioLocal('fijo', `${detalle.id}-${p.anio}-${p.mes_numero}`, Number(e.target.value.replace(/\D/g, '')))}
                            className={`w-full pl-5 pr-2 py-1 border-2 rounded text-right text-xs font-medium ${tieneOverride ? 'border-yellow-500 bg-yellow-100 text-yellow-700' : 'border-gray-300 focus:border-blue-500'}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* SECCIÓN NUEVA: GASTOS SIMULADOS INYECTADOS */}
              <tr className="border-b-2 border-purple-300 bg-purple-100">
                <td className="px-4 py-3 font-semibold text-purple-900 sticky left-0 bg-purple-100 z-10 border-r-2 border-purple-300">
                  <button onClick={() => setSimulacionesExpandidas(!simulacionesExpandidas)} className="flex items-center gap-2 hover:text-purple-700">
                    {simulacionesExpandidas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    🔬 Gastos Proyectados
                  </button>
                </td>
                {proyeccionCalculada.map((p) => (
                  <td key={`header-sim-${p.mes}`} className="px-4 py-3 text-center border-l border-purple-200">
                    <span className="text-purple-700 font-bold">{formatearMoneda(p.simulacionCalc)}</span>
                  </td>
                ))}
              </tr>

              {/* Detalle Simulaciones */}
              {simulacionesExpandidas && simulaciones.filter(s => s.activa).map((sim) => (
                <tr key={sim.id} className="border-b border-purple-100 bg-purple-50/50">
                  <td className="px-4 py-2 pl-8 text-sm text-gray-800 sticky left-0 bg-purple-50/90 z-10 border-r border-purple-200 font-medium">
                    {sim.descripcion} <span className="text-xs text-gray-500">({sim.cuotas}x)</span>
                  </td>
                  {proyeccionCalculada.map((p) => {
                    const mesesTranscurridos = (p.anio - sim.anio_inicio) * 12 + (p.mes_numero - sim.mes_inicio);
                    const aplica = mesesTranscurridos >= 0 && mesesTranscurridos < sim.cuotas;

                    return (
                      <td key={p.mes} className="px-4 py-2 text-center text-sm border-l border-purple-100">
                        {aplica ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-purple-800">{formatearMoneda(sim.monto)}</span>
                            <span className="text-[10px] text-gray-500">Cuota {mesesTranscurridos + 1} de {sim.cuotas}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Saldo Final en Cascada */}
              <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-blue-100 font-bold">
                <td className="px-4 py-4 sticky left-0 bg-gradient-to-r from-blue-50 to-blue-100 z-10 border-r-2 border-gray-300 text-gray-800 text-lg">
                  💵 Saldo Final Real
                </td>
                {proyeccionCalculada.map((p) => (
                  <td key={`saldo-final-${p.mes}`} className={`px-4 py-4 text-center text-lg font-bold border-l border-gray-200 ${p.saldoFinalCalc < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatearMoneda(p.saldoFinalCalc)}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Simulación */}
      {modalSimulacion && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-purple-800 flex items-center gap-2">
              {simulacionEditando ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {simulacionEditando ? 'Editar Simulación' : 'Crear Simulación'}
            </h2>
            <form onSubmit={guardarNuevaSimulacion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <input required type="text" value={formSimulacion.descripcion} onChange={e => setFormSimulacion({ ...formSimulacion, descripcion: e.target.value })} placeholder="Ej: Crédito Consumo" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto de la Cuota</label>
                <input required type="number" value={formSimulacion.monto} onChange={e => setFormSimulacion({ ...formSimulacion, monto: e.target.value })} placeholder="150000" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-purple-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Cuotas</label>
                  <input required type="number" min="1" value={formSimulacion.cuotas} onChange={e => setFormSimulacion({ ...formSimulacion, cuotas: Number(e.target.value) })} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mes Inicio</label>
                  <select value={formSimulacion.mes_inicio} onChange={e => setFormSimulacion({ ...formSimulacion, mes_inicio: Number(e.target.value) })} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-purple-500 outline-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>Mes {m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Año Inicio</label>
                <input required type="number" value={formSimulacion.anio_inicio} onChange={e => setFormSimulacion({ ...formSimulacion, anio_inicio: Number(e.target.value) })} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-purple-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setModalSimulacion(false); setSimulacionEditando(null); }} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">{simulacionEditando ? 'Guardar Cambios' : 'Agregar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}