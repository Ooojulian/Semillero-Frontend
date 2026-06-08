import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  let body: {
    full_name?: string;
    email?: string;
    phone?: string;
    position?: string;
    experience_years?: number;
    expected_salary?: number;
    location?: string;
    profile_url?: string;
    resume_url?: string;
    cover_letter?: string;
  };

  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }); }

  const { full_name, position } = body;
  if (!full_name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  if (!position?.trim()) return NextResponse.json({ error: 'El cargo al que aplicas es requerido' }, { status: 400 });
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Evitar aplicaciones duplicadas del mismo email al mismo cargo
  if (body.email) {
    const { data: existing } = await admin
      .from('candidates')
      .select('id')
      .eq('email', body.email)
      .eq('position', position.trim())
      .eq('source', 'applicant')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una aplicación tuya para este cargo. Te contactaremos pronto.' },
        { status: 409 }
      );
    }
  }

  const { data, error } = await admin
    .from('candidates')
    .insert({
      full_name: full_name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      position: position.trim(),
      experience_years: body.experience_years ?? null,
      expected_salary: body.expected_salary ?? null,
      location: body.location?.trim() || null,
      profile_url: body.profile_url?.trim() || null,
      resume_url: body.resume_url?.trim() || null,
      source: 'applicant',
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: 'Error al enviar la aplicación. Intenta de nuevo.' }, { status: 500 });

  return NextResponse.json({ id: data.id, message: 'Aplicación enviada exitosamente' }, { status: 201 });
}
