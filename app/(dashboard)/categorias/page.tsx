"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  
  // Estados para formularios
  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre: "",
    icono: "🛒",
    tipo: "ambos"
  });
  const [categoriaEditar, setCategoriaEditar] = useState<any>(null);

  const iconosComunes = ["🛒", "🍽️", "🚗", "🏠", "💊", "🎉", "💡", "💧", "📱", "🚌", "✈️", "📚", "🔧", "💳", "💵"];

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      const response = await fetch("/api/categorias");
      const result = await response.json();
      if (result.success) {
        setCategorias(result.data);
      }
    } catch (error) {
      console.error("Error cargando categorías:", error);
    } finally {
      setLoading(false);
    }
  };

  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaCategoria),
      });
      const result = await response.json();
      if (result.success) {
        setCategorias([...categorias, result.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setModalOpen(false);
        setNuevaCategoria({ nombre: "", icono: "🛒", tipo: "ambos" });
        alert("✅ Categoría creada exitosamente");
      } else {
        alert("❌ Error: " + result.error);
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  const abrirModalEditar = (cat: any) => {
    setCategoriaEditar({ ...cat });
    setModalEditar(true);
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Usamos PUT o PATCH dependiendo de tu API. Asumiré PUT a /api/categorias con ID en body o query
      // Si tu API actual no soporta PUT, habría que agregarla. 
      // Por ahora asumo que existe o se puede usar POST con update.
      // Si no tienes endpoint PUT, avísame. Aquí uso un patrón estándar.
      
      /* NOTA: Si tu API route actual no tiene PUT, fallará. 
         Pero como pediste restaurar la funcionalidad, asumo que la lógica backend existe o la agregaré si falla. */
         
      const response = await fetch(`/api/categorias`, {
        method: "PUT", // Asegúrate de que tu API soporte PUT
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoriaEditar),
      });

      const result = await response.json();

      if (result.success) {
        setCategorias(categorias.map(c => c.id === categoriaEditar.id ? result.data : c));
        setModalEditar(false);
        alert("✅ Categoría actualizada");
      } else {
        alert("❌ Error: " + result.error);
      }
    } catch (error) {
      alert("Error al actualizar");
    }
  };

  const eliminarCategoria = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;
    try {
      const response = await fetch(`/api/categorias?id=${id}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        setCategorias(categorias.filter((c) => c.id !== id));
      } else {
        alert("❌ Error: " + result.error);
      }
    } catch (error) {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🏷️ Categorías</h1>
        <Button onClick={() => setModalOpen(true)}>+ Nueva Categoría</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((cat) => (
            <div key={cat.id} className="bg-white p-4 rounded-lg shadow flex items-center justify-between border-l-4 border-blue-500">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icono}</span>
                <div>
                  <h3 className="font-bold text-gray-800">{cat.nombre}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cat.tipo === 'efectivo' ? 'bg-green-100 text-green-700' :
                    cat.tipo === 'tarjeta' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {cat.tipo === 'ambos' ? 'Efectivo / Tarjeta' : 
                     cat.tipo === 'tarjeta' ? 'Solo Tarjeta' : 'Solo Efectivo'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirModalEditar(cat)} className="text-blue-500 hover:text-blue-700" title="Editar">
                  ✏️
                </button>
                <button onClick={() => eliminarCategoria(cat.id)} className="text-gray-400 hover:text-red-500" title="Eliminar">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">Nueva Categoría</h2>
            <form onSubmit={crearCategoria} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input required value={nuevaCategoria.nombre} onChange={(e) => setNuevaCategoria({...nuevaCategoria, nombre: e.target.value})} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Pago</label>
                <select className="w-full border rounded px-3 py-2" value={nuevaCategoria.tipo} onChange={(e) => setNuevaCategoria({...nuevaCategoria, tipo: e.target.value})}>
                  <option value="ambos">Efectivo y Tarjeta</option>
                  <option value="efectivo">Solo Efectivo</option>
                  <option value="tarjeta">Solo Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Icono</label>
                <div className="grid grid-cols-5 gap-2">
                  {iconosComunes.map((ico) => (
                    <button key={ico} type="button" onClick={() => setNuevaCategoria({...nuevaCategoria, icono: ico})} className={`text-xl p-2 rounded hover:bg-gray-100 ${nuevaCategoria.icono === ico ? 'bg-blue-100 ring-2' : ''}`}>{ico}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1">Crear</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && categoriaEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">Editar Categoría</h2>
            <form onSubmit={guardarEdicion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input required value={categoriaEditar.nombre} onChange={(e) => setCategoriaEditar({...categoriaEditar, nombre: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Pago</label>
                <select className="w-full border rounded px-3 py-2" value={categoriaEditar.tipo} onChange={(e) => setCategoriaEditar({...categoriaEditar, tipo: e.target.value})}>
                  <option value="ambos">Efectivo y Tarjeta</option>
                  <option value="efectivo">Solo Efectivo</option>
                  <option value="tarjeta">Solo Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Icono</label>
                <div className="grid grid-cols-5 gap-2">
                  {iconosComunes.map((ico) => (
                    <button key={ico} type="button" onClick={() => setCategoriaEditar({...categoriaEditar, icono: ico})} className={`text-xl p-2 rounded hover:bg-gray-100 ${categoriaEditar.icono === ico ? 'bg-blue-100 ring-2' : ''}`}>{ico}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setModalEditar(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1">Guardar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
