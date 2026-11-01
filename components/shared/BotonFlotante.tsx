"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import FormGasto from "@/components/gastos/FormGasto";
import { GASTOS_ACTUALIZADOS } from "@/lib/notify";

export default function BotonFlotante() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="floating-button"
        aria-label="Agregar gasto"
      >
        <Plus className="w-6 h-6" />
      </button>

      {isOpen && (
        <FormGasto
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            setIsOpen(false);
            if (pathname === "/gastos") {
              // Ya estamos en la lista: recargarla sin refrescar la página ni mover el scroll
              window.dispatchEvent(new Event(GASTOS_ACTUALIZADOS));
            } else {
              router.push("/gastos");
            }
          }}
        />
      )}
    </>
  );
}
