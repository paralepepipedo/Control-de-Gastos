"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function WidgetTCItau() {
  const [tc, setTc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModalFactura, setShowModalFactura] = useState(false);
  const [showModalEditarCiclo, setShowModalEditarCiclo] = useState(false);
  const [formFactura, setFormFactura] = useState({
    fecha_inicio_real: '',
    fecha_fin_real: '',
    fecha_factura: '',
    fecha_vencimiento: '',
    monto_minimo: ''
  });
  const [formCiclo, setFormCiclo] = useState({
    fecha_inicio_estimada: '',
    fecha_fin_estimada: '',
    fecha_pago_resto: ''
  });

  useEffect(() => {
    cargarTC();
  }, []);

  const cargarTC = async () => {
    try {
      const response = await fetch('/api/tarjeta-itau');
      const result = await response.json();
      if (result.success) {
        setTc(result.data);
        // Preparar form de edición de ciclo
        if (result.data) {
          setFormCiclo({
            fecha_inicio_estimada: result.data.fecha_inicio_estimada?.split('T')[0] || '',
            fecha_fin_estimada: result.data.fecha_fin_estimada?.split('T')[0] || '',
            fecha_pago_resto: result.data.fecha_pago_resto?.split('T')[0] || ''
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/tarjeta-itau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: tc.mes,
          total_gastado: tc.total_gastado,
          ...formFactura,
          monto_minimo: parseFloat(formFactura.monto_minimo)
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('¡Factura registrada! Se crearon 2 gastos pendientes ✅');
        setShowModalFactura(false);
        cargarTC();
      }
    } catch (error) {
      alert('Error al registrar factura');
    }
  };

  const handleEditarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/tarjeta-itau', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: tc.mes,
          ...formCiclo
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Ciclo actualizado');
        setShowModalEditarCiclo(false);
        cargarTC();
      }
    } catch (error) {
      alert('Error al editar ciclo');
    }
  };

  if (loading) return <div>Cargando TC...</div>;
  if (!tc) return null;

  return (
    <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">💳 TC Itaú</h3>
        <div className="flex gap-2">
          {!tc.factura_registrada && (
            <>
              <Button
                size="sm"
                onClick={() => setShowModalEditarCiclo(true)}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                ⚙️
              </Button>
              <Button
                size="sm"
                onClick={() => setShowModalFactura(true)}
                className="bg-white text-pink-600 hover:bg-gray-100"
              >
                + Registrar Factura
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Ciclo:</span>
          <span className="font-semibold">
            {formatDate(tc.fecha_inicio_real || tc.fecha_inicio_estimada, 'dd/MM')} → {formatDate(tc.fecha_fin_real || tc.fecha_fin_estimada, 'dd/MM')}
          </span>
        </div>

        <div className="flex justify-between text-2xl font-bold">
          <span>Total Gastado:</span>
          <span>{formatCurrency(tc.total_gastado)}</span>
        </div>

        {tc.factura_registrada ? (
          <div className="mt-4 pt-4 border-t border-white/30 space-y-2">
            <div className="flex justify-between">
              <span>📄 Factura:</span>
              <span>{formatDate(tc.fecha_factura)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mínimo:</span>
              <span className="font-semibold">{formatCurrency(tc.monto_minimo)}</span>
            </div>
            <div className="flex justify-between">
              <span>Resto:</span>
              <span className="font-semibold">{formatCurrency(tc.monto_resto)}</span>
            </div>
            <div className="text-sm mt-2">
              ⚠️ Vence: {formatDate(tc.fecha_vencimiento)}
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-white/30 text-sm">
            ⚠️ Factura no registrada
          </div>
        )}
      </div>

      {/* Modal Editar Ciclo */}
      {showModalEditarCiclo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-gray-900">
            <h2 className="text-xl font-bold mb-4">⚙️ Editar Ciclo</h2>
            <form onSubmit={handleEditarCiclo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Inicio Estimada</label>
                <Input
                  type="date"
                  required
                  value={formCiclo.fecha_inicio_estimada}
                  onChange={(e) => setFormCiclo({...formCiclo, fecha_inicio_estimada: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Fin Estimada</label>
                <Input
                  type="date"
                  required
                  value={formCiclo.fecha_fin_estimada}
                  onChange={(e) => setFormCiclo({...formCiclo, fecha_fin_estimada: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Pago Resto</label>
                <Input
                  type="date"
                  required
                  value={formCiclo.fecha_pago_resto}
                  onChange={(e) => setFormCiclo({...formCiclo, fecha_pago_resto: e.target.value})}
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowModalEditarCiclo(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">💾 Guardar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Factura */}
      {showModalFactura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-gray-900">
            <h2 className="text-xl font-bold mb-4">Registrar Factura TC Itaú</h2>
            <form onSubmit={handleRegistrarFactura} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Período Real Desde</label>
                <Input
                  type="date"
                  required
                  value={formFactura.fecha_inicio_real}
                  onChange={(e) => setFormFactura({...formFactura, fecha_inicio_real: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Período Real Hasta</label>
                <Input
                  type="date"
                  required
                  value={formFactura.fecha_fin_real}
                  onChange={(e) => setFormFactura({...formFactura, fecha_fin_real: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Factura</label>
                <Input
                  type="date"
                  required
                  value={formFactura.fecha_factura}
                  onChange={(e) => setFormFactura({...formFactura, fecha_factura: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Vencimiento</label>
                <Input
                  type="date"
                  required
                  value={formFactura.fecha_vencimiento}
                  onChange={(e) => setFormFactura({...formFactura, fecha_vencimiento: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Monto Mínimo</label>
                <Input
                  type="number"
                  required
                  value={formFactura.monto_minimo}
                  onChange={(e) => setFormFactura({...formFactura, monto_minimo: e.target.value})}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm">
                  <strong>Total gastado:</strong> {formatCurrency(tc.total_gastado)}<br/>
                  <strong>Resto a pagar:</strong> {formatCurrency(tc.total_gastado - parseFloat(formFactura.monto_minimo || '0'))}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowModalFactura(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">💾 Registrar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
