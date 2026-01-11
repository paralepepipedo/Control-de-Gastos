"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import FormGasto from "@/components/gastos/FormGasto";

export default function BotonFlotante() {
  const [isOpen, setIsOpen] = useState(false);

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
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
