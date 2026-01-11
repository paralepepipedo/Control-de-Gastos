import Link from 'next/link';
import { BarChart3, Table2, GitCompare } from 'lucide-react';

export default function EstadisticasPage() {
  const opciones = [
    {
      id: 1,
      titulo: 'Tabla Dinámica Excel',
      descripcion: 'Visualiza y edita proyecciones en tabla editable con colores según solvencia',
      icono: Table2,
      href: '/estadisticas/opcion-uno',
      color: 'bg-blue-500',
    },
    {
      id: 2,
      titulo: 'Dashboard Híbrido',
      descripcion: 'Tabla resumida con gráficos interactivos y KPIs financieros',
      icono: BarChart3,
      href: '/estadisticas/opcion-dos',
      color: 'bg-green-500',
    },
    {
      id: 3,
      titulo: 'Sistema de Escenarios',
      descripcion: 'Simula diferentes escenarios y compara resultados lado a lado',
      icono: GitCompare,
      href: '/estadisticas/opcion-tres',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Estadísticas y Proyecciones</h1>
        <p className="text-gray-600 mt-2">
          Selecciona una opción para visualizar y simular tus finanzas futuras
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {opciones.map((opcion) => {
          const Icon = opcion.icono;
          return (
            <Link
              key={opcion.id}
              href={opcion.href}
              className="group block p-6 bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className={`w-12 h-12 ${opcion.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {opcion.titulo}
              </h3>
              <p className="text-gray-600 text-sm">
                {opcion.descripcion}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
