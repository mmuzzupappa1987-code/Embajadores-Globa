import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: emb } = await supabaseAdmin
    .from('embajadores')
    .select('es_admin')
    .eq('user_id', user.id)
    .single();

  if (!emb?.es_admin) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { nombre, email, password } = await req.json();
  if (!nombre || !email || !password) {
    return NextResponse.json({ error: 'Faltan datos: nombre, email y contraseña son requeridos' }, { status: 400 });
  }

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const { error: insertError } = await supabaseAdmin.from('embajadores').insert({
    user_id: newUser.user.id,
    nombre: nombre.trim(),
    es_admin: false,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, nombre });
}
