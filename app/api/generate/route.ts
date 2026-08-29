import { NextRequest, NextResponse } from 'next/server';

const MAX_FIELD_LENGTH = 600;

function getProfessionContext(segment: string) {
  const key = segment.toLowerCase();
  const map: Record<string, string> = {
    barbearia: 'Foque em distinção masculina, precisão de corte, barba, ambiente elegante, confiança e agendamento premium.',
    imobiliária: 'Foque em imóveis de alto padrão, localização, valor, compra e locação com comunicação de confiança e status.',
    'clínica de estética': 'Foque em bem-estar, transformação, estética, acolhimento, tratamentos e sensação de cuidado premium.',
    odontologia: 'Foque em confiança clínica, conforto, saúde bucal, estética e atendimento de alto padrão.',
    advocacia: 'Foque em autoridade, sigilo, expertise jurídica, estratégia e atendimento sério e confiável.',
    restaurante: 'Foque em gastronomia, experiência sensorial, ambiente, reservas, serviço premium e marca memorável.',
    academia: 'Foque em performance, resultado, disciplina, energia, estrutura e transformação corporal.',
    'pet shop': 'Foque em cuidado animal, confiança, banho e tosa, bem-estar e atendimento amigável.',
    'salão de beleza': 'Foque em autoestima, imagem pessoal, beleza, cuidado premium e agenda de serviços.',
    contabilidade: 'Foque em organização, segurança financeira, clareza fiscal, confiança e gestão eficiente.',
    'oficina mecânica': 'Foque em confiança técnica, manutenção, diagnóstico, qualidade de serviço e transparência.',
    fotografia: 'Foque em memória, estética, emoção, portfólio e valor de registrar momentos de alto nível.',
    psicologia: 'Foque em acolhimento, cuidado emocional, clareza e sentimento de segurança no processo terapêutico.',
    consultoria: 'Foque em estratégia, clareza, autoridade, soluções e projeção de crescimento.',
    lavanderia: 'Foque em praticidade, higiene, conveniência, rapidez e confiança no cuidado de roupas.',
    'design de interiores': 'Foque em espaço, beleza, luxo discreto, funcionalidade e transformação emocional do ambiente.',
    seguros: 'Foque em proteção, tranquilidade, clareza e confiança em decisões importantes.',
    hotel: 'Foque em hospitalidade, conforto, experiência memorável, categoria premium e acolhimento.',
    'auto center': 'Foque em confiança automotiva, manutenção, diagnóstico e qualidade de atendimento profissional.',
    'agência de marketing': 'Foque em crescimento, presença digital, autoridade, performance e posicionamento de marca.',
  };

  return map[key] || 'Foque em diferenciais reais do setor, autoridade local, muito clareza e experiência premium para esse negócio.';
}

