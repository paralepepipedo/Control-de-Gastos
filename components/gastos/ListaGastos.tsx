"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Trash2, Edit } from "lucide-react";

interface Gasto {
  id: number;
  fecha: string;
  monto: number;
  descripcion: string;
  estado: string;
  metodo_pago: string;
  categorias: { nombre: string; icono: string };
}

interface ListaGastosProps {
  gastos: Gasto[];
  onDelete: (id: number) => void;
  onEdit: (gasto: Gasto) => void;
}

export default function ListaGastos({ gastos, onDelete, onEdit }: ListaGastosProps) {
  if (gastos.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500">No hay gastos registrados este mes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gastos.map((gasto) => (
        <div
          key={gasto.id}
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">{gasto.categorias?.icono || '📦'}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{gasto.categorias?.nombre}</p>
                  {gasto.estado === 'pendiente' && (
                    <span className="badge-pendiente">Pendiente</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{gasto.descripcion}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(gasto.fecha)} • {gasto.metodo_pago === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(gasto.monto)}
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(gasto)}
                  className="p-2"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('¿Eliminar este gasto?')) {
                      onDelete(gasto.id);
                    }
                  }}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
