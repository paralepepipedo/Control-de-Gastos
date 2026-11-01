/** Evento global: un gasto se creó desde fuera de la lista (botón flotante) */
export const GASTOS_ACTUALIZADOS = "gastos:actualizados";

export type ToastTipo = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
}

export interface ConfirmRequest {
  mensaje: string;
  resolve: (ok: boolean) => void;
}

type ToastListener = (toast: ToastItem) => void;
type ConfirmListener = (req: ConfirmRequest) => void;

let nextId = 1;
const toastListeners = new Set<ToastListener>();
const confirmListeners = new Set<ConfirmListener>();

export function suscribirToasts(fn: ToastListener) {
  toastListeners.add(fn);
  return () => {
    toastListeners.delete(fn);
  };
}

export function suscribirConfirm(fn: ConfirmListener) {
  confirmListeners.add(fn);
  return () => {
    confirmListeners.delete(fn);
  };
}

function emitir(tipo: ToastTipo, mensaje: string) {
  // Quita el emoji inicial (✅ ❌ ⚠️) porque el toast ya muestra su propio ícono
  const limpio = mensaje.replace(/^(✅|❌|⚠️|ℹ️)\s*/u, "");
  const toast = { id: nextId++, tipo, mensaje: limpio };
  toastListeners.forEach((fn) => fn(toast));
}

export const toast = {
  success: (mensaje: string) => emitir("success", mensaje),
  error: (mensaje: string) => emitir("error", mensaje),
  info: (mensaje: string) => emitir("info", mensaje),
  warning: (mensaje: string) => emitir("warning", mensaje),
};

/** Reemplazo de window.confirm: devuelve una promesa con la decisión del usuario */
export function confirmar(mensaje: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (confirmListeners.size === 0) {
      resolve(window.confirm(mensaje));
      return;
    }
    confirmListeners.forEach((fn) => fn({ mensaje, resolve }));
  });
}