function getGeminiPrompt(profile: Record<string, string>, leadName?: string) {
  const business = profile.business || 'Seu negócio';
  const segment = profile.segment || 'serviço';
  const cityLine = profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.city || 'sua cidade';
  const audience = profile.audience || 'clientes locais';
  const objective = profile.objective || 'aumentar conversas e agendamentos';
  const leadContext = leadName ? `Empresa selecionada: ${leadName}.` : 'Empresa com potencial de conversão local.';
  const professionContext = getProfessionContext(segment);

  return `Crie um site premium de nível Aether1 para ${business}, um negócio de ${segment} em ${cityLine}. ${leadContext} O público-alvo é ${audience}. O objetivo principal é ${objective}. A direção estética deve ter a mesma energia de uma marca de alto padrão: minimalista, elegante, tecnológica, cinematográfica, muito sofisticada e claramente premium.

ESTRATÉGIA DO NEGÓCIO
${professionContext}

ESTILO DE MARCA
- A marca deve parecer um produto premium de alto valor, e não um site tradicional de prestador de serviço.
- Visual minimalista, editorial e refinado, com sensação de exclusividade.
- Paleta premium: preto, grafite, cinza profundo, branco frio, dourado muito discreto ou prata.
- Tipografia forte, moderna e elegante, com presença e impacto imediato.
- Muito espaço em branco, contraste inteligente, composição precisa e acabamento impecável.
- Design impossível de confundir com template genérico: marca premium, tecnologia e prestígio.

POSICIONAMENTO E VENDAS
- Posicionar ${business} como referência local premium e de confiança.
- Criar percepção de autoridade, qualidade e alto valor percebido em segundos.
- Transformar visitantes locais em conversas, agendamentos e orçamentos.
- Comunicar valor de forma clara, elegante e não genérica.
- Foco em autoridade, estética premium e estratégia de conversão real.

VOZ E COPY
- Linguagem em português do Brasil, sofisticada, direta, aspiracional, refinada e sem clichês.
- Textos curtos, fortes, memoráveis e com presença de marca premium.
- Frases que geram valor percebido e confiança imediata.
- Não usar promessas exageradas, números inventados, depoimentos falsos ou afirmações genéricas.
- Escrever com sensação de marca de alto padrão, não como prestador comum.
- A mensagem precisa refletir exatamente o setor de ${segment.toLowerCase()} e não cair em um tom genérico para qualquer negócio.

ESTRUTURA DA LANDING PAGE
1. Hero cinematográfico e impactante com proposta de valor premium, localização clara e CTA refinado.
2. Seção de reputação e autoridade local, com avaliações reais, diferenciais e prova social.
3. Seção de ${segment} em formato editorial e premium, mostrando benefício e experiência.
4. Diferenciais com narrativa premium, clareza e alto valor percebido.
5. Processo em 3 passos simples, humanizados e fáceis de entender.
6. Bloco de confiança e clareza com segurança, objetivo e atendimento refinado.
7. FAQ elegante com respostas relevantes e úteis.
8. CTA final forte com mapa/localização, contato e rodapé premium.

REQUISITOS TÉCNICOS
- Mobile first, responsivo, rápido e acessível.
- SEO local para “${segment} em ${cityLine}”.
- HTML semântico, navegação acessível e contraste adequado.
- Códigos limpos, organização clara e solução pronta para produção.
- Incluir metadados, Open Graph e favicon.
- Manter o visual premium, discreto, elevado e extremamente bem acabado.
- Ajustar o tom para ${segment.toLowerCase()} em vez de repetir um mesmo briefing para todos os negócios.

ENTREGA
Retorne um prompt de criação de site altamente específico, detalhado e pronto para colar em Gemini, Claude, Cursor, Codex ou ChatGPT. O resultado deve ter nível de acabamento próximo ao de marcas premium top de mercado, com estrutura estratégica, visual imponente e copy refinada, sem inventar informações.

Formato ideal:
- Nome da marca
- Posicionamento premium
- Público-alvo
- Visual e estética
- Hero headline
- Seções e estrutura
- Copy principal
- CTAs premium
- SEO local
- Regras de qualidade
- Resultado esperado`; 
}

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

    const engine = clean(body.engine || '').toLowerCase();
    const leadName = clean(body.leadName || body.lead?.name || '');
    const fallbackPlan = localPlan(profile);

    if (engine === 'gemini') {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        const prompt = getGeminiPrompt(profile, leadName);
        return NextResponse.json({ prompt, plan: fallbackPlan, mode: 'local', notice: 'Gemini não configurado; prompt detalhado gerado localmente.' });
      }

      const geminiPayload = {
        contents: [{
          parts: [{
            text: getGeminiPrompt(profile, leadName),
          }],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1600,
        },
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      });

      const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
      const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';

      if (!response.ok || !text) {
        const fallbackPrompt = getGeminiPrompt(profile, leadName);
        return NextResponse.json({ prompt: fallbackPrompt, plan: fallbackPlan, mode: 'local', notice: result.error?.message || 'Gemini indisponível; prompt local gerado.' });
      }

      return NextResponse.json({ prompt: text, plan: fallbackPlan, mode: 'gemini' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (clean(body.engine) === 'local' || !apiKey) {
      const prompt = getGeminiPrompt(profile, leadName);
      return NextResponse.json({ plan: fallbackPlan, prompt, mode: 'local' });
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
      return NextResponse.json({ plan: fallbackPlan, prompt: getGeminiPrompt(profile, leadName), mode: 'local', notice: result.error?.message || 'OpenAI indisponível.' });
    }
    return NextResponse.json({ plan: safePlan(JSON.parse(result.output_text)), prompt: getGeminiPrompt(profile, leadName), mode: 'openai' });
  } catch {
    return NextResponse.json({ error: 'Ocorreu um erro ao processar a geração.' }, { status: 500 });
  }
}
