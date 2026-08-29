import { NextRequest, NextResponse } from 'next/server';

const MAX_FIELD_LENGTH = 600;

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_FIELD_LENGTH) : '';
}

function localPlan(profile: Record<string, string>) {
  const palettes: Record<string, { primary: string; accent: string; background: string }> = {
    elegante: { primary: '#25231f', accent: '#a9bf46', background: '#f4f0e7' },
    direto: { primary: '#14213d', accent: '#fca311', background: '#f7f8fb' },
    moderno: { primary: '#21164b', accent: '#8cff66', background: '#f0eeff' },
    técnico: { primary: '#12343b', accent: '#2d9d78', background: '#edf5f3' },
    leve: { primary: '#563d5e', accent: '#ff9e80', background: '#fff5ef' },
  };
  const toneKey = Object.keys(palettes).find((key) => profile.tone.toLowerCase().includes(key)) ?? 'elegante';
  const cityLine = profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.city;
  return {
    headline: `${profile.business}: ${profile.segment.toLowerCase()} pensada para você.`,
    subheadline: `${profile.audience || 'Atendimento próximo e personalizado'} em ${cityLine}. Uma experiência clara, humana e feita para ${profile.objective.toLowerCase() || 'gerar resultados reais'}.`,
    cta: profile.objective.toLowerCase().includes('whatsapp') ? 'Falar pelo WhatsApp' : 'Quero conversar',
    benefits: ['Atendimento sob medida', `Presença forte em ${profile.city}`, 'Contato rápido e transparente'],
    tone: profile.tone,
    palette: palettes[toneKey],
  };
}

function safePlan(plan: ReturnType<typeof localPlan>) {
  const fallback = { primary: '#25231f', accent: '#a9bf46', background: '#f4f0e7' };
  const color = (value: string, key: keyof typeof fallback) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback[key];
  return {
    headline: clean(plan.headline), subheadline: clean(plan.subheadline), cta: clean(plan.cta),
    benefits: Array.isArray(plan.benefits) ? plan.benefits.slice(0, 3).map(clean) : localPlan({ business: 'Seu negócio', segment: 'serviço', audience: '', objective: '', tone: '', city: '', state: '' }).benefits,
    tone: clean(plan.tone),
    palette: { primary: color(plan.palette?.primary, 'primary'), accent: color(plan.palette?.accent, 'accent'), background: color(plan.palette?.background, 'background') },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = {
      business: clean(body.business), segment: clean(body.segment), audience: clean(body.audience),
      objective: clean(body.objective), tone: clean(body.tone), city: clean(body.city), state: clean(body.state),
    };
    if (!profile.business || !profile.segment || !profile.city) {
      return NextResponse.json({ error: 'Perfil incompleto.' }, { status: 400 });
    }
    const fallbackPlan = localPlan(profile);
    const apiKey = process.env.OPENAI_API_KEY;
    if (clean(body.engine) === 'local' || !apiKey) {
      return NextResponse.json({ plan: fallbackPlan, mode: 'local' });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        store: false,
        max_output_tokens: 900,
        instructions: 'Você é o agente do Lead Studio, especialista em landing pages brasileiras de alta conversão. Crie copy clara, específica e ética. Não invente números, avaliações, certificações ou garantias. Responda somente no JSON solicitado, em português do Brasil.',
        input: `Crie o plano de uma landing page para este perfil:\n${JSON.stringify(profile)}`,
        text: {
          format: {
            type: 'json_schema', name: 'lead_site_plan', strict: true,
            schema: {
              type: 'object', additionalProperties: false,
              properties: {
                headline: { type: 'string' }, subheadline: { type: 'string' }, cta: { type: 'string' },
                benefits: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
                tone: { type: 'string' },
                palette: {
                  type: 'object', additionalProperties: false,
                  properties: { primary: { type: 'string' }, accent: { type: 'string' }, background: { type: 'string' } },
                  required: ['primary', 'accent', 'background'],
                },
              },
              required: ['headline', 'subheadline', 'cta', 'benefits', 'tone', 'palette'],
            },
          },
        },
      }),
    });

    const result = await response.json() as { output_text?: string; error?: { message?: string } };
    if (!response.ok || !result.output_text) {
      return NextResponse.json({ plan: fallbackPlan, mode: 'local', notice: result.error?.message || 'OpenAI indisponível.' });
    }
    return NextResponse.json({ plan: safePlan(JSON.parse(result.output_text)), mode: 'openai' });
  } catch {
    return NextResponse.json({ error: 'Ocorreu um erro ao processar a geração.' }, { status: 500 });
  }
}
