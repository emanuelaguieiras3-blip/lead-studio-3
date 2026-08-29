import { NextRequest, NextResponse } from 'next/server';

const MAX_FIELD_LENGTH = 600;

type LeadInput = {
  id: string;
  name: string;
  address: string;
  phone: string;
  mapsUrl: string;
  source: 'google' | 'openstreetmap';
  rating: number | null;
  reviewCount: number | null;
};

type Provider = 'openai' | 'claude' | 'gemini';

const SEGMENT_CONTEXT: Record<string, { desire: string; action: string; proof: string; imagery: string }> = {
  barbearia: { desire: 'identidade, precisão e ritual de cuidado', action: 'agendar um horário', proof: 'acabamento, consistência e experiência', imagery: 'retratos fechados, metal escovado, couro e luz recortada' },
  imobiliária: { desire: 'segurança para decidir e visão de futuro', action: 'solicitar atendimento', proof: 'conhecimento local, curadoria e clareza', imagery: 'arquitetura, luz natural, mapas e enquadramentos amplos' },
  'clínica de estética': { desire: 'autocuidado, confiança e transformação possível', action: 'solicitar uma avaliação', proof: 'acolhimento, método e transparência', imagery: 'pele real, luz difusa, texturas naturais e detalhes delicados' },
  odontologia: { desire: 'segurança, conforto e liberdade para sorrir', action: 'marcar uma consulta', proof: 'clareza clínica, cuidado e confiança', imagery: 'formas orgânicas, luz clínica suave e precisão visual' },
  advocacia: { desire: 'clareza diante de decisões complexas', action: 'conversar com a equipe', proof: 'discrição, método e domínio técnico', imagery: 'tipografia editorial, pedra, papel e luz arquitetônica' },
  restaurante: { desire: 'antecipação, sabor e vontade de viver a experiência', action: 'fazer uma reserva', proof: 'ambiente, cuidado e identidade gastronômica', imagery: 'ingredientes, vapor, gestos de cozinha e luz quente' },
  academia: { desire: 'progresso visível, energia e pertencimento', action: 'conhecer a estrutura', proof: 'rotina, acompanhamento e ambiente', imagery: 'movimento, contraste alto, suor e luz gráfica' },
  'pet shop': { desire: 'tranquilidade para quem cuida e bem-estar para o pet', action: 'pedir atendimento', proof: 'carinho, higiene e confiança', imagery: 'expressões naturais, proximidade e cor controlada' },
  'salão de beleza': { desire: 'autoexpressão, confiança e cuidado pessoal', action: 'reservar um horário', proof: 'escuta, técnica e acabamento', imagery: 'texturas de cabelo, espelhos, movimento e luz editorial' },
  contabilidade: { desire: 'controle, tranquilidade e tempo para crescer', action: 'pedir uma análise inicial', proof: 'organização, clareza e acompanhamento', imagery: 'dados limpos, documentos, grids e detalhes precisos' },
  'oficina mecânica': { desire: 'voltar à estrada com segurança e sem surpresas', action: 'solicitar um diagnóstico', proof: 'transparência, processo e domínio técnico', imagery: 'metal, ferramentas, detalhes mecânicos e luz industrial' },
  fotografia: { desire: 'preservar histórias com uma linguagem autoral', action: 'consultar uma data', proof: 'olhar, direção e consistência estética', imagery: 'luz, grão, enquadramentos imersivos e respiros amplos' },
  psicologia: { desire: 'acolhimento, escuta e um espaço seguro para avançar', action: 'solicitar informações', proof: 'presença, confidencialidade e clareza', imagery: 'luz calma, matéria natural e composições silenciosas' },
  consultoria: { desire: 'clareza estratégica e movimento com direção', action: 'agendar uma conversa', proof: 'método, diagnóstico e visão de negócio', imagery: 'diagramas, tipografia forte e movimento controlado' },
  lavanderia: { desire: 'ganhar tempo com praticidade e confiança', action: 'consultar o atendimento', proof: 'cuidado, higiene e previsibilidade', imagery: 'tecidos, água, dobras e superfícies limpas' },
  'design de interiores': { desire: 'viver melhor em espaços com identidade', action: 'apresentar um projeto', proof: 'repertório, escuta e funcionalidade', imagery: 'materiais, plantas, luz e detalhes arquitetônicos' },
  seguros: { desire: 'proteger escolhas importantes com tranquilidade', action: 'solicitar uma orientação', proof: 'clareza, proximidade e responsabilidade', imagery: 'vida cotidiana, gestos humanos e composição sólida' },
  hotel: { desire: 'pausa, conforto e uma estadia memorável', action: 'consultar disponibilidade', proof: 'hospitalidade, localização e atenção aos detalhes', imagery: 'luz da manhã, tecidos, paisagem e ritmo contemplativo' },
  'auto center': { desire: 'confiança para dirigir e cuidar do patrimônio', action: 'solicitar atendimento', proof: 'diagnóstico, transparência e execução', imagery: 'linhas automotivas, metal, movimento e luz técnica' },
  'agência de marketing': { desire: 'crescimento com identidade e direção', action: 'agendar um diagnóstico', proof: 'estratégia, criatividade e mensuração', imagery: 'tipografia cinética, dados, cultura e composições ousadas' },
};

