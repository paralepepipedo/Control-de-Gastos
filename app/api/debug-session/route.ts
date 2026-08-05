import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createClient();
        
        // Intentamos obtener el usuario actual basado en la cookie
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        return NextResponse.json({
            estado: "Diagnóstico SSR Supabase",
            tiene_usuario: !!user,
            id_usuario: user ? user.id : null,
            error_usuario: userError ? userError.message : null,
            tiene_sesion: !!session,
            error_sesion: sessionError ? sessionError.message : null
        });
    } catch (error) {
        return NextResponse.json({ error_critico: String(error) }, { status: 500 });
    }
}