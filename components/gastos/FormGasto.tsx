"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

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
    pagado: false,
    cuotas: 1
  });

  // Cargar categorías al abrir
  useEffect(() => {
    if (isOpen) {
      fetch('/api/categorias')
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setCategorias(result.data);
          }
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
          categoria_id: formData.categoria_id || null,
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Gasto agregado');
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          monto: '',
          categoria_id: '',
          metodo_pago: 'efectivo',
          descripcion: '',
          pagado: false,
          cuotas: 1
        });
        onSuccess();
      } else {
        alert(`❌ Error: ${result.error}`);
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
        <h2 className="text-2xl font-bold mb-4">+ Nuevo Gasto</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha *</label>
            <Input
              type="date"
              required
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción *</label>
            <Input
              type="text"
              required
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Ej: Supermercado, Combustible, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Monto *</label>
            <Input
              type="number"
              required
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cuotas</label>
            <select
              value={formData.cuotas}
              onChange={(e) =>
                setFormData({
                  ...formData,
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
            {formData.cuotas > 1 && (
              <p className="text-xs text-gray-600 mt-1">
                Se crearán {formData.cuotas} cuotas de{" "}
                {formatCurrency(
                  parseFloat(formData.monto || "0") / formData.cuotas
                )}{" "}
                cada una
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={formData.categoria_id}
              onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
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
            <label className="block text-sm font-medium mb-1">Método de Pago *</label>
            <select
              value={formData.metodo_pago}
              onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
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
                checked={formData.pagado}
                onChange={(e) => setFormData({ ...formData, pagado: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Marcar como pagado</span>
            </label>
          </div>

          <div className="flex gap-2 pt-4">
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
