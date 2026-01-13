"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import FormGasto from "@/components/gastos/FormGasto";

export default function BotonFlotante() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

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
  setTimeout(() => {
    window.location.href = '/gastos';
  }, 500);
}}
        />
      )}
    </>
  );
}
