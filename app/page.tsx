'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type StateOption = { id: number; sigla: string; nome: string };
type CityOption = { id: number; nome: string };
type Profession = { id: string; label: string; icon: string; style: string; services: string };
type Lead = {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string;
  phone: string;
  website: null;
  mapsUrl: string;
  source: 'google' | 'openstreetmap';
  verificationLabel: string;
};

type SearchApiResponse = {
  leads?: Lead[];
  mode?: 'idle' | 'blocked' | 'google' | 'openstreetmap';
  notice?: string;
  error?: string;
};

type AppMode = 'idle' | 'blocked' | 'google' | 'openstreetmap';

type GenerateApiResponse = {
  prompt?: string;
  proposal?: string;
  suggestions?: string | null;
  notice?: string;
  mode?: string;
  provider?: 'openai' | 'claude' | 'gemini' | null;
  error?: string;
};

type BuildSiteApiResponse = {
  provider?: 'kimi' | 'openai' | 'cursor' | 'puter';
  code?: string;
  model?: string;
  html?: string;
  usage?: { input: number | null; output: number | null; total: number | null; cached: number | null };
  agentId?: string;
  runId?: string;
  trackingToken?: string;
  status?: string;
  done?: boolean;
  result?: string | null;
  prUrl?: string | null;
  notice?: string;
  error?: string;
};

type CursorJob = { agentId: string; runId: string; trackingToken: string };

type PuterClient = {
  ai: {
    chat: (messages: Array<{ role: 'system' | 'user'; content: string }>, options: {
      model: string;
      max_tokens: number;
      temperature: number;
    }) => Promise<unknown>;
  };
};

let puterLoader: Promise<PuterClient> | null = null;

function getPuterClient(): PuterClient | undefined {
  return (window as typeof window & { puter?: PuterClient }).puter;
}

function loadPuterClient(): Promise<PuterClient> {
  const activeClient = getPuterClient();
  if (activeClient) return Promise.resolve(activeClient);
  if (puterLoader) return puterLoader;

  puterLoader = new Promise<PuterClient>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-lead-studio-puter]');
    const script = existingScript || document.createElement('script');
    const handleLoad = () => {
      const client = getPuterClient();
      if (client) resolve(client);
      else reject(new Error('A integração de IA não carregou corretamente.'));
    };
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('Não foi possível carregar a IA de programação.')), { once: true });
    if (!existingScript) {
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      script.dataset.leadStudioPuter = 'true';
      document.head.appendChild(script);
    }
  });
  return puterLoader;
}

function extractPuterText(result: unknown): string {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return '';
  const response = result as { text?: unknown; message?: { content?: unknown } };
  if (typeof response.text === 'string') return response.text;
  const content = response.message?.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') return item.text;
    return '';
  }).join('\n').trim();
}

function buildPuterCodingPrompt(brief: string): string {
  return `Você é um engenheiro frontend sênior especializado em landing pages de alta conversão. Gere somente um documento HTML5 completo começando por <!doctype html>. Inclua CSS e JavaScript no próprio arquivo, sem bibliotecas, fontes, iframes ou scripts externos. Use português do Brasil, layout mobile first, acessível e responsivo. Não invente telefone, endereço, avaliações, serviços, preços, equipe ou depoimentos. Omita dados ausentes ou marque [VALIDAR COM O NEGÓCIO]. Não faça requisições de rede nem simule envio de formulários. Respeite prefers-reduced-motion e contraste WCAG AA.\n\nESPECIFICAÇÃO VERIFICADA:\n${brief}`;
}

async function createSiteWithPuter(brief: string): Promise<BuildSiteApiResponse> {
  const client = await loadPuterClient();
  const result = await client.ai.chat([
    { role: 'system', content: 'Você é um excelente engenheiro frontend. Responda somente com o HTML completo solicitado.' },
    { role: 'user', content: buildPuterCodingPrompt(brief) },
  ], {
    model: 'claude-sonnet-4-6',
    max_tokens: 16_000,
    temperature: 0.2,
  });
  const rawContent = extractPuterText(result);
  if (!rawContent) throw new Error('Claude não retornou o código do site. Tente novamente.');

  const response = await fetch('/api/build-site', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sanitize', rawContent }),
  });
  const data = await response.json() as BuildSiteApiResponse;
  if (!response.ok || !data.html) throw new Error(data.error || 'O código gerado não passou pela validação de segurança.');
  return data;
}