const CREATIVE_DIRECTIONS: Record<string, { label: string; rhythm: string; interface: string }> = {
  cinematic: { label: 'Cinematográfica', rhythm: 'imersivo, com tensão crescente e grandes momentos de revelação', interface: 'hero de impacto, transições suaves, camadas e movimento ligado ao scroll' },
  editorial: { label: 'Editorial', rhythm: 'preciso, elegante e guiado por tipografia e composição', interface: 'grid assimétrico, respiros amplos, títulos autorais e imagens em escala' },
  conversion: { label: 'Conversão', rhythm: 'direto, confiante e progressivo, removendo objeções a cada bloco', interface: 'hierarquia cristalina, prova perto do CTA e caminhos curtos para contato' },
  local: { label: 'Presença local', rhythm: 'próximo, específico e reconhecível para quem vive na região', interface: 'referências de localização, mapa, contato evidente e sinais reais de proximidade' },
};

function clean(value: unknown, max = MAX_FIELD_LENGTH) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
}

function cleanNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}

function buildProposalText(profile: Record<string, string>, lead: LeadInput, directionKey: string, variation: number) {
  const direction = CREATIVE_DIRECTIONS[directionKey] ?? CREATIVE_DIRECTIONS.cinematic;
  const segment = profile.segment || 'negócio local';
  const city = profile.city || 'sua cidade';
  const state = profile.state || 'SP';
  const leadName = lead.name || 'empresa local';
  const leadAddress = lead.address || `${city}/${state}`;
  const contactLine = lead.phone ? `Contato principal: ${lead.phone}.` : 'Contato público não informado na fonte consultada.';
  const sourceLabel = lead.source === 'google' ? 'Google Places' : 'OpenStreetMap';
  const ratingLine = lead.rating !== null && lead.reviewCount !== null
    ? `Há ${lead.reviewCount.toLocaleString('pt-BR')} avaliações públicas com média de ${lead.rating.toFixed(1)} estrelas.`
    : 'Não há nota pública confiável disponível na fonte consultada.';

  return `Proposta para ${leadName}

Tema: ${segment} em ${city}/${state}
Direção criativa: ${direction.label}
Variação: ${variation + 1}

Olá, meu objetivo é criar uma presença digital premium para ${leadName}, localizado em ${leadAddress}. A proposta é desenvolver uma landing page com linguagem clara, narrativa local e foco em conversão, com elementos de identidade premium e uma experiência mais sofisticada para clientes reais da região.

A página será pensada para comunicar confiança, profissionalismo e valorização do serviço prestado, respeitando os dados públicos disponíveis no cadastro consultado: ${sourceLabel}. ${ratingLine} ${contactLine}

A estrutura será pensada para atrair e converter: abertura forte, reforço da proposta de valor, prova e contexto local, seções de diferenciais, prova social, formas de contato e CTA claro. A comunicação será em português do Brasil, com tom profissional, acolhedor e persuasivo, sem inventar informações que não estejam respaldadas pela fonte.

O resultado esperado é uma página mais memorável, bem posicionada no mercado local e capaz de gerar mais contato, confiança e conversão para o negócio. A proposta segue com foco em clareza, presença local e linguagem premium, sem exageros ou promessas não verificadas.`;
}

