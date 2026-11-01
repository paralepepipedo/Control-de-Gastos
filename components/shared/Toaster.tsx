"use client";

import { useEffect, useState } from "react";
import {
  suscribirToasts,
  suscribirConfirm,
  type ToastItem,
  type ConfirmRequest,
} from "@/lib/notify";

const DURACION_MS = 3500;

const estilos: Record<ToastItem["tipo"], { barra: string; icono: string }> = {
  success: { barra: "border-green-500", icono: "✅" },
  error: { barra: "border-red-500", icono: "❌" },
  warning: { barra: "border-yellow-500", icono: "⚠️" },
  info: { barra: "border-blue-500", icono: "ℹ️" },
};

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendiente, setPendiente] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    const offToast = suscribirToasts((t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(
        () => setToasts((prev) => prev.filter((x) => x.id !== t.id)),
        t.tipo === "error" ? DURACION_MS * 2 : DURACION_MS
      );
    });
    const offConfirm = suscribirConfirm((req) => setPendiente(req));
    return () => {
      offToast();
      offConfirm();
    };
  }, []);

  const responder = (ok: boolean) => {
    pendiente?.resolve(ok);
    setPendiente(null);
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 bg-white border-l-4 ${estilos[t.tipo].barra} rounded-lg shadow-lg px-4 py-3 text-sm text-gray-800`}
          >
            <span>{estilos[t.tipo].icono}</span>
            <p className="flex-1 whitespace-pre-line">{t.mensaje}</p>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {pendiente && (
        <div
          className="fixed inset-0 z-[110] bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => responder(false)}
        >
          <div
            role="alertdialog"
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-800 mb-5 whitespace-pre-line">{pendiente.mensaje}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => responder(false)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => responder(true)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
