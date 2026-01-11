"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function FondosPage() {
  const [fondos, setFondos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null); // Estado para el saldo
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    mes_que_cubre: new Date().toISOString().slice(0, 7) + '-01',
    tipo: 'sueldo',
    monto: '',
    descripcion: ''
  });

  useEffect(() => {
    cargarFondos();
  }, []);

  const cargarFondos = async () => {
    try {
      const response = await fetch('/api/fondos');
      const result = await response.json();
      if (result.success) {
        setFondos(result.data);
        setResumen(result.resumen); // Guardamos el resumen calculado
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/fondos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          monto: parseFloat(formData.monto)
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('¡Fondo registrado! ✅');
        setShowForm(false);
        setFormData({
          fecha_pago: new Date().toISOString().split('T')[0],
          mes_que_cubre: new Date().toISOString().slice(0, 7) + '-01',
          tipo: 'sueldo',
          monto: '',
          descripcion: ''
        });
        cargarFondos();
      }
    } catch (error) {
      alert('Error al guardar');
    }
  };

  if (loading) return <div className="text-center py-12">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">💰 Fondos e Ingresos</h1>
        <Button onClick={() => setShowForm(true)}>+ Registrar Ingreso</Button>
      </div>

      {/* Ficha de Saldo Líquido Real (NUEVO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-lg shadow">
          <p className="text-sm opacity-90 mb-1">Saldo Líquido Disponible (Efectivo)</p>
          <p className="text-4xl font-bold">{formatCurrency(resumen?.saldo_liquido || 0)}</p>
          <p className="text-xs opacity-75 mt-2">Ingresos Totales - Gastos Pagados en Efectivo</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-center">
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-gray-600">Total Ingresos Histórico</span>
            <span className="font-bold text-green-600">{formatCurrency(resumen?.total_ingresos || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Gastado (Efectivo)</span>
            <span className="font-bold text-red-600">- {formatCurrency(resumen?.total_egresos_efectivo || 0)}</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Registrar Ingreso</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Pago</label>
                <Input type="date" required value={formData.fecha_pago} onChange={(e) => setFormData({...formData, fecha_pago: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mes que Cubre</label>
                <Input type="month" required value={formData.mes_que_cubre.slice(0, 7)} onChange={(e) => setFormData({...formData, mes_que_cubre: e.target.value + '-01'})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="flex h-10 w-full rounded-md border px-3 py-2">
                  <option value="sueldo">💼 Sueldo</option>
                  <option value="ingreso_extra">💰 Ingreso Extra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto</label>
                <Input type="number" placeholder="0" required value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <Input type="text" placeholder="Opcional" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1">💾 Guardar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {fondos.map((fondo) => (
          <div key={fondo.id} className="bg-white p-5 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{fondo.tipo === 'sueldo' ? '💼 Sueldo' : '💰 Ingreso Extra'}</p>
                <p className="text-sm text-gray-600">{fondo.descripcion}</p>
                <p className="text-xs text-gray-400">
                  Pagado: {formatDate(fondo.fecha_pago)} • Cubre: {formatDate(fondo.mes_que_cubre)} (Solo mes/año)
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(fondo.monto)}</p>
            </div>
          </div>
        ))}
        {fondos.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No hay ingresos registrados</p>
          </div>
        )}
      </div>
    </div>
  );
}