function buildOpportunityPrompt(profile: Record<string, string>, lead: LeadInput, directionKey: string, variation: number) {
  const segment = profile.segment.toLowerCase();
  const context = SEGMENT_CONTEXT[segment] ?? {
    desire: 'confiança para escolher e clareza para agir', action: 'iniciar uma conversa',
    proof: 'presença, processo e atendimento', imagery: 'fotografia real, tipografia autoral e detalhes do ofício',
  };
  const direction = CREATIVE_DIRECTIONS[directionKey] ?? CREATIVE_DIRECTIONS.cinematic;
  const seed = hash(`${lead.id}:${directionKey}:${variation}`);
  const concepts = [
    `Da primeira impressão à decisão: transformar ${context.proof} em uma experiência digital que se prova nos detalhes.`,
    `O valor que já existe, agora visível: revelar a qualidade de ${lead.name} com uma narrativa de descoberta progressiva.`,
    `Confiança antes do contato: fazer cada seção reduzir uma dúvida e aumentar a vontade de ${context.action}.`,
    `Presença que se sente: traduzir o negócio real, a localização e o ofício em uma marca digital memorável.`,
  ];
  const heroPatterns = [
    `“${lead.name}. ${context.desire.charAt(0).toUpperCase()}${context.desire.slice(1)}.”`,
    '“Quando cada detalhe importa, a escolha começa aqui.”',
    `“Uma nova forma de viver ${segment} em ${profile.city}.”`,
    '“O cuidado certo muda toda a experiência.”',
  ];
  const concept = concepts[seed % concepts.length];
  const hero = heroPatterns[(seed + variation) % heroPatterns.length];
  const ratingFact = lead.rating !== null && lead.reviewCount !== null
    ? `${lead.rating.toFixed(1)} estrelas em ${lead.reviewCount.toLocaleString('pt-BR')} avaliações públicas`
    : 'a fonte consultada não fornece nota nem avaliações; não criar esses números';
  const phoneFact = lead.phone || 'telefone não informado na fonte';
  const sourceLabel = lead.source === 'google' ? 'Google Places' : 'OpenStreetMap';

  return `# PROMPT DE PRODUÇÃO — ${lead.name}

Crie uma landing page autoral, premium e de alta conversão para **${lead.name}**, um negócio real de **${profile.segment}** em **${profile.city}/${profile.state}**. Use como referência de nível — sem copiar layout, texto ou identidade — a capacidade do projeto Aether 1 de unir storytelling de marca, interações avançadas e tecnologia em uma experiência digital marcante.

## DADOS VERIFICADOS — NÃO ALTERAR NEM COMPLETAR POR SUPOSIÇÃO
- Nome: ${lead.name}
- Segmento pesquisado: ${profile.segment}
- Endereço/localização pública: ${lead.address || `${profile.city}/${profile.state}`}
- Contato público: ${phoneFact}
- Reputação pública: ${ratingFact}
- Fonte do cadastro: ${sourceLabel}
- Link da fonte/mapa: ${lead.mapsUrl || 'não informado'}
- O site não foi informado na fonte consultada. Não afirmar que a empresa nunca teve site.
- É proibido inventar serviços específicos, preços, horários, equipe, anos de mercado, prêmios, depoimentos, certificações, garantias ou resultados.

## HIPÓTESE CRIATIVA EXCLUSIVA
**Direção:** ${direction.label}.
**Conceito:** ${concept}
**Desejo central do público:** ${context.desire}.
**Ritmo narrativo:** ${direction.rhythm}.
**Linguagem visual:** ${context.imagery}; ${direction.interface}.
**Ponto de partida para o hero:** ${hero} Reescreva se necessário, preservando o conceito e sem fazer promessa não comprovada.

## GATILHOS MENTAIS — USO ÉTICO E BASEADO EM FATOS
1. **Especificidade:** citar ${profile.city}, o segmento e detalhes reais da fonte para a página não servir a qualquer empresa.
2. **Prova social:** ${lead.rating !== null ? `usar somente a nota e as ${lead.reviewCount?.toLocaleString('pt-BR')} avaliações acima` : 'não usar notas, estrelas ou quantidade de clientes'}.
3. **Autoridade por processo:** demonstrar clareza, método e cuidado; nunca declarar liderança, superioridade ou especialização sem prova.
4. **Antecipação:** fazer o visitante imaginar a experiência e o benefício emocional antes de apresentar o CTA.
5. **Redução de risco:** explicar o próximo passo com linguagem simples, sem compromisso inventado e sem garantia falsa.
6. **Proximidade:** conectar a mensagem à realidade local de ${profile.city}/${profile.state}.
7. **Curiosidade:** abrir lacunas narrativas entre seções, revelando o valor em etapas sem clickbait.
8. **Microcompromisso:** usar CTAs progressivos — primeiro explorar, depois entender, por fim ${context.action}.
9. **Urgência somente real:** não criar contagem regressiva, vagas limitadas, desconto, escassez ou prazo que não conste nos dados.

## COPY QUE DEVE SER ENTREGUE
Escreva todo o texto final em português do Brasil. A página precisa incluir:
- eyebrow local específico;
- headline curta, original e memorável, sem “excelência”, “transforme seus sonhos” ou clichês semelhantes;
- subheadline que una desejo, clareza e localização;
- CTA principal coerente com o contato disponível e um CTA secundário para ver detalhes;
- uma sequência de 3 blocos de valor, cada um com título de até 5 palavras e texto concreto;
- uma seção “Por que isso importa” com narrativa emocional e racional;
- bloco de confiança usando apenas os dados verificados;
- processo em 3 etapas que explique a jornada sem inventar operação interna;
- respostas para 5 objeções reais do segmento, formuladas sem afirmar fatos desconhecidos;
- CTA final com redução de fricção e instrução clara do próximo passo;
- microcopy de botões, estados, formulário e rodapé.

## EXPERIÊNCIA VISUAL E INTERAÇÕES
- Evite template SaaS, cartões repetitivos, excesso de gradientes e aparência genérica de IA.
- Construa uma abertura memorável com tipografia de grande escala, composição intencional e uma interação principal ligada ao conceito.
- Use movimento para revelar significado: parallax sutil, máscaras, mudanças de escala e transições de seção; respeite prefers-reduced-motion.
- Use imagens reais/licenciadas coerentes com ${profile.segment}; nunca gerar imagens que pareçam retratar equipe, sede ou clientes reais da empresa.
- Faça o mobile parecer projetado, não apenas reduzido: navegação clara, CTA alcançável e leitura confortável.
- Inclua estados hover, focus, loading, sucesso e erro. Garanta contraste, navegação por teclado e HTML semântico.

## ESTRUTURA RECOMENDADA
1. Hero narrativo com proposta, localização e CTA.
2. Sinal de confiança baseado nos dados reais disponíveis.
3. Manifesto curto: o problema vivido pelo cliente e a mudança desejada.
4. Três pilares de valor ligados a ${context.proof}.
5. Seção visual imersiva que demonstre o universo de ${profile.segment} sem alegações factuais.
6. Jornada em três passos e redução de objeções.
7. Localização, mapa/fonte pública e contato real.
8. FAQ e CTA final.

## REGRAS DE IMPLEMENTAÇÃO
- Design responsivo, mobile first, rápido e acessível.
- SEO local natural para “${profile.segment} em ${profile.city}”.
- Metadados, Open Graph, favicon e dados estruturados apenas com fatos disponíveis.
- Botão de telefone somente se houver número real; não presumir que o número possui WhatsApp.
- Não copiar Aether 1. Buscar o mesmo nível de intenção, narrativa e acabamento com uma solução própria para esta oportunidade.
- Não reutilizar headline, conceito, paleta ou sequência narrativa de outro lead.

## RESULTADO
Entregue a página completa, pronta para produção, com copy final e direção visual coerentes. Antes de finalizar, faça uma auditoria factual: toda afirmação sobre ${lead.name} deve ser rastreável aos dados verificados acima. Variação criativa: ${variation + 1}-${seed.toString(36).slice(0, 6)}.`;
}

