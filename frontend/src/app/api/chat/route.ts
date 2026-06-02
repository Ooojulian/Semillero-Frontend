import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.3 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'OpenAI error');
  return data.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });

    // Traer últimos 6 mensajes del historial para contexto
    const { data: history } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6);

    const historyMessages = (history ?? []).reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Traer candidatos de Supabase
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, full_name, email, position, experience_years, expected_salary, location, status, source, linkedin_url')
      .limit(200);

    const systemPrompt = `Eres un asistente experto en reclutamiento de talento. Ayudas a los recruiters a encontrar candidatos en la base de datos.

Base de datos actual de candidatos (JSON):
${JSON.stringify(candidates ?? [])}

Instrucciones:
- Responde SIEMPRE en español, de forma amable y profesional.
- Cuando el usuario pida candidatos, filtra la lista anterior según sus criterios (cargo, experiencia, salario, ubicación, etc.).
- Responde con JSON puro sin markdown:
  {
    "message": "<tu respuesta en texto>",
    "candidate_ids": ["<id1>", "<id2>", ...]
  }
- candidate_ids debe contener máximo 10 IDs de candidatos que mejor coincidan.
- Si no hay candidatos que coincidan, candidate_ids debe ser [] y explícalo en message.
- Si el usuario hace preguntas generales (no pide candidatos), responde normalmente con candidate_ids: [].
- Usa el historial de conversación para mantener contexto entre mensajes.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message.trim() },
    ];

    let responseMessage = '';
    let filteredCandidates: typeof candidates = [];

    try {
      const gptResponse = await callOpenAI(messages);
      // Limpia posible markdown del response
      const clean = gptResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      responseMessage = parsed.message ?? 'Aquí están los resultados:';
      const ids: string[] = parsed.candidate_ids ?? [];
      filteredCandidates = (candidates ?? []).filter((c) => ids.includes(c.id));
    } catch {
      // Fallback básico si GPT falla
      const kw = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      filteredCandidates = (candidates ?? []).filter((c) =>
        kw.some((k: string) =>
          (c.position ?? '').toLowerCase().includes(k) ||
          (c.location ?? '').toLowerCase().includes(k) ||
          (c.full_name ?? '').toLowerCase().includes(k)
        )
      ).slice(0, 10);
      responseMessage = filteredCandidates.length > 0
        ? `Encontré ${filteredCandidates.length} candidato(s) que podrían interesarte:`
        : 'No encontré candidatos que coincidan. Intenta con otros términos.';
    }

    // Guardar en historial
    await supabase.from('chat_history').insert([
      { user_id: user.id, role: 'user', content: message.trim() },
      {
        user_id: user.id,
        role: 'assistant',
        content: responseMessage,
        candidates: filteredCandidates && filteredCandidates.length > 0 ? filteredCandidates : null,
      },
    ]);

    return NextResponse.json({ message: responseMessage, candidates: filteredCandidates ?? [] });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
