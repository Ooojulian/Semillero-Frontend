import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('vacancies')
    .select('id, title, company, description, location, modality, salary_min, salary_max, experience_years_min, skills, deadline')
    .eq('id', params.id)
    .eq('status', 'active')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });
  return NextResponse.json(data);
}
