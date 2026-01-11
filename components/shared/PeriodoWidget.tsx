"use client";

import { useState } from "react";
import { formatNombrePeriodo, formatRangoPeriodo } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface PeriodoWidgetProps {
  periodo: any;
  onPeriodoActualizado: () => void;
}

export default function PeriodoWidget({ periodo, onPeriodoActualizado }: PeriodoWidgetProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState({
    fecha_inicio: periodo?.fecha_inicio || '',
    fecha_fin: periodo?.fecha_fin || '',
    notas: periodo?.notas || ''
  });
  const [guardando, setGuardando] = useState(false);

  const abrirModal = () => {
    setEditando({
      fecha_inicio: periodo?.fecha_inicio || '',
      fecha_fin: periodo?.fecha_fin || '',
      notas: periodo?.notas || ''
    });
    setModalAbierto(true);
  };

  const guardarPeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const response = await fetch('/api/periodos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: periodo.mes,
          anio: periodo.anio,
          fecha_inicio: editando.fecha_inicio,
          fecha_fin: editando.fecha_fin,
          es_provisional: false,
          fecha_factura: new Date().toISOString().split('T')[0],
          notas: editando.notas
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Período actualizado correctamente');
        setModalAbierto(false);
        onPeriodoActualizado();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar período');
    } finally {
      setGuardando(false);
    }
  };

  if (!periodo) return null;

  return (
    <>
      <div className={`rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-lg ${
        periodo.es_provisional 
          ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' 
          : 'bg-gradient-to-br from-green-500 to-green-600 text-white'
      }`}
      onClick={abrirModal}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs opacity-90 uppercase font-medium">
                {periodo.es_provisional ? '⚠️ Período Provisional' : '✅ Período Confirmado'}
              </p>
            </div>
            <p className="text-2xl font-bold mb-1">
              {formatNombrePeriodo(periodo.mes, periodo.anio)}
            </p>
            <p className="text-sm opacity-90">
              {formatRangoPeriodo(periodo.fecha_inicio, periodo.fecha_fin)}
            </p>
          </div>
          <button 
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded transition-colors"
            title="Editar período"
          >
            ✏️
          </button>
        </div>
        {periodo.es_provisional && (
          <p className="text-xs mt-2 opacity-75">
            👆 Click para ajustar con la factura real
          </p>
        )}
      </div>

      {/* Modal Editar Período */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              📅 Ajustar Período - {formatNombrePeriodo(periodo.mes, periodo.anio)}
            </h2>
            
            <form onSubmit={guardarPeriodo} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Ajusta con la factura real de Itaú</p>
                <p className="text-xs">Las fechas exactas están en tu estado de cuenta mensual</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Inicio del Período *</label>
                <Input
                  type="date"
                  required
                  value={editando.fecha_inicio}
                  onChange={(e) => setEditando({...editando, fecha_inicio: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Fin del Período *</label>
                <Input
                  type="date"
                  required
                  value={editando.fecha_fin}
                  onChange={(e) => setEditando({...editando, fecha_fin: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                <textarea
                  value={editando.notas}
                  onChange={(e) => setEditando({...editando, notas: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ej: Ajustado según factura Itaú del 25/01/2026"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                <p className="font-medium">⚠️ Al guardar:</p>
                <ul className="text-xs mt-1 space-y-1 list-disc list-inside">
                  <li>Los gastos se reagruparán según las nuevas fechas</li>
                  <li>Las estadísticas se recalcularán automáticamente</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setModalAbierto(false)} 
                  className="flex-1"
                  disabled={guardando}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={guardando}
                >
                  {guardando ? '⏳ Guardando...' : '💾 Guardar Período'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
