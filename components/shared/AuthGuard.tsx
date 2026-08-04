"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    const revisarSesion = async () => {
      // 1. Revisamos si hay una sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Si no hay sesión, lo pateamos al login
        router.push("/login");
      } else {
        // Si hay sesión, lo dejamos pasar
        setAutorizado(true);
      }
    };

    revisarSesion();

    // 2. Nos quedamos escuchando por si el usuario cierra sesión manualmente
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push("/login");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // Mientras verifica, mostramos una pantalla de carga para que no parpadeen los datos
  if (!autorizado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Verificando acceso...</p>
      </div>
    );
  }

  // Si está autorizado, mostramos la aplicación normal
  return <>{children}</>;
}