"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Home, Receipt, FileText, BarChart3, Wallet, Settings, Tag, X } from "lucide-react";

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();

  const cerrarMenu = () => setMenuAbierto(false);

  const menuItems = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: "/gastos", icon: Receipt, label: "Gastos" },
    { href: "/categorias", icon: Tag, label: "Categorías" },
    { href: "/gastos-fijos", icon: FileText, label: "Gastos Fijos" },
    { href: "/provisiones", icon: FileText, label: "Provisiones" },
    { href: "/estadisticas", icon: BarChart3, label: "Estadísticas" },
    { href: "/fondos", icon: Wallet, label: "Fondos" },
    { href: "/config", icon: Settings, label: "Config" },
  ];

  return (
    <>
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2" onClick={cerrarMenu}>
              <Wallet className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-xl">Control Financiero</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMenuAbierto(!menuAbierto)}
              aria-label="Toggle menu"
            >
              {menuAbierto ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              menuAbierto ? "max-h-screen" : "max-h-0"
            }`}
          >
            <div className="pb-4 space-y-1 border-t pt-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={cerrarMenu}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay para cerrar el menú al hacer clic fuera */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 md:hidden"
          style={{ zIndex: 40 }}
          onClick={cerrarMenu}
        />
      )}
    </>
  );
}