function extractResponseText(result: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (result.output_text) return result.output_text;
  return result.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? '').join('\n').trim() ?? '';
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 2600,
      instructions: 'Você é um estrategista de proposta e marketing local. Gere um texto de proposta profissional em português do Brasil, com foco em clareza, valor percebido e fechamento ético. Nunca invente dados.',
      input: prompt,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) return null;
  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  return extractResponseText(data);
}

async function callClaude(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest';
  if (!apiKey) return null;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2200,
      system: 'Você é um estrategista de proposta e marketing local. Gere um texto profissional em português do Brasil, com foco em clareza, valor percebido, contexto local e fechamento ético. Nunca invente dados. Responda em texto corrido, sem listas vazias.',
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) return null;
  const data = await response.json() as { content?: Array<{ text?: string }> };
  return data.content?.map((item) => item.text ?? '').join('\n').trim() ?? '';
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) return null;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2200 },
      system_instruction: {
        parts: [{ text: 'Você é um estrategista de proposta e marketing local. Gere um texto profissional em português do Brasil, claro, persuasivo e ético. Nunca invente dados. Responda em texto bem estruturado.' }],
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) return null;
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.text ?? '').join('\n').trim() ?? '';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown> | null;
    const profile = { segment: clean(body?.segment), city: clean(body?.city), state: clean(body?.state) };
    const rawLead = body?.lead && typeof body.lead === 'object' ? body.lead as Record<string, unknown> : {};
    const lead: LeadInput = {
      id: clean(rawLead.id), name: clean(rawLead.name), address: clean(rawLead.address), phone: clean(rawLead.phone),
      mapsUrl: clean(rawLead.mapsUrl), source: rawLead.source === 'google' ? 'google' : 'openstreetmap',
      rating: cleanNumber(rawLead.rating), reviewCount: cleanNumber(rawLead.reviewCount),
    };

    const direction = clean(body?.direction || 'cinematic').toLowerCase();
    const variation = Math.max(0, Math.min(99, Number(body?.variation) || 0));
    const provider = (String(body?.provider || 'claude').toLowerCase() as Provider);

    if (!profile.segment || !profile.city || !profile.state || !lead.id || !lead.name) {
      return NextResponse.json({ error: 'Selecione uma oportunidade real antes de gerar o texto.' }, { status: 400 });
    }

    const sourcePrompt = buildOpportunityPrompt(profile, lead, direction, variation);
    const baseProposal = buildProposalText(profile, lead, direction, variation);
    const proposalPrompt = `Crie uma proposta comercial profissional para ${lead.name}, setor ${profile.segment}, cidade ${profile.city}/${profile.state}. Baseie-se apenas nos dados disponíveis: nome, endereço, telefone, fonte pública, avaliação se existir. A proposta deve ser em português do Brasil, com tom profissional e persuasivo, sem inventar informações.\n\nDados:\n- Nome: ${lead.name}\n- Endereço: ${lead.address || `${profile.city}/${profile.state}`}\n- Telefone: ${lead.phone || 'não informado'}\n- Fonte: ${lead.source === 'google' ? 'Google Places' : 'OpenStreetMap'}\n- Avaliação: ${lead.rating !== null && lead.reviewCount !== null ? `${lead.rating.toFixed(1)} em ${lead.reviewCount.toLocaleString('pt-BR')} avaliações` : 'não disponível'}\n\nEscreva uma proposta de 3 a 5 parágrafos, com apresentação do negócio, contexto local, diferenciais éticos, valor percebido e CTA.`;

    let generatedText = '';
    let activeProvider: Provider = provider;

    if (provider === 'openai') {
      generatedText = (await callOpenAI(proposalPrompt)) || '';
    } else if (provider === 'claude') {
      generatedText = (await callClaude(proposalPrompt)) || '';
    } else if (provider === 'gemini') {
      generatedText = (await callGemini(proposalPrompt)) || '';
    }

    if (!generatedText) {
      const fallbackProviderOrder: Provider[] = ['claude', 'gemini', 'openai'];
      for (const fallbackProvider of fallbackProviderOrder) {
        if (fallbackProvider === provider) continue;
        const text = fallbackProvider === 'claude' ? await callClaude(proposalPrompt) : fallbackProvider === 'gemini' ? await callGemini(proposalPrompt) : await callOpenAI(proposalPrompt);
        if (text) {
          generatedText = text;
          activeProvider = fallbackProvider;
          break;
        }
      }
    }

    const finalText = generatedText || baseProposal;

    return NextResponse.json({
      prompt: sourcePrompt,
      proposal: finalText,
      mode: generatedText ? activeProvider : 'local',
      notice: generatedText
        ? `Texto exclusivo de proposta criado para ${lead.name} via ${activeProvider.toUpperCase()}.`
        : 'Os provedores de IA estão indisponíveis; a proposta foi criada localmente com dados reais da oportunidade.',
    });
  } catch {
    return NextResponse.json({ error: 'Não foi possível gerar o texto desta oportunidade.' }, { status: 500 });
  }
}