const states: StateOption[] = [
  { id: 12, sigla: 'AC', nome: 'Acre' }, { id: 27, sigla: 'AL', nome: 'Alagoas' },
  { id: 16, sigla: 'AP', nome: 'Amapá' }, { id: 13, sigla: 'AM', nome: 'Amazonas' },
  { id: 29, sigla: 'BA', nome: 'Bahia' }, { id: 23, sigla: 'CE', nome: 'Ceará' },
  { id: 53, sigla: 'DF', nome: 'Distrito Federal' }, { id: 32, sigla: 'ES', nome: 'Espírito Santo' },
  { id: 52, sigla: 'GO', nome: 'Goiás' }, { id: 21, sigla: 'MA', nome: 'Maranhão' },
  { id: 51, sigla: 'MT', nome: 'Mato Grosso' }, { id: 50, sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { id: 31, sigla: 'MG', nome: 'Minas Gerais' }, { id: 15, sigla: 'PA', nome: 'Pará' },
  { id: 25, sigla: 'PB', nome: 'Paraíba' }, { id: 41, sigla: 'PR', nome: 'Paraná' },
  { id: 26, sigla: 'PE', nome: 'Pernambuco' }, { id: 22, sigla: 'PI', nome: 'Piauí' },
  { id: 33, sigla: 'RJ', nome: 'Rio de Janeiro' }, { id: 24, sigla: 'RN', nome: 'Rio Grande do Norte' },
  { id: 43, sigla: 'RS', nome: 'Rio Grande do Sul' }, { id: 11, sigla: 'RO', nome: 'Rondônia' },
  { id: 14, sigla: 'RR', nome: 'Roraima' }, { id: 42, sigla: 'SC', nome: 'Santa Catarina' },
  { id: 35, sigla: 'SP', nome: 'São Paulo' }, { id: 28, sigla: 'SE', nome: 'Sergipe' },
  { id: 17, sigla: 'TO', nome: 'Tocantins' },
];

const professions: Profession[] = [
  { id: 'barbearia', label: 'Barbearia', icon: '✂', style: 'masculino sofisticado, editorial, grafite, creme e cobre', services: 'cortes, barba, tratamentos e agendamento' },
  { id: 'imobiliaria', label: 'Imobiliária', icon: '⌂', style: 'arquitetônico premium, muito espaço em branco, azul profundo e areia', services: 'imóveis em destaque, venda, locação e avaliação' },
  { id: 'estetica', label: 'Clínica de estética', icon: '✦', style: 'elegante, acolhedor, tons naturais e fotografia luminosa', services: 'procedimentos, benefícios, equipe e avaliação' },
  { id: 'odontologia', label: 'Odontologia', icon: '◌', style: 'clínico contemporâneo, branco, azul petróleo e formas suaves', services: 'especialidades, equipe, estrutura e consulta' },
  { id: 'advocacia', label: 'Advocacia', icon: '§', style: 'sóbrio, editorial, tipografia clássica e detalhes dourados discretos', services: 'áreas de atuação, equipe e atendimento confidencial' },
  { id: 'restaurante', label: 'Restaurante', icon: '◉', style: 'sensorial, fotografia grande, tipografia expressiva e cores quentes', services: 'cardápio, reservas, ambiente e localização' },
  { id: 'academia', label: 'Academia', icon: '↗', style: 'energético, contraste alto, preto, branco e verde vibrante', services: 'modalidades, planos, professores e aula experimental' },
  { id: 'petshop', label: 'Pet shop', icon: '♡', style: 'amigável, colorido sofisticado e ilustrações leves', services: 'banho e tosa, produtos, veterinária e agendamento' },
  { id: 'beleza', label: 'Salão de beleza', icon: '◇', style: 'fashion, delicado, editorial e sofisticado', services: 'cabelo, unhas, maquiagem e reservas' },
  { id: 'contabilidade', label: 'Contabilidade', icon: '▦', style: 'confiável, objetivo, azul marinho e verde discreto', services: 'abertura de empresa, fiscal, folha e consultoria' },
  { id: 'oficina', label: 'Oficina mecânica', icon: '⚙', style: 'industrial refinado, grafite, branco e laranja', services: 'revisão, manutenção, diagnóstico e orçamento' },
  { id: 'fotografia', label: 'Fotografia', icon: '□', style: 'portfólio minimalista, imagens imersivas e tipografia autoral', services: 'portfólio, ensaios, eventos e orçamento' },
  { id: 'psicologia', label: 'Psicologia', icon: '◈', style: 'sereno, acolhedor, toms suaves e mídias editoriais', services: 'atendimento, especialidades, abordagem e agendamento' },
  { id: 'consultoria', label: 'Consultoria', icon: '▣', style: 'executivo, premium, arrojado e muito claro', services: 'serviços, diferenciais, autoridade e contato' },
  { id: 'lavanderia', label: 'Lavanderia', icon: '✧', style: 'limpo, funcional, organizado e visual moderno', services: 'serviços, prazos, agendamento e confiança' },
  { id: 'design', label: 'Design de interiores', icon: '▤', style: 'elegante, deslumbrante, sobriedade e materiais premium', services: 'projetos, estilo, portfólio e orçamento' },
  { id: 'seguradora', label: 'Seguros', icon: '▨', style: 'confiável, institucional, azul e branco com presença sólida', services: 'planos, proteção, atendimento e assessoria' },
  { id: 'hotel', label: 'Hotel', icon: '✺', style: 'hospitality premium, delicado, acolhedor e contemporâneo', services: 'acomodações, experiência, reservas e localização' },
  { id: 'auto', label: 'Auto Center', icon: '⟡', style: 'automotivo premium, grafite, metal e energia profissional', services: 'venda, manutenção, vistoria e atendimento' },
  { id: 'marketing', label: 'Agência de marketing', icon: '✹', style: 'moderno, estratégico, vibrante, claro e versátil', services: 'posicionamento, tráfego, branding e métricas' },
];

const creativeDirections = [
  { id: 'cinematic', name: 'Cinematográfica', kind: 'Storytelling imersivo', color: '#4d8bff', reason: 'Grandes momentos visuais, ritmo narrativo e interações com intenção.' },
  { id: 'editorial', name: 'Editorial', kind: 'Tipografia e composição', color: '#b088ff', reason: 'Uma presença sofisticada, autoral e guiada por conteúdo.' },
  { id: 'conversion', name: 'Conversão', kind: 'Clareza e persuasão', color: '#5ecf8f', reason: 'Gatilhos éticos, objeções bem tratadas e contato sem fricção.' },
  { id: 'local', name: 'Presença local', kind: 'Proximidade e confiança', color: '#d39a72', reason: 'Localização, relevância regional e dados públicos no centro da copy.' },
];

const LEADS_PER_PAGE = 8;

function socialSearchUrl(platform: 'instagram' | 'facebook', lead: Lead, city: string): string {
  const query = encodeURIComponent(`${lead.name} ${city}`);
  return platform === 'instagram'
    ? `https://www.instagram.com/explore/search/keyword/?q=${query}`
    : `https://www.facebook.com/search/pages?q=${query}`;
}

function getProfessionSpecificStrategy(profession: Profession) {
  const key = profession.id.toLowerCase();
  const strategies: Record<string, string> = {
    barbearia: 'Foque em distinção masculina, precisão de corte, barba, ambiente elegante, confiança e agendamento premium.',
    imobiliaria: 'Foque em imóveis de alto padrão, localização, valor, compra e locação com comunicação de confiança e status.',
    estetica: 'Foque em bem-estar, transformação, estética, acolhimento, tratamentos e sensação de cuidado premium.',
    odontologia: 'Foque em confiança clínica, conforto, saúde bucal, estética e atendimento de alto padrão.',
    advocacia: 'Foque em autoridade, sigilo, expertise jurídica, estratégia e atendimento sério e confiável.',
    restaurante: 'Foque em gastronomia, experiência sensorial, ambiente, reservas, serviço premium e marca memorável.',
    academia: 'Foque em performance, resultado, disciplina, energia, estrutura e transformação corporal.',
    petshop: 'Foque em cuidado animal, confiança, banho e tosa, bem-estar e atendimento amigável.',
    beleza: 'Foque em autoestima, imagem pessoal, beleza, cuidado premium e agenda de serviços.',
    contabilidade: 'Foque em organização, segurança financeira, clareza fiscal, confiança e gestão eficiente.',
    oficina: 'Foque em confiança técnica, manutenção, diagnóstico, qualidade de serviço e transparência.',
    fotografia: 'Foque em memória, estética, emoção, portfólio e valor de registrar momentos de alto nível.',
    psicologia: 'Foque em acolhimento, cuidado emocional, clareza e sentimento de segurança no processo terapêutico.',
    consultoria: 'Foque em estratégia, clareza, autoridade, soluções e projeção de crescimento.',
    lavanderia: 'Foque em praticidade, higiene, conveniência, rapidez e confiança no cuidado de roupas.',
    design: 'Foque em espaço, beleza, luxo discreto, funcionalidade e transformação emocional do ambiente.',
    seguradora: 'Foque em proteção, tranquilidade, clareza e confiança em decisões importantes.',
    hotel: 'Foque em hospitalidade, conforto, experiência memorável, categoria premium e acolhimento.',
    auto: 'Foque em confiança automotiva, manutenção, diagnóstico e qualidade de atendimento profissional.',
    marketing: 'Foque em crescimento, presença digital, autoridade, performance e posicionamento de marca.',
  };

  return strategies[key] || `Foque em diferenciais reais do setor, autoridade local, muito clareza e experiência premium para ${profession.label}.`;
}

// Mantido apenas como referência editorial legada; a geração ativa acontece no servidor.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildPrompt(lead: Lead | null, profession: Profession, city: string, uf: string) {
  const business = lead?.name ?? `uma ${profession.label.toLowerCase()} em ${city}`;
  const proof = lead && lead.rating !== null && lead.reviewCount !== null
    ? `${lead.rating.toFixed(1)} estrelas e ${lead.reviewCount.toLocaleString('pt-BR')} avaliações públicas`
    : 'cadastro público real sem nota disponível';
  const contact = lead?.phone ? `Telefone público para contato: ${lead.phone}.` : 'Telefone ainda não informado.';
  const professionStrategy = getProfessionSpecificStrategy(profession);

  return `Crie um site premium de nível Aether1 para ${business}, uma empresa de ${profession.label} em ${city}/${uf}. A referência visual é uma marca premium de alto padrão: sofisticada, moderna, editorial, discreta, tecnológica, cinematográfica e extremamente refinada. O objetivo é transmitir prestígio imediato, confiança, exclusividade e alta conversão local.

ESTRATÉGIA ESPECÍFICA DO NEGÓCIO
${professionStrategy}

OBJETIVO E POSICIONAMENTO
- Posicionar ${business} como a opção premium e mais confiável do mercado local.
- Fazer o visitante sentir que está diante de uma marca de alto nível, não de um prestador genérico.
- Transformar acesso em contato, agendamento ou orçamento com um storytelling premium e uma experiência sem ruído.
- Usar apenas informações reais: ${proof}. ${contact}
- Não inventar depoimentos, prêmios, números, certificações, especialistas ou benefícios que não tenham suporte factual.

DIREÇÃO VISUAL
Visual ${profession.style}. O site deve parecer um produto premium de marca, não um template comum. Use:
- paleta premium e refinada, com contraste elegante e muita clareza visual;
- muita whitespace, tipografia forte e editorial, microinterações discretas;
- pouca decoração, muito impacto, sensação de luxo sem exagero;
- composição visual que remeta a marcas de alta categoria e produto premium;
- estética minimalista, intensa, sofisticada e tecnológica, com acabamento impecável.

ESTRUTURA DA LANDING PAGE
1. Hero cinematográfico: frase principal forte, proposta de valor premium, localização clara e CTA refinado como “Falar com a equipe” ou “Solicitar atendimento”.
2. Seção de reputação e prova social local com avaliação real, comentários relevantes e contexto de confiança.
3. Seção de ${profession.services} em layout premium, editorial e fácil de consumir.
4. Diferenciais e benefícios em visão de marca: clareza, estratégia, experiência e valor percebido.
5. Processo em 3 passos simples, humanizados e pensados para reduzir objeções.
6. Seção de experiência/segurança/confiança com linguagem premium e muito objetiva.
7. FAQ elegante, direto às dúvidas mais comuns dos clientes locais.
8. CTA final sofisticado com mapa, endereço, contato e rodapé premium.

COPY E COMUNICAÇÃO
- Texto em português do Brasil, premium, direto, inteligente e memorável.
- Linguagem aspiracional, clara e sofisticada, sem clichês ou promessas vazias.
- Frases fortes, curtas e impactantes, com sensação de autoridade e exclusividade.
- Falar como marca premium, não como escritório genérico.
- Descrever valor, clareza, atendimento e conforto com refinamento.
- A mensagem deve refletir exatamente o segmento de ${profession.label.toLowerCase()} e não parecer genérica para qualquer negócio.

REQUISITOS TÉCNICOS
- Mobile first, responsivo, veloz e acessível.
- SEO local para “${profession.label} em ${city}”.
- HTML semântico, navegação por teclado, contraste adequado e boa performance.
- CTA com telefone público real, sem inventar WhatsApp ou canal inexistente.
- Componentes reutilizáveis, código limpo, pronto para produção.
- Incluir metadados, Open Graph, favicon e microinterações discretas.
- Visual premium, aspiracional, sofisticado e extremamente bem acabado.

ENTREGA FINAL
Retorne a landing page pronta em estrutura, copy, seções, CTAs e direção visual premium, com nível de acabamento e sofisticação comparável ao visual de uma marca de alto padrão como Aether1, sem inventar informações. A proposta precisa refletir a realidade de ${profession.label.toLowerCase()} e não repetir a mesma mensagem para todos os negócios.

Formato de saída recomendado:
- Nome da marca
- Posicionamento premium
- Público-alvo
- Visual e estética
- Hero headline
- Seções com copy principal
- CTAs premium
- SEO local
- Regras de qualidade
- Resultado final esperado`; 
}

