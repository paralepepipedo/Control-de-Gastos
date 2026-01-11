"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

export default function GastosFijosPage() {
  const [gastosFijos, setGastosFijos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [gastoEditar, setGastoEditar] = useState<any>(null);

  const [nuevoGastoFijo, setNuevoGastoFijo] = useState({
    nombre: "",
    dia_vencimiento: 1,
    monto_provision: "",
    categoria_id: "",
    metodo_pago: "efectivo",
    tipo: "fijo" // 'fijo' o 'presupuesto' (ej: combustible, comida)
  });

  useEffect(() => {
    cargarGastosFijos();
    cargarCategorias();
  }, []);

  const cargarGastosFijos = async () => {
    try {
      const response = await fetch("/api/gastos-fijos");
      const result = await response.json();
      if (result.success) setGastosFijos(result.data);
    } catch (error) {
      console.error("Error cargando gastos fijos:", error);
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
      console.error("Error cargando categorías:", error);
    }
  };

  const crearGastoFijo = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/gastos-fijos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nuevoGastoFijo,
          dia_vencimiento: Number(nuevoGastoFijo.dia_vencimiento),
          monto_provision: Number(nuevoGastoFijo.monto_provision),
          categoria_id: nuevoGastoFijo.categoria_id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Gasto fijo creado");
        setModalNuevo(false);
        setNuevoGastoFijo({
          nombre: "",
          dia_vencimiento: 1,
          monto_provision: "",
          categoria_id: "",
          metodo_pago: "efectivo",
          tipo: "fijo"
        });
        cargarGastosFijos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al crear gasto fijo");
    }
  };

  const abrirModalEditar = (gasto: any) => {
    setGastoEditar({
      ...gasto,
      monto_provision: String(gasto.monto_provision),
      categoria_id: gasto.categoria_id || ""
    });
    setModalEditar(true);
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/gastos-fijos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: gastoEditar.id,
          nombre: gastoEditar.nombre,
          dia_vencimiento: Number(gastoEditar.dia_vencimiento),
          monto_provision: Number(gastoEditar.monto_provision),
          categoria_id: gastoEditar.categoria_id || null,
          metodo_pago: gastoEditar.metodo_pago,
          tipo: gastoEditar.tipo,
          activo: gastoEditar.activo
        })
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Gasto fijo actualizado");
        setModalEditar(false);
        cargarGastosFijos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al actualizar gasto fijo");
    }
  };

  const desactivarGastoFijo = async (gasto: any) => {
    if (!confirm(`¿Desactivar gasto fijo "${gasto.nombre}"?`)) return;

    try {
      const response = await fetch(`/api/gastos-fijos?id=${gasto.id}`, {
        method: "DELETE"
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Gasto fijo desactivado");
        cargarGastosFijos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al desactivar gasto fijo");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📌 Gastos Fijos</h1>
        <Button onClick={() => setModalNuevo(true)}>
          + Nuevo Gasto Fijo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold">Día</th>
                <th className="text-left p-3 font-semibold">Nombre</th>
                <th className="text-left p-3 font-semibold">Categoría</th>
                <th className="text-right p-3 font-semibold">Monto</th>
                <th className="text-center p-3 font-semibold">Método</th>
                <th className="text-center p-3 font-semibold">Tipo</th>
                <th className="text-center p-3 font-semibold">Estado</th>
                <th className="text-center p-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastosFijos.map((g) => (
                <tr key={g.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{g.dia_vencimiento}</td>
                  <td className="p-3 font-medium">{g.nombre}</td>
                  <td className="p-3">
                    {g.categorias ? (
                      <span className="text-sm">
                        {g.categorias.icono} {g.categorias.nombre}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-bold text-red-600">
                    {formatCurrency(g.monto_provision)}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      g.metodo_pago === "tarjeta"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {g.metodo_pago}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      g.tipo === "presupuesto"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {g.tipo === "presupuesto" ? "Presupuesto" : "Fijo"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      g.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {g.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => abrirModalEditar(g)}
                        className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      {g.activo && (
                        <button
                          onClick={() => desactivarGastoFijo(g)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                          title="Desactivar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {gastosFijos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay gastos fijos registrados
            </div>
          )}
        </div>
      )}

      {/* Modal Nuevo */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">+ Nuevo Gasto Fijo</h2>

            <form onSubmit={crearGastoFijo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  type="text"
                  required
                  value={nuevoGastoFijo.nombre}
                  onChange={(e) =>
                    setNuevoGastoFijo({ ...nuevoGastoFijo, nombre: e.target.value })
                  }
                  placeholder="Ej: Combustible, Comida, Hipotecario"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Día vencimiento *</label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={nuevoGastoFijo.dia_vencimiento}
                    onChange={(e) =>
                      setNuevoGastoFijo({
                        ...nuevoGastoFijo,
                        dia_vencimiento: Number(e.target.value)
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Monto provisión *</label>
                  <Input
                    type="number"
                    required
                    value={nuevoGastoFijo.monto_provision}
                    onChange={(e) =>
                      setNuevoGastoFijo({
                        ...nuevoGastoFijo,
                        monto_provision: e.target.value
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select
                  value={nuevoGastoFijo.categoria_id}
                  onChange={(e) =>
                    setNuevoGastoFijo({
                      ...nuevoGastoFijo,
                      categoria_id: e.target.value
                    })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Método de pago *</label>
                  <select
                    value={nuevoGastoFijo.metodo_pago}
                    onChange={(e) =>
                      setNuevoGastoFijo({
                        ...nuevoGastoFijo,
                        metodo_pago: e.target.value
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select
                    value={nuevoGastoFijo.tipo}
                    onChange={(e) =>
                      setNuevoGastoFijo({
                        ...nuevoGastoFijo,
                        tipo: e.target.value
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="fijo">Fijo</option>
                    <option value="presupuesto">Presupuesto (suma varios gastos)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalNuevo(false)}
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
            <h2 className="text-xl font-bold mb-4">✏️ Editar Gasto Fijo</h2>

            <form onSubmit={guardarEdicion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  type="text"
                  required
                  value={gastoEditar.nombre}
                  onChange={(e) =>
                    setGastoEditar({ ...gastoEditar, nombre: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Día vencimiento *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={gastoEditar.dia_vencimiento}
                    onChange={(e) =>
                      setGastoEditar({
                        ...gastoEditar,
                        dia_vencimiento: Number(e.target.value)
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Monto provisión *
                  </label>
                  <Input
                    type="number"
                    required
                    value={gastoEditar.monto_provision}
                    onChange={(e) =>
                      setGastoEditar({
                        ...gastoEditar,
                        monto_provision: e.target.value
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select
                  value={gastoEditar.categoria_id || ""}
                  onChange={(e) =>
                    setGastoEditar({
                      ...gastoEditar,
                      categoria_id: e.target.value
                    })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Método de pago *
                  </label>
                  <select
                    value={gastoEditar.metodo_pago}
                    onChange={(e) =>
                      setGastoEditar({
                        ...gastoEditar,
                        metodo_pago: e.target.value
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select
                    value={gastoEditar.tipo || "fijo"}
                    onChange={(e) =>
                      setGastoEditar({
                        ...gastoEditar,
                        tipo: e.target.value
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="fijo">Fijo</option>
                    <option value="presupuesto">Presupuesto (suma varios gastos)</option>
                  </select>
                </div>
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
