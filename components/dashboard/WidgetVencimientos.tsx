"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";

export default function WidgetVencimientos() {
  const [vencimientos, setVencimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarVencimientos();
  }, []);

  const cargarVencimientos = async () => {
    try {
      const response = await fetch('/api/gastos?estado=pendiente&limit=20');
      const result = await response.json();
      
      if (result.success) {
        // Ordenar por fecha_vencimiento
        const sorted = result.data
          .filter((g: any) => g.fecha_vencimiento)
          .sort((a: any, b: any) => 
            new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
          )
          .slice(0, 20);
        
        setVencimientos(sorted);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarGastosFijos = async () => {
    try {
      const hoy = new Date();
      const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      
      const response = await fetch('/api/gastos-fijos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        cargarVencimientos();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar gastos fijos');
    }
  };

  const getDiasRestantes = (fecha: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fecha);
    vencimiento.setHours(0, 0, 0, 0);
    const diff = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getColorPorDias = (dias: number) => {
    if (dias < 0) return 'text-red-600 font-bold';
    if (dias === 0) return 'text-orange-600 font-bold';
    if (dias <= 3) return 'text-yellow-600 font-semibold';
    return 'text-gray-600';
  };

  const getTextoPorDias = (dias: number) => {
    if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) > 1 ? 's' : ''}`;
    if (dias === 0) return '¡Vence HOY!';
    if (dias === 1) return 'Vence mañana';
    return `En ${dias} días`;
  };

  if (loading) return <div>Cargando vencimientos...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          🔔 Próximos Vencimientos
        </h3>
        <div className="flex items-center gap-2">
          {vencimientos.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
              {vencimientos.length}
            </span>
          )}
          <Button size="sm" onClick={generarGastosFijos} variant="outline">
            🔄 Generar Fijos
          </Button>
        </div>
      </div>

      {vencimientos.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500 mb-3">
            No hay pagos pendientes con vencimiento
          </p>
          <Button onClick={generarGastosFijos}>
            ➕ Generar Gastos Fijos del Mes
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {vencimientos.map((gasto) => {
            const dias = getDiasRestantes(gasto.fecha_vencimiento);
            return (
              <div 
                key={gasto.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{gasto.descripcion}</p>
                  <p className="text-sm text-gray-600">
                    {gasto.categorias?.nombre || 'Sin categoría'}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(gasto.monto)}</p>
                  <p className={`text-xs ${getColorPorDias(dias)}`}>
                    {getTextoPorDias(dias)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
