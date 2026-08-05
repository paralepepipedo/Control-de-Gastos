import { createBrowserClient } from '@supabase/ssr';

// Este cliente corre en el navegador y guarda la sesión en las Cookies automáticamente
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
