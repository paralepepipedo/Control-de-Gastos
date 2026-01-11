"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface FormGastoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FormGasto({ isOpen, onClose, onSuccess }: FormGastoProps) {
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    categoria_id: '',
    metodo_pago: 'efectivo',
    descripcion: '',
    estado: 'pagado',
    fecha_vencimiento: ''
  });

  // Cargar categorías al abrir
  useEffect(() => {
    if (isOpen) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/categorias`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json'
        }
      })
        .then(res => res.json())
        .then(data => {
          // Solo mostrar categorías para gastos variables diarios
          const categoriasPermitidas = ['Comida', 'Bencina', 'Transporte', 'Autopistas', 'Entretenimiento', 'Salud', 'Otros'];
          const categoriasVariables = data.filter((cat: any) =>
            categoriasPermitidas.includes(cat.nombre)
          );
          setCategorias(categoriasVariables);
        })

        .catch(err => console.error('Error cargando categorías:', err));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          monto: parseFloat(formData.monto),
          categoria_id: parseInt(formData.categoria_id),
          fecha_vencimiento: formData.estado === 'pendiente' ? formData.fecha_vencimiento : null
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('¡Gasto guardado exitosamente! ✅');
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          monto: '',
          categoria_id: '',
          metodo_pago: 'efectivo',
          descripcion: '',
          estado: 'pagado',
          fecha_vencimiento: ''
        });
        onSuccess();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Error al guardar el gasto');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Agregar Gasto</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <Input
              type="date"
              required
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Monto (CLP)</label>
            <Input
              type="number"
              placeholder="0"
              required
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              required
              value={formData.categoria_id}
              onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icono} {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Método de Pago</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="metodo_pago"
                  value="efectivo"
                  checked={formData.metodo_pago === 'efectivo'}
                  onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                  className="mr-2"
                />
                Efectivo
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="metodo_pago"
                  value="tarjeta"
                  checked={formData.metodo_pago === 'tarjeta'}
                  onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                  className="mr-2"
                />
                Tarjeta
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="estado"
                  value="pagado"
                  checked={formData.estado === 'pagado'}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="mr-2"
                />
                Pagado
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="estado"
                  value="pendiente"
                  checked={formData.estado === 'pendiente'}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="mr-2"
                />
                Pendiente
              </label>
            </div>
          </div>

          {formData.estado === 'pendiente' && (
            <div>
              <label className="block text-sm font-medium mb-1">Fecha Vencimiento</label>
              <Input
                type="date"
                required
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <Input
              type="text"
              placeholder="Ej: Almuerzo con Marti"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Guardando..." : "💾 Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
