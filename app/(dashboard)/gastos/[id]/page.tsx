"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function EditarGastoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    fecha: '',
    monto: '',
    categoria_id: '',
    metodo_pago: 'efectivo',
    descripcion: '',
    estado: 'pendiente',
    fecha_vencimiento: ''
  });

  useEffect(() => {
    if (id) {
      cargarGasto();
      cargarCategorias();
    }
  }, [id]);

  const cargarGasto = async () => {
    try {
      const response = await fetch(`/api/gastos/${id}`);
      const result = await response.json();

      if (result.success) {
        const gasto = result.data;
        setFormData({
          fecha: gasto.fecha.split('T')[0],
          monto: gasto.monto,
          categoria_id: gasto.categoria_id || '',
          metodo_pago: gasto.metodo_pago,
          descripcion: gasto.descripcion,
          estado: gasto.estado,
          fecha_vencimiento: gasto.fecha_vencimiento ? gasto.fecha_vencimiento.split('T')[0] : ''
        });
      } else {
        alert('Error al cargar el gasto');
        router.push('/gastos');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar el gasto');
      router.push('/gastos');
    } finally {
      setLoading(false);
    }
  };

  const cargarCategorias = async () => {
    try {
      const response = await fetch('/api/categorias');
      const result = await response.json();
      if (result.success) setCategorias(result.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          monto: parseFloat(formData.monto),
          categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
          fecha_vencimiento: formData.fecha_vencimiento || null
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Gasto actualizado exitosamente');
        router.push('/gastos');
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Gasto eliminado');
        router.push('/gastos');
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el gasto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">✏️ Editar Gasto</h1>
        <Button 
          variant="outline" 
          onClick={() => router.push('/gastos')}
        >
          ← Volver
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Descripción *</label>
          <Input
            type="text"
            required
            value={formData.descripcion}
            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            placeholder="Ej: Supermercado, Bencina, etc."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Monto *</label>
            <Input
              type="number"
              required
              value={formData.monto}
              onChange={(e) => setFormData({...formData, monto: e.target.value})}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={formData.categoria_id}
              onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Sin categoría</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha del Gasto *</label>
            <Input
              type="date"
              required
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fecha Vencimiento</label>
            <Input
              type="date"
              value={formData.fecha_vencimiento}
              onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Método de Pago *</label>
            <select
              value={formData.metodo_pago}
              onChange={(e) => setFormData({...formData, metodo_pago: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estado *</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({...formData, estado: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={guardando} className="flex-1">
            {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleEliminar}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            🗑️ Eliminar
          </Button>
        </div>
      </form>
    </div>
  );
}