export default function Home() {
  const [professionId, setProfessionId] = useState('barbearia');
  const [stateId, setStateId] = useState('35');
  const [cities, setCities] = useState<CityOption[]>([]);
  const [city, setCity] = useState('São Paulo');
  const [minReviews, setMinReviews] = useState('30');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadPage, setLeadPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState('Os resultados serão consultados em fontes públicas rastreáveis.');
  const [mode, setMode] = useState<AppMode>('idle');
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [activeDirection, setActiveDirection] = useState('cinematic');
  const [variation, setVariation] = useState(0);
  const [aiProvider, setAiProvider] = useState<'local' | 'auto' | 'openai' | 'claude' | 'gemini'>('local');
  const [activeAiProvider, setActiveAiProvider] = useState('local');
  const [generatedBrief, setGeneratedBrief] = useState('');
  const [buildingSite, setBuildingSite] = useState<'internal' | 'cursor' | null>(null);
  const [generatedSiteHtml, setGeneratedSiteHtml] = useState('');
  const [generatedSiteProvider, setGeneratedSiteProvider] = useState('');
  const [siteBuildNotice, setSiteBuildNotice] = useState('Gere um prompt e construa o site sem sair do Lead Studio.');
  const [siteUsage, setSiteUsage] = useState<number | null>(null);
  const [cursorJob, setCursorJob] = useState<CursorJob | null>(null);
  const [cursorStatus, setCursorStatus] = useState('');
  const [cursorResult, setCursorResult] = useState('');
  const [cursorPrUrl, setCursorPrUrl] = useState('');
  const generationRequest = useRef(0);

  const state = useMemo(() => states.find((item) => String(item.id) === stateId) ?? states[24], [stateId]);
  const profession = useMemo(() => professions.find((item) => item.id === professionId) ?? professions[0], [professionId]);
  const activePrompt = generatedBrief || 'Selecione uma oportunidade real para gerar um prompt exclusivo com gatilhos mentais.';
  const totalLeadPages = Math.max(1, Math.ceil(leads.length / LEADS_PER_PAGE));
  const currentLeadPage = Math.min(leadPage, totalLeadPages);
  const paginatedLeads = useMemo(
    () => leads.slice((currentLeadPage - 1) * LEADS_PER_PAGE, currentLeadPage * LEADS_PER_PAGE),
    [currentLeadPage, leads],
  );
  const firstVisibleLead = leads.length ? (currentLeadPage - 1) * LEADS_PER_PAGE + 1 : 0;
  const lastVisibleLead = Math.min(currentLeadPage * LEADS_PER_PAGE, leads.length);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`, { signal: controller.signal })
      .then((response) => response.json() as Promise<CityOption[]>)
      .then((data) => {
        setCities(data);
        setCity((current) => data.some((item) => item.nome === current) ? current : (data[0]?.nome ?? ''));
      })
      .catch((error) => { if (error instanceof Error && error.name !== 'AbortError') setCities([]); })
      .finally(() => setLoadingCities(false));
    return () => controller.abort();
  }, [stateId]);

  useEffect(() => {
    if (!cursorJob) return undefined;
    let cancelled = false;
    let timer: number | undefined;

    async function pollCursor(): Promise<void> {
      try {
        const response = await fetch('/api/build-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cursor_status', ...cursorJob }),
        });
        const data = await response.json() as BuildSiteApiResponse;
        if (!response.ok) throw new Error(data.error || 'Não foi possível acompanhar o Cursor.');
        if (cancelled) return;

        setCursorStatus(data.status || 'RUNNING');
        setSiteBuildNotice(data.notice || 'Cursor trabalhando dentro do Lead Studio.');
        if (data.result) setCursorResult(data.result);
        if (data.prUrl) setCursorPrUrl(data.prUrl);
        if (data.html) {
          setGeneratedSiteHtml(data.html);
          setGeneratedSiteProvider('Cursor');
          window.requestAnimationFrame(() => document.getElementById('site-gerado')?.scrollIntoView({ behavior: 'smooth' }));
        }
        if (data.done) {
          setCursorJob(null);
          return;
        }
        timer = window.setTimeout(() => void pollCursor(), 5_000);
      } catch (error) {
        if (cancelled) return;
        setSiteBuildNotice(error instanceof Error ? error.message : 'Não foi possível acompanhar o Cursor.');
        timer = window.setTimeout(() => void pollCursor(), 10_000);
      }
    }

    timer = window.setTimeout(() => void pollCursor(), 3_500);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [cursorJob]);

  function resetResults(message?: string) {
    setCopied(false);
    setGeneratedBrief('');
    setActiveAiProvider('local');
    setGeneratedSiteHtml('');
    setGeneratedSiteProvider('');
    setSiteUsage(null);
    setCursorJob(null);
    setCursorStatus('');
    setCursorResult('');
    setCursorPrUrl('');
    setLeads([]);
    setLeadPage(1);
    setSelectedLead(null);
    setVariation(0);
    if (message) setNotice(message);
  }

  async function searchLeads() {
    if (!city) return;
    setSearching(true);
    setMode('idle');
    setNotice('Analisando negócios sem site e ordenando por avaliações...');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profession: profession.label, city, state: state.nome, minReviews: Number(minReviews) }),
      });
      const data = (await response.json()) as SearchApiResponse;
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível pesquisar.');
      }
      const nextLeads = data.leads ?? [];
      setLeads(nextLeads);
      setLeadPage(1);
      setSelectedLead(null);
      setGeneratedBrief('');
      setMode(data.mode ?? 'idle');
      setNotice(data.notice || 'Busca concluída.');
    } catch (error) {
      setLeads([]);
      setLeadPage(1);
      setSelectedLead(null);
      setNotice(error instanceof Error ? error.message : 'Não foi possível pesquisar.');
    } finally {
      setSearching(false);
    }
  }

  async function generateIntegratedPrompt(
    direction = activeDirection,
    leadOverride?: Lead,
    variationOverride = variation,
    providerOverride = aiProvider,
  ) {
    const lead = leadOverride ?? selectedLead;
    if (!lead) {
      setNotice('Selecione uma oportunidade real para gerar o texto.');
      return '';
    }
    const requestId = generationRequest.current + 1;
    generationRequest.current = requestId;
    setGeneratingPrompt(true);
    setNotice(`Criando uma narrativa exclusiva para ${lead.name}...`);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: profession.label,
          city,
          state: state.sigla,
          lead,
          direction,
          provider: providerOverride,
          variation: variationOverride,
        }),
      });
      const data = (await response.json()) as GenerateApiResponse & { proposal?: string };
      if (!response.ok || !data.prompt) throw new Error(data.error || 'Não foi possível gerar o prompt.');
      if (generationRequest.current !== requestId) return '';
      const nextPrompt = data.prompt;
      setGeneratedBrief(nextPrompt);
      setActiveAiProvider(data.provider ?? 'local');
      setNotice(data.notice || `Texto exclusivo criado para ${lead.name}.`);
      return nextPrompt;
    } catch (error) {
      if (generationRequest.current === requestId) {
        setGeneratedBrief('');
        setActiveAiProvider('local');
        setNotice(error instanceof Error ? error.message : 'Não foi possível gerar o brief.');
      }
      return '';
    } finally {
      if (generationRequest.current === requestId) setGeneratingPrompt(false);
    }
  }

  async function selectOpportunity(lead: Lead) {
    setSelectedLead(lead);
    setGeneratedBrief('');
    setVariation(0);
    await generateIntegratedPrompt(activeDirection, lead, 0);
  }

  function goToLeadPage(page: number) {
    setLeadPage(Math.max(1, Math.min(totalLeadPages, page)));
    window.requestAnimationFrame(() => {
      document.getElementById('oportunidades')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function regenerateVariation() {
    if (!selectedLead) return;
    const nextVariation = variation + 1;
    setVariation(nextVariation);
    await generateIntegratedPrompt(activeDirection, selectedLead, nextVariation);
  }

  async function copyPrompt() {
    if (!generatedBrief) return;
    await navigator.clipboard.writeText(activePrompt);
    setCopied(true);
    setNotice('Prompt copiado. Ele está pronto para colar no seu agente de criação.');
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function copyPhone() {
    if (!selectedLead?.phone) return;
    await navigator.clipboard.writeText(selectedLead.phone);
    setCopiedPhone(true);
    window.setTimeout(() => setCopiedPhone(false), 1800);
  }

  async function buildSite(provider: 'internal' | 'cursor') {
    if (!selectedLead || !generatedBrief) {
      setNotice('Selecione um negócio e gere o prompt antes de criar o site.');
      return;
    }

    setBuildingSite(provider);
    setSiteBuildNotice(provider === 'internal' ? 'A IA está criando o site dentro do Lead Studio...' : 'Iniciando o Cursor e preparando o acompanhamento interno...');
    try {
      const response = await fetch('/api/build-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: provider === 'internal' ? 'build' : 'cursor', provider: 'auto', prompt: generatedBrief }),
      });
      const serverData = await response.json() as BuildSiteApiResponse;
      let data = serverData;
      if (provider === 'internal' && (!response.ok || !serverData.html)) {
        setSiteBuildNotice('Conectando ao Claude Sonnet para gerar o código do site...');
        data = await createSiteWithPuter(generatedBrief);
      } else if (!response.ok) {
        throw new Error(serverData.error || 'Não foi possível criar o site.');
      }

      if (provider === 'internal' && data.html) {
        setGeneratedSiteHtml(data.html);
        setGeneratedSiteProvider(data.provider === 'kimi' ? 'Kimi' : data.provider === 'puter' ? 'Claude Sonnet 4.6' : 'OpenAI');
        setSiteUsage(data.usage?.total ?? null);
        window.requestAnimationFrame(() => document.getElementById('site-gerado')?.scrollIntoView({ behavior: 'smooth' }));
      }
      if (provider === 'cursor' && data.agentId && data.runId && data.trackingToken) {
        setCursorJob({ agentId: data.agentId, runId: data.runId, trackingToken: data.trackingToken });
        setCursorStatus(data.status || 'CREATING');
        setCursorResult('');
        setCursorPrUrl('');
      }
      setSiteBuildNotice(data.notice || 'Criação iniciada.');
    } catch (error) {
      setSiteBuildNotice(error instanceof Error ? error.message : 'Não foi possível criar o site.');
    } finally {
      setBuildingSite(null);
    }
  }

  function downloadGeneratedSite() {
    if (!generatedSiteHtml || !selectedLead) return;
    const blob = new Blob([generatedSiteHtml], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${selectedLead.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'}.html`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand-mark" aria-label="Lead Studio">L</div>
        <nav className="rail-nav" aria-label="Navegação principal">
          <Link href="/" className="rail-button active" aria-label="Dashboard">⌁</Link>
          <Link href="#oportunidades" className="rail-button" aria-label="Oportunidades">◎</Link>
          <Link href="#brief" className="rail-button" aria-label="Briefs">✦</Link>
          <Link href="#direcao" className="rail-button" aria-label="Direção criativa">□</Link>
        </nav>
        <div className="rail-status" title="Sistema online"><i /></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow"><span className="live-dot" /> RADAR DE OPORTUNIDADES</div>
            <h1>Lead Studio <span>/ negócios sem site</span></h1>
          </div>
          <div className="header-metric"><b>{leads.length}</b><span>leads filtrados</span></div>
        </header>

        <section className="intro">
          <div>
            <span className="kicker">PROSPECÇÃO + CRIAÇÃO</span>
            <h2>Encontre o negócio certo.<br /><em>Crie o site perfeito.</em></h2>
          </div>
          <p>Selecione uma profissão e uma cidade. O radar consulta cadastros públicos reais, filtra quem não informa site e prepara o prompt para a melhor IA.</p>
        </section>

        <div className="insight-bar" aria-label="Resumo do fluxo">
          <div className="insight-pill"><span className="dot-success" /> Lead ativo: {selectedLead ? selectedLead.name : 'Nenhum selecionado'}</div>
          <div className="insight-pill"><span className="dot-neutral" /> Mercado: {profession.label}</div>
          <div className="insight-pill"><span className="dot-warning" /> Local: {city} / {state.sigla}</div>
        </div>

        <div className="dashboard-grid">
          <section className="filters-panel">
            <div className="panel-heading"><span>01</span><div><b>Defina a oportunidade</b><small>Profissão, região e reputação mínima</small></div></div>

            <label className="field-label">TIPO DE NEGÓCIO</label>
            <div className="profession-grid">
              {professions.map((item) => (
                <button
                  key={item.id}
                  className={professionId === item.id ? 'profession active' : 'profession'}
                  onClick={() => {
                    setProfessionId(item.id);
                    resetResults(`Segmento alterado para ${item.label}. Faça uma nova busca para ver negócios reais.`);
                  }}
                >
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>

            <div className="location-fields">
              <label>Estado
                <select value={stateId} onChange={(event) => {
                  setLoadingCities(true);
                  setStateId(event.target.value);
                  resetResults('Estado alterado. Escolha a cidade e faça uma nova busca.');
                }}>
                  {states.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </label>
              <label>Cidade
                <select value={city} onChange={(event) => {
                  setCity(event.target.value);
                  resetResults('Cidade alterada. Faça uma nova busca para ver negócios reais.');
                }} disabled={loadingCities}>
                  {loadingCities && <option>Carregando...</option>}
                  {!loadingCities && cities.map((item) => <option key={item.id} value={item.nome}>{item.nome}</option>)}
                </select>
              </label>
            </div>

            <label className="review-field">Mínimo de avaliações
              <select value={minReviews} onChange={(event) => setMinReviews(event.target.value)}>
                <option value="20">20+ avaliações</option><option value="30">30+ avaliações</option>
                <option value="50">50+ avaliações</option><option value="100">100+ avaliações</option>
                <option value="250">250+ avaliações</option><option value="500">500+ avaliações</option>
              </select>
            </label>

            <div className="locked-filter"><span>✓</span><div><b>Cadastros reais sem site informado</b><small>Telefone exibido quando disponível · OpenStreetMap</small></div><i>ATIVO</i></div>
            <button className="search-button" onClick={searchLeads} disabled={searching || loadingCities}>{searching ? 'Pesquisando...' : 'Encontrar oportunidades'} <span>↗</span></button>
            <p className={`data-note ${mode === 'blocked' ? 'blocked' : ''}`}>{(mode === 'google' || mode === 'openstreetmap') && <b>DADOS REAIS · </b>}{notice}</p>
          </section>

          <section className="leads-panel" id="oportunidades">
            <div className="panel-heading leads-heading"><span>02</span><div><b>Oportunidades reais</b><small>Cadastros sem site informado na fonte consultada</small></div><div className="sort-chip">DADOS PÚBLICOS</div></div>
            <div className="lead-list">
              {!leads.length && !searching && (
                <div className="empty-state"><div>⌁</div><b>Seu radar está pronto</b><p>Escolha os filtros e inicie uma busca.</p></div>
              )}
              {searching && <div className="empty-state"><div className="spinner" /><b>Buscando oportunidades</b><p>Verificando reputação e presença digital.</p></div>}
              {!searching && paginatedLeads.map((lead, index) => (
                <button key={lead.id} className={selectedLead?.id === lead.id ? 'lead-row selected' : 'lead-row'} onClick={() => void selectOpportunity(lead)}>
                  <span className="rank-number">{String((currentLeadPage - 1) * LEADS_PER_PAGE + index + 1).padStart(2, '0')}</span>
                  <span className="lead-main"><b>{lead.name}</b><small>{lead.address}</small><small className="phone-line">{lead.phone ? `☎ ${lead.phone}` : 'Telefone não informado na fonte'}</small><i>{lead.source === 'google' ? 'GOOGLE MAPS · SEM SITE' : 'OPENSTREETMAP · SEM SITE'}</i></span>
                  <span className="rating">{lead.rating !== null && lead.reviewCount !== null ? <><b>{lead.rating.toFixed(1)} ★</b><small>{lead.reviewCount.toLocaleString('pt-BR')} avaliações</small></> : <><b>REAL</b><small>{lead.source === 'google' ? 'Google Places' : 'OpenStreetMap'}</small></>}</span>
                  <span className="select-arrow">›</span>
                </button>
              ))}
            </div>
            {!searching && leads.length > 0 && (
              <nav className="lead-pagination" aria-label="Paginação das oportunidades">
                <p><b>{firstVisibleLead}–{lastVisibleLead}</b> de {leads.length} oportunidades</p>
                <div className="pagination-controls">
                  <button type="button" onClick={() => goToLeadPage(currentLeadPage - 1)} disabled={currentLeadPage === 1} aria-label="Página anterior">←</button>
                  {Array.from({ length: totalLeadPages }, (_, index) => index + 1).map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={page === currentLeadPage ? 'active' : ''}
                      onClick={() => goToLeadPage(page)}
                      aria-label={`Ir para a página ${page}`}
                      aria-current={page === currentLeadPage ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                  <button type="button" onClick={() => goToLeadPage(currentLeadPage + 1)} disabled={currentLeadPage === totalLeadPages} aria-label="Próxima página">→</button>
                </div>
                <span>Página {currentLeadPage} de {totalLeadPages}</span>
              </nav>
            )}
            {selectedLead && (
              <div className="contact-bar">
                <span><small>{selectedLead.verificationLabel || 'CADASTRO PÚBLICO VERIFICADO'}</small><b>{selectedLead.phone || 'Telefone não informado'}</b></span>
                {selectedLead.phone && <button onClick={copyPhone}>{copiedPhone ? 'Copiado ✓' : 'Copiar número'}</button>}
                {selectedLead.phone && <a href={`tel:${selectedLead.phone.replace(/[^\d+]/g, '')}`}>Ligar</a>}
                <a href={selectedLead.mapsUrl} target="_blank" rel="noreferrer">{selectedLead.source === 'google' ? 'Google Maps' : 'OpenStreetMap'} ↗</a>
                <a className="instagram-link" href={socialSearchUrl('instagram', selectedLead, city)} target="_blank" rel="noreferrer">Buscar Instagram ↗</a>
                <a className="facebook-link" href={socialSearchUrl('facebook', selectedLead, city)} target="_blank" rel="noreferrer">Buscar Facebook ↗</a>
              </div>
            )}
          </section>

          <section className="ai-panel" id="direcao">
            <div className="panel-heading"><span>03</span><div><b>Direção criativa</b><small>Cada caminho muda narrativa, copy e interação</small></div></div>
            <div className="ranking-note">Selecione uma direção para regenerar um prompt realmente diferente. Para código complexo, Auto prioriza OpenAI; Claude é uma ótima opção para narrativa e copy.</div>
            <div className="ai-list">
              {creativeDirections.map((direction, index) => (
                <button
                  key={direction.id}
                  type="button"
                  className={activeDirection === direction.id ? 'ai-row selected' : 'ai-row'}
                  onClick={async () => {
                    setActiveDirection(direction.id);
                    setVariation(0);
                    if (selectedLead) await generateIntegratedPrompt(direction.id, selectedLead, 0);
                    else setNotice('Direção escolhida. Agora selecione uma oportunidade real.');
                  }}
                >
                  <span className="ai-rank">0{index + 1}</span><span className="ai-logo" style={{ background: direction.color }}>{direction.name.charAt(0)}</span>
                  <span className="ai-info"><b>{direction.name}</b><small>{direction.kind}</small><em>{direction.reason}</em></span>
                  <span className="ai-score">↗</span>
                </button>
              ))}
            </div>

            <div className="provider-control" style={{ marginTop: 16 }}>
              <label className="field-label">PROVEDOR DE IA</label>
              <div className="profession-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {(['local', 'auto', 'openai', 'claude', 'gemini'] as const).map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    className={aiProvider === provider ? 'profession active' : 'profession'}
                    onClick={async () => {
                      setAiProvider(provider);
                      if (selectedLead) await generateIntegratedPrompt(activeDirection, selectedLead, variation, provider);
                    }}
                  >
                    <span>{provider === 'claude' ? 'C' : provider === 'gemini' ? 'G' : provider === 'openai' ? 'O' : provider === 'local' ? '0' : '✦'}</span>
                    {provider === 'local' ? 'Local · zero tokens' : provider === 'auto' ? 'Auto · melhor IA' : provider === 'claude' ? 'Claude' : provider === 'gemini' ? 'Gemini' : 'OpenAI · código'}
                  </button>
                ))}
              </div>
              <div className="provider-recommendation">
                <b>Integração resiliente</b>
                <p>Com chave configurada, a IA acrescenta direção criativa ao prompt. Sem chave, o gerador local detalhado continua funcionando para todos.</p>
                <span>Ativo agora: {activeAiProvider === 'local' ? 'gerador local seguro' : activeAiProvider}</span>
              </div>
            </div>
          </section>

          <section className="prompt-panel" id="brief">
            <div className="prompt-header">
              <div className="panel-heading"><span>04</span><div><b>Prompt premium automático</b><small>{selectedLead ? `Personalizado para ${selectedLead.name}` : 'Será personalizado com o lead selecionado'}</small></div></div>
              <div className="prompt-actions">
                <button type="button" onClick={() => void regenerateVariation()} disabled={generatingPrompt || !selectedLead}>{generatingPrompt ? 'Gerando...' : 'Gerar nova variação'}</button>
                <button type="button" onClick={copyPrompt} disabled={!generatedBrief}>{copied ? 'Copiado ✓' : 'Copiar prompt'}</button>
              </div>
            </div>
            <div className="prompt-code">
              <div className="prompt-top"><span>prompt-site.md · {activeAiProvider}</span><i>{activePrompt.length.toLocaleString('pt-BR')} caracteres</i></div>
              <textarea className="prompt-editor" value={activePrompt} onChange={(event) => setGeneratedBrief(event.target.value)} aria-label="Prompt do site" />
            </div>
            <div className="prompt-footer"><span>✦ Único para cada oportunidade</span><span>Fonte pública rastreável</span><span>Auditoria factual</span><span>Pronto para Codex, Claude e outras IAs</span></div>
          </section>

          <section className="builder-panel" id="site-gerado">
            <div className="builder-heading">
              <div className="panel-heading"><span>05</span><div><b>Construtor integrado</b><small>O site é criado e exibido aqui, sem encaminhamento</small></div></div>
              <div className="usage-chip">{siteUsage !== null ? `${siteUsage.toLocaleString('pt-BR')} tokens nesta geração` : 'ATÉ 24.000 TOKENS POR SITE'}</div>
            </div>

            <div className="builder-options">
              <article className="builder-option recommended">
                <span className="builder-badge">RECOMENDADO</span>
                <div className="builder-logo">IA</div>
                <h3>Claude Sonnet para código</h3>
                <p>Gera o site completo dentro do Lead Studio. Usa OpenAI ou Kimi quando configuradas e ativa Claude Sonnet 4.6 como alternativa integrada. No primeiro uso, a Puter pode solicitar login para autorizar a IA.</p>
                <button type="button" onClick={() => void buildSite('internal')} disabled={Boolean(buildingSite) || Boolean(cursorJob) || !generatedBrief}>
                  {buildingSite === 'internal' ? 'Claude está programando...' : 'Criar e visualizar agora'}
                </button>
              </article>

              <article className="builder-option">
                <span className="builder-badge">AGENTE INTEGRADO</span>
                <div className="builder-logo cursor">C</div>
                <h3>Construir com Cursor</h3>
                <p>Cria a branch e o pull request, acompanha o processamento automaticamente e carrega a prévia no Lead Studio quando o arquivo fica pronto.</p>
                <button type="button" onClick={() => void buildSite('cursor')} disabled={Boolean(buildingSite) || Boolean(cursorJob) || !generatedBrief}>
                  {buildingSite === 'cursor' ? 'Iniciando Cursor...' : cursorJob ? 'Cursor trabalhando...' : 'Construir e acompanhar aqui'}
                </button>
              </article>
            </div>

            <div className="builder-notice" role="status">{siteBuildNotice}</div>
            {cursorStatus && <div className="cursor-progress"><span className={cursorJob ? 'working' : 'done'} /> Cursor: {cursorStatus}</div>}
            {cursorResult && <p className="cursor-result">{cursorResult}</p>}
            {cursorPrUrl && <a className="cursor-agent-link" href={cursorPrUrl} target="_blank" rel="noreferrer">Revisar pull request opcional ↗</a>}

            {generatedSiteHtml && (
              <div className="site-preview-shell">
                <div className="site-preview-top">
                  <span><i /> Prévia criada aqui {generatedSiteProvider ? `· ${generatedSiteProvider}` : ''}</span>
                  <button type="button" onClick={downloadGeneratedSite}>Baixar HTML</button>
                </div>
                <iframe
                  className="site-preview-frame"
                  srcDoc={generatedSiteHtml}
                  sandbox="allow-scripts"
                  title={`Prévia do site gerado para ${selectedLead?.name || 'o negócio selecionado'}`}
                />
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
