'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio } from '../components/studio-provider';
import { StudioOverview } from '../components/ui/StudioOverview';

type CountryCode = 'BR' | 'PT';
type StateOption = { id: number | string; sigla: string; nome: string };
type CityOption = { id: number | string; nome: string };
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
  socialProfiles?: { instagram: string; facebook: string };
};

type SocialMaterials = { instagramUrl: string; facebookUrl: string; notes: string; profileContext: string };
type SocialProfileInsight = {
  platform: 'instagram' | 'facebook';
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  status: 'public' | 'restricted';
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
  valueProposition?: string;
  notice?: string;
  mode?: string;
  provider?: 'gemini' | 'openai' | null;
  thinkingLevel?: 'medium';
  webResearch?: boolean;
  discoveredSocialProfiles?: { instagramUrl: string; facebookUrl: string };
  error?: string;
};

type BuildSiteApiResponse = {
  provider?: 'gemini' | 'openai';
  mode?: 'local-fallback';
  code?: string;
  model?: string;
  thinkingLevel?: 'medium';
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

type GeminiModel = 'gemini-3.6-flash' | 'gemini-3.7-flash';
type OpenAIModel = 'gpt-5.4';
type AiModel = GeminiModel | OpenAIModel;
type AiProvider = 'gemini' | 'openai';
type ProviderStatus = {
  gemini: { configured: boolean; model: GeminiModel };
  openai: { configured: boolean; model: OpenAIModel; reasoningEffort: 'medium' };
};

function providerForModel(model: AiModel): AiProvider {
  return model === 'gpt-5.4' ? 'openai' : 'gemini';
}

function modelLabel(model: AiModel): string {
  if (model === 'gpt-5.4') return 'GPT-5.4';
  return model === 'gemini-3.7-flash' ? 'Gemini 3.7 Flash' : 'Gemini 3.6 Flash';
}

function reasoningLabel(model: AiModel): string {
  void model;
  return 'raciocínio médio';
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

const portugalRegions: StateOption[] = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria',
  'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu',
  'Região Autónoma dos Açores', 'Região Autónoma da Madeira',
].map((nome) => ({ id: nome, sigla: nome, nome }));

const countries: Array<{ id: CountryCode; nome: string }> = [
  { id: 'BR', nome: 'Brasil' },
  { id: 'PT', nome: 'Portugal' },
];

const professions: Profession[] = [
  { id: 'todos', label: 'Todos os comércios', icon: '⌁', style: 'identidade local, clara e adaptada ao negócio encontrado', services: 'presença digital, informações essenciais, localização e contato' },
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
  { id: 'conversion', name: 'Conversão', kind: 'Clareza e utilidade', color: '#5ecf8f', reason: 'Informação objetiva, dúvidas bem tratadas e contato sem fricção.' },
  { id: 'local', name: 'Presença local', kind: 'Proximidade e confiança', color: '#d39a72', reason: 'Localização, relevância regional e dados públicos no centro da copy.' },
];

const aiModels: Array<{ id: AiModel; provider: AiProvider; icon: string; label: string; detail: string }> = [
  { id: 'gemini-3.6-flash', provider: 'gemini', icon: '3.6', label: 'Gemini 3.6 Flash', detail: 'Equilíbrio · raciocínio médio' },
  { id: 'gemini-3.7-flash', provider: 'gemini', icon: '3.7', label: 'Gemini 3.7 Flash', detail: 'Pesquisa avançada · raciocínio médio' },
  { id: 'gpt-5.4', provider: 'openai', icon: '5.4', label: 'GPT-5.4', detail: 'OpenAI · raciocínio médio' },
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
2. Seção de reputação local com avaliação agregada real e contexto da fonte consultada.
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
  const { setStudio } = useStudio();
  const totalSteps = 5;
  const stepLabels = ['Busca', 'Oportunidade', 'Direção e IA', 'Prompt e proposta', 'Construção'];
  const [currentStep, setCurrentStep] = useState(1);
  const [professionId, setProfessionId] = useState('barbearia');
  const [country, setCountry] = useState<CountryCode>('BR');
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
  const [generatedBrief, setGeneratedBrief] = useState('');
  const [generatedProposal, setGeneratedProposal] = useState('');
  const [copiedProposal, setCopiedProposal] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [socialNotes, setSocialNotes] = useState('');
  const [socialInsights, setSocialInsights] = useState<SocialProfileInsight[]>([]);
  const [analyzingSocial, setAnalyzingSocial] = useState(false);
  const [useSocialPhotos, setUseSocialPhotos] = useState(false);
  const [buildingSite, setBuildingSite] = useState<'internal' | null>(null);
  const [generatedSiteHtml, setGeneratedSiteHtml] = useState('');
  const [generatedSiteProvider, setGeneratedSiteProvider] = useState('');
  const [builderAiModel, setBuilderAiModel] = useState<AiModel>('gemini-3.6-flash');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    gemini: { configured: false, model: 'gemini-3.6-flash' },
    openai: { configured: false, model: 'gpt-5.4', reasoningEffort: 'medium' },
  });
  const [strategicAnalysis, setStrategicAnalysis] = useState('');
  const [siteBuildNotice, setSiteBuildNotice] = useState('Gere um prompt e construa o site sem sair do Lead Studio.');
  const [siteUsage, setSiteUsage] = useState<number | null>(null);
  const generationRequest = useRef(0);
  const lastGenerationKey = useRef('');

  const regionOptions = country === 'PT' ? portugalRegions : states;
  const state = useMemo(
    () => regionOptions.find((item) => String(item.id) === stateId) ?? regionOptions[0],
    [regionOptions, stateId],
  );
  const countryName = country === 'PT' ? 'Portugal' : 'Brasil';
  const activeProvider = providerForModel(builderAiModel);
  const activeProviderConfigured = providerStatus[activeProvider].configured;
  const profession = useMemo(() => professions.find((item) => item.id === professionId) ?? professions[0], [professionId]);
  const activePrompt = generatedBrief || 'Selecione uma oportunidade real para gerar um prompt estratégico baseado em evidências.';
  const totalLeadPages = Math.max(1, Math.ceil(leads.length / LEADS_PER_PAGE));
  const currentLeadPage = Math.min(leadPage, totalLeadPages);
  const paginatedLeads = useMemo(
    () => leads.slice((currentLeadPage - 1) * LEADS_PER_PAGE, currentLeadPage * LEADS_PER_PAGE),
    [currentLeadPage, leads],
  );
  const firstVisibleLead = leads.length ? (currentLeadPage - 1) * LEADS_PER_PAGE + 1 : 0;
  const lastVisibleLead = Math.min(currentLeadPage * LEADS_PER_PAGE, leads.length);
  const socialProfileContext = useMemo(
    () => socialInsights
      .filter((profile) => profile.status === 'public')
      .map((profile) => `${profile.platform}: ${profile.title || 'sem título'} — ${profile.description || 'sem descrição pública'}`)
      .join('\n'),
    [socialInsights],
  );
  const progressPercentage = (currentStep / totalSteps) * 100;

  useEffect(() => {
    setStudio({
      currentStep,
      totalSteps,
      leadsCount: leads.length,
      selectedName: selectedLead?.name ?? null,
      city,
      segment: profession.label,
      sourceMode: mode,
    });
  }, [city, currentStep, leads.length, mode, profession.label, selectedLead?.name, setStudio, totalSteps]);

  useEffect(() => {
    const controller = new AbortController();
    const source = country === 'PT'
      ? `/api/locations?region=${encodeURIComponent(stateId)}`
      : `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`;
    fetch(source, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('locations_unavailable');
        if (country === 'PT') {
          const data = await response.json() as { municipalities?: string[] };
          return (data.municipalities ?? []).map((nome) => ({ id: nome, nome }));
        }
        return response.json() as Promise<CityOption[]>;
      })
      .then((data) => {
        setCities(data);
        setCity((current) => data.some((item) => item.nome === current) ? current : (data[0]?.nome ?? ''));
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setCities([]);
          setCity('');
          setNotice(country === 'PT' ? 'Não foi possível carregar os municípios portugueses. Tente novamente.' : 'Não foi possível carregar as cidades agora.');
        }
      })
      .finally(() => setLoadingCities(false));
    return () => controller.abort();
  }, [country, stateId]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/providers', { signal: controller.signal })
      .then((response) => response.json() as Promise<{ providers?: ProviderStatus }>)
      .then((data) => { if (data.providers) setProviderStatus(data.providers); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function resetResults(message?: string) {
    lastGenerationKey.current = '';
    setCopied(false);
    setGeneratedBrief('');
    setGeneratedProposal('');
    setStrategicAnalysis('');
    setInstagramUrl('');
    setFacebookUrl('');
    setSocialNotes('');
    setSocialInsights([]);
    setUseSocialPhotos(false);
    setGeneratedSiteHtml('');
    setGeneratedSiteProvider('');
    setSiteUsage(null);
    setLeads([]);
    setLeadPage(1);
    setSelectedLead(null);
    setVariation(0);
    if (message) setNotice(message);
  }

  function scrollToWizard(): void {
    window.requestAnimationFrame(() => {
      document.getElementById('wizard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function nextStep(): Promise<void> {
    if (currentStep === 1 && (!professionId || !stateId || !city || !minReviews)) {
      setNotice(`Preencha os campos obrigatórios de segmento, ${country === 'PT' ? 'distrito ou região' : 'estado'}, cidade e avaliações.`);
      return;
    }
    if (currentStep === 1 && leads.length === 0) {
      setNotice('Faça a busca e encontre ao menos uma oportunidade antes de avançar.');
      return;
    }
    if (currentStep === 2 && !selectedLead) {
      setNotice('Selecione uma oportunidade real antes de avançar.');
      return;
    }
    if (currentStep === 3 && !activeProviderConfigured) {
      setNotice('Selecione uma IA configurada antes de avançar.');
      return;
    }
    if (currentStep === 3 && selectedLead) {
      const prompt = await generateIntegratedPrompt(activeDirection, selectedLead, variation, undefined, builderAiModel);
      if (!prompt) return;
    }
    if (currentStep === 4 && (!generatedBrief.trim() || !generatedProposal.trim())) {
      setNotice('Gere e revise o prompt e a proposta antes de avançar para a construção.');
      return;
    }
    setCurrentStep((step) => Math.min(totalSteps, step + 1));
    scrollToWizard();
  }

  function prevStep(): void {
    setCurrentStep((step) => Math.max(1, step - 1));
    scrollToWizard();
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
        body: JSON.stringify({ profession: profession.label, city, state: state.nome, country, minReviews: Number(minReviews) }),
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
      setGeneratedProposal('');
      setStrategicAnalysis('');
      setInstagramUrl('');
      setFacebookUrl('');
      setSocialNotes('');
      setSocialInsights([]);
      setUseSocialPhotos(false);
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
    socialOverride?: SocialMaterials,
    modelOverride?: AiModel,
  ) {
    const lead = leadOverride ?? selectedLead;
    if (!lead) {
      setNotice('Selecione uma oportunidade real para gerar o texto.');
      return '';
    }
    const socialMaterials = socialOverride ?? { instagramUrl, facebookUrl, notes: socialNotes, profileContext: socialProfileContext };
    const activeModel = modelOverride ?? builderAiModel;
    const generationKey = JSON.stringify({
      country, region: state.nome, city, segment: profession.label, leadId: lead.id, direction,
      variation: variationOverride, model: activeModel, socialMaterials,
    });
    if (lastGenerationKey.current === generationKey && generatedBrief.trim()) {
      setNotice('Prompt já atualizado: nenhuma informação mudou e nenhum token adicional foi usado.');
      return generatedBrief;
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
          state: country === 'PT' ? state.nome : state.sigla,
          country,
          lead,
          direction,
          provider: providerForModel(activeModel),
          model: activeModel,
          variation: variationOverride,
          socialMaterials,
        }),
      });
      const data = (await response.json()) as GenerateApiResponse & { proposal?: string };
      if (!response.ok || !data.prompt) throw new Error(data.error || 'Não foi possível gerar o prompt.');
      if (generationRequest.current !== requestId) return '';
      const nextPrompt = data.prompt;
      lastGenerationKey.current = generationKey;
      setGeneratedBrief(nextPrompt);
      setGeneratedProposal(data.proposal || '');
      setStrategicAnalysis(data.valueProposition || data.suggestions?.slice(0, 2_400) || data.proposal || '');
      const discovered = data.discoveredSocialProfiles;
      const discoveredInstagram = instagramUrl || discovered?.instagramUrl || '';
      const discoveredFacebook = facebookUrl || discovered?.facebookUrl || '';
      if ((discoveredInstagram || discoveredFacebook) && (!instagramUrl || !facebookUrl)) {
        setInstagramUrl(discoveredInstagram);
        setFacebookUrl(discoveredFacebook);
        try {
          const socialResponse = await fetch('/api/social-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instagramUrl: discoveredInstagram, facebookUrl: discoveredFacebook }),
          });
          const socialData = await socialResponse.json() as { profiles?: SocialProfileInsight[] };
          if (socialResponse.ok) setSocialInsights(socialData.profiles ?? []);
        } catch {
          // A pesquisa principal continua válida mesmo se a rede social bloquear os metadados.
        }
      }
      setNotice(data.notice || `Texto exclusivo criado para ${lead.name}.`);
      return nextPrompt;
    } catch (error) {
      if (generationRequest.current === requestId) {
        setGeneratedBrief('');
        setGeneratedProposal('');
        setStrategicAnalysis('');
        setNotice(error instanceof Error ? error.message : 'Não foi possível gerar o brief.');
      }
      return '';
    } finally {
      if (generationRequest.current === requestId) setGeneratingPrompt(false);
    }
  }

  function selectOpportunity(lead: Lead) {
    const nextSocialMaterials = {
      instagramUrl: lead.socialProfiles?.instagram ?? '',
      facebookUrl: lead.socialProfiles?.facebook ?? '',
      notes: '',
      profileContext: '',
    };
    setSelectedLead(lead);
    lastGenerationKey.current = '';
    setGeneratedBrief('');
    setGeneratedProposal('');
    setStrategicAnalysis('');
    setInstagramUrl(nextSocialMaterials.instagramUrl);
    setFacebookUrl(nextSocialMaterials.facebookUrl);
    setSocialNotes('');
    setSocialInsights([]);
    setUseSocialPhotos(false);
    setVariation(0);
    setNotice(`${lead.name} selecionado. Confirme a direção e os materiais sociais; a IA escolhida será chamada uma única vez ao avançar.`);
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

  async function copyProposal() {
    if (!generatedProposal) return;
    await navigator.clipboard.writeText(generatedProposal);
    setCopiedProposal(true);
    setNotice('Proposta copiada e pronta para revisão antes do envio.');
    window.setTimeout(() => setCopiedProposal(false), 1800);
  }

  async function analyzeSocialProfiles() {
    if (!instagramUrl && !facebookUrl) {
      setNotice('Informe ao menos um perfil social para analisar.');
      return;
    }
    setAnalyzingSocial(true);
    setNotice('Lendo somente as informações públicas dos perfis...');
    try {
      const response = await fetch('/api/social-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramUrl, facebookUrl }),
      });
      const data = await response.json() as { profiles?: SocialProfileInsight[]; notice?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível analisar os perfis.');
      const nextInsights = data.profiles ?? [];
      setSocialInsights(nextInsights);
      lastGenerationKey.current = '';
      setNotice(data.notice || 'Perfis analisados. A IA escolhida usará as publicações e materiais ao avançar, sem uma chamada extra agora.');
    } catch (error) {
      setSocialInsights([]);
      setNotice(error instanceof Error ? error.message : 'Não foi possível analisar os perfis.');
    } finally {
      setAnalyzingSocial(false);
    }
  }

  async function copyPhone() {
    if (!selectedLead?.phone) return;
    await navigator.clipboard.writeText(selectedLead.phone);
    setCopiedPhone(true);
    window.setTimeout(() => setCopiedPhone(false), 1800);
  }

  async function buildSite() {
    if (!selectedLead || !generatedBrief) {
      setNotice('Selecione um negócio e gere o prompt antes de criar o site.');
      return;
    }

    setBuildingSite('internal');
    setSiteBuildNotice(`${modelLabel(builderAiModel)} está criando o site dentro do Lead Studio...`);
    try {
      let data: BuildSiteApiResponse;
      {
        const response = await fetch('/api/build-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'build',
            provider: providerForModel(builderAiModel),
            model: builderAiModel,
            country,
            prompt: generatedBrief,
            approvedImageUrls: useSocialPhotos
              ? socialInsights.filter((profile) => profile.status === 'public' && profile.imageUrl).map((profile) => profile.imageUrl)
              : [],
          }),
        });
        const serverData = await response.json() as BuildSiteApiResponse;
        data = serverData;
        if (!response.ok) {
          throw new Error(serverData.error || 'Não foi possível criar o site.');
        }
      }

      if (data.html) {
        setGeneratedSiteHtml(data.html);
        setGeneratedSiteProvider(data.mode === 'local-fallback'
          ? 'Modo seguro local'
          : data.model === 'gpt-5.4'
            ? 'GPT-5.4 · raciocínio médio'
            : data.model ? data.model.replace('gemini-', 'Gemini ').replace('-flash', ' Flash') : 'Gemini');
        setSiteUsage(data.usage?.total ?? null);
        window.requestAnimationFrame(() => document.getElementById('site-gerado')?.scrollIntoView({ behavior: 'smooth' }));
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
    <main className="workspace">
        <StudioOverview
          leadsCount={leads.length}
          selectedName={selectedLead?.name ?? null}
          currentStep={currentStep}
          totalSteps={totalSteps}
          city={city ? `${city} · ${country === 'PT' ? state.nome : state.sigla} · ${countryName}` : ''}
          segment={profession.label}
          sourceMode={mode}
        />

        <section className="wizard-shell" id="wizard" aria-label="Assistente de criação em cinco etapas" data-reveal>
          <div className="wizard-progress-copy">
            <div><span>FLUXO GUIADO</span><b>{stepLabels[currentStep - 1]}</b></div>
            <strong>Etapa {currentStep} de {totalSteps}</strong>
          </div>
          <div
            className="wizard-progress-track"
            role="progressbar"
            aria-label="Progresso da criação"
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-valuenow={currentStep}
          >
            <span style={{ width: `${progressPercentage}%` }} />
          </div>
          <ol className="wizard-step-list">
            {stepLabels.map((label, index) => {
              const step = index + 1;
              const status = step === currentStep ? 'active' : step < currentStep ? 'completed' : '';
              return <li key={label} className={status}><span>{step < currentStep ? '✓' : step}</span><b>{label}</b></li>;
            })}
          </ol>
          <p className="wizard-feedback" role="status">{notice}</p>
        </section>

        <div className="dashboard-grid">
          <section className={`filters-panel form-step ${currentStep === 1 ? 'active' : ''}`} aria-hidden={currentStep !== 1}>
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

            <div className="location-fields location-fields-three">
              <label>País
                <select required value={country} onChange={(event) => {
                  const nextCountry = event.target.value as CountryCode;
                  setCountry(nextCountry);
                  setStateId(nextCountry === 'PT' ? 'Lisboa' : '35');
                  setCity(nextCountry === 'PT' ? 'Lisboa' : 'São Paulo');
                  setLoadingCities(true);
                  resetResults(`País alterado para ${nextCountry === 'PT' ? 'Portugal' : 'Brasil'}. Escolha a região e faça uma nova busca.`);
                }}>
                  {countries.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </label>
              <label>{country === 'PT' ? 'Distrito ou região' : 'Estado'}
                <select required value={stateId} onChange={(event) => {
                  setLoadingCities(true);
                  setStateId(event.target.value);
                  resetResults(`${country === 'PT' ? 'Distrito ou região' : 'Estado'} alterado. Escolha a cidade e faça uma nova busca.`);
                }}>
                  {regionOptions.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </label>
              <label>{country === 'PT' ? 'Município' : 'Cidade'}
                <select required value={city} onChange={(event) => {
                  setCity(event.target.value);
                  resetResults('Cidade alterada. Faça uma nova busca para ver negócios reais.');
                }} disabled={loadingCities}>
                  {loadingCities && <option>Carregando...</option>}
                  {!loadingCities && cities.map((item) => <option key={item.id} value={item.nome}>{item.nome}</option>)}
                </select>
              </label>
            </div>

            <label className="review-field">Mínimo de avaliações
              <select required value={minReviews} onChange={(event) => setMinReviews(event.target.value)}>
                <option value="20">20+ avaliações</option><option value="30">30+ avaliações</option>
                <option value="50">50+ avaliações</option><option value="100">100+ avaliações</option>
                <option value="250">250+ avaliações</option><option value="500">500+ avaliações</option>
              </select>
            </label>

            <div className="locked-filter"><span>✓</span><div><b>Cadastros reais sem site informado</b><small>{country === 'PT' ? 'Cobertura dos 308 municípios · Google Maps + OpenStreetMap' : 'Telefone exibido quando disponível · Google Maps + OpenStreetMap'}</small></div><i>ATIVO</i></div>
            <button className="search-button" onClick={searchLeads} disabled={searching || loadingCities}>{searching ? 'Pesquisando...' : 'Encontrar oportunidades'} <span>↗</span></button>
            <p className={`data-note ${mode === 'blocked' ? 'blocked' : ''}`}>{(mode === 'google' || mode === 'openstreetmap') && <b>DADOS REAIS · </b>}{notice}</p>
          </section>

          <section className={`leads-panel form-step ${currentStep === 2 ? 'active' : ''}`} id="oportunidades" aria-hidden={currentStep !== 2}>
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
              <>
                <div className="contact-bar">
                  <span><small>{selectedLead.verificationLabel || 'CADASTRO PÚBLICO VERIFICADO'}</small><b>{selectedLead.phone || 'Telefone não informado'}</b></span>
                  {selectedLead.phone && <button onClick={copyPhone}>{copiedPhone ? 'Copiado ✓' : 'Copiar número'}</button>}
                  {selectedLead.phone && <a href={`tel:${selectedLead.phone.replace(/[^\d+]/g, '')}`}>Ligar</a>}
                  <a href={selectedLead.mapsUrl} target="_blank" rel="noreferrer">{selectedLead.source === 'google' ? 'Google Maps' : 'OpenStreetMap'} ↗</a>
                  <a className="instagram-link" href={socialSearchUrl('instagram', selectedLead, city)} target="_blank" rel="noreferrer">Buscar Instagram ↗</a>
                  <a className="facebook-link" href={socialSearchUrl('facebook', selectedLead, city)} target="_blank" rel="noreferrer">Buscar Facebook ↗</a>
                </div>
                <div className="social-materials">
                  <div className="social-materials-heading"><div><b>Materiais públicos da marca</b><small>Os @ e links confirmados entram diretamente no prompt da IA</small></div><span>REFERÊNCIA</span></div>
                  <div className="social-grid">
                    <label>Instagram
                      <input type="url" value={instagramUrl} onChange={(event) => { setInstagramUrl(event.target.value); setSocialInsights([]); lastGenerationKey.current = ''; }} placeholder="https://www.instagram.com/perfil" />
                    </label>
                    <label>Facebook
                      <input type="url" value={facebookUrl} onChange={(event) => { setFacebookUrl(event.target.value); setSocialInsights([]); lastGenerationKey.current = ''; }} placeholder="https://www.facebook.com/pagina" />
                    </label>
                  </div>
                  {socialInsights.length > 0 && (
                    <div className="brand-dossier" aria-label="Dossiê público da marca">
                      {socialInsights.map((profile) => (
                        <article key={`${profile.platform}-${profile.url}`} className={profile.status === 'public' ? 'available' : 'restricted'}>
                          <span>{profile.platform === 'instagram' ? 'IG' : 'FB'}</span>
                          <div><b>{profile.status === 'public' ? (profile.title || 'Perfil público encontrado') : 'Leitura limitada pela rede'}</b><small>{profile.status === 'public' ? (profile.description || 'Perfil validado, sem descrição pública.') : 'Cole a bio e os materiais autorizados abaixo.'}</small></div>
                          <i>{profile.status === 'public' ? 'LIDO' : 'MANUAL'}</i>
                        </article>
                      ))}
                      {socialInsights.some((profile) => profile.status === 'public' && profile.imageUrl) && (
                        <>
                          <div className="social-image-gallery" aria-label="Imagens institucionais públicas encontradas">
                            {socialInsights.filter((profile) => profile.status === 'public' && profile.imageUrl).map((profile) => (
                              <article
                                key={`image-${profile.platform}-${profile.url}`}
                                role="img"
                                aria-label={`Imagem institucional pública encontrada no ${profile.platform}`}
                                style={{ backgroundImage: `linear-gradient(180deg,transparent 45%,rgba(12,12,10,.74)),url(${JSON.stringify(profile.imageUrl).slice(1, -1)})` }}
                              >
                                <span>{profile.platform === 'instagram' ? 'Instagram' : 'Facebook'} · imagem pública</span>
                              </article>
                            ))}
                          </div>
                          <label className="photo-authorization">
                            <input type="checkbox" checked={useSocialPhotos} onChange={(event) => setUseSocialPhotos(event.target.checked)} />
                            <span><b>Usar fotos públicas encontradas</b><small>Confirmo que tenho autorização para usar essas imagens no site.</small></span>
                          </label>
                        </>
                      )}
                    </div>
                  )}
                  <label className="social-notes">Publicações e materiais autorizados
                    <textarea value={socialNotes} onChange={(event) => { setSocialNotes(event.target.value); lastGenerationKey.current = ''; }} placeholder="Cole legendas ou publicações recentes e descreva serviços, campanhas, cores e fotos autorizadas. Não inclua dados que você não confirmou." />
                  </label>
                  <div className="social-actions"><p>A IA considera publicações acessíveis publicamente. Se a rede exigir login, cole as legendas acima. A geração acontece uma só vez ao avançar.</p><div><button type="button" className="ghost-social-button" onClick={() => void analyzeSocialProfiles()} disabled={analyzingSocial}>{analyzingSocial ? 'Analisando...' : 'Analisar perfis'}</button></div></div>
                </div>
              </>
            )}
          </section>

          <section className={`ai-panel form-step ${currentStep === 3 ? 'active' : ''}`} id="direcao" aria-hidden={currentStep !== 3}>
            <div className="panel-heading"><span>03</span><div><b>Direção criativa</b><small>Cada caminho muda narrativa, copy e interação</small></div></div>
            <div className="ranking-note">Gemini e GPT‑5.4 pesquisam fontes públicas e perfis compatíveis, acessam URLs informadas e evoluem o prompt com raciocínio médio, sem assumir que homônimos são a mesma empresa.</div>
            <div className="ai-list">
              {creativeDirections.map((direction, index) => (
                <button
                  key={direction.id}
                  type="button"
                  className={activeDirection === direction.id ? 'ai-row selected' : 'ai-row'}
                  onClick={() => {
                    setActiveDirection(direction.id);
                    setVariation(0);
                    lastGenerationKey.current = '';
                    setNotice(selectedLead ? `${direction.name} selecionada. A IA escolhida aplicará essa direção ao avançar.` : 'Direção escolhida. Agora selecione uma oportunidade real.');
                  }}
                >
                  <span className="ai-rank">0{index + 1}</span><span className="ai-logo" style={{ background: direction.color }}>{direction.name.charAt(0)}</span>
                  <span className="ai-info"><b>{direction.name}</b><small>{direction.kind}</small><em>{direction.reason}</em></span>
                  <span className="ai-score">↗</span>
                </button>
              ))}
            </div>

            <div className="provider-control">
              <small>ESCOLHA A IA</small>
              <div className="profession-strip" role="group" aria-label="Modelo de IA do construtor">
                {aiModels.map((model) => (
                  <button
                    type="button"
                    key={model.id}
                    className={builderAiModel === model.id ? 'profession active provider-choice' : 'profession provider-choice'}
                    disabled={Boolean(buildingSite) || !providerStatus[model.provider].configured}
                    onClick={() => {
                      setBuilderAiModel(model.id);
                      lastGenerationKey.current = '';
                      setGeneratedSiteHtml('');
                      setSiteUsage(null);
                      setSiteBuildNotice(`${model.label} selecionado com ${reasoningLabel(model.id)}.`);
                      setNotice(`${model.label} selecionado. A próxima geração usará ${reasoningLabel(model.id)}.`);
                    }}
                  >
                    <span>{model.icon}</span>{model.label}<small>{model.detail} · {providerStatus[model.provider].configured ? 'configurado' : 'sem chave'}</small>
                  </button>
                ))}
              </div>
              <div className="provider-recommendation">
                As chaves ficam protegidas somente no servidor. A interface nunca recebe, grava ou exibe os segredos.
              </div>
            </div>

          </section>

          <section className={`content-step form-step ${currentStep === 4 ? 'active' : ''}`} id="brief" aria-hidden={currentStep !== 4}>
          <div className="prompt-panel">
            <div className="prompt-header">
              <div className="panel-heading"><span>04</span><div><b>Prompt premium automático</b><small>{selectedLead ? `Personalizado para ${selectedLead.name}` : 'Será personalizado com o lead selecionado'}</small></div></div>
              <div className="prompt-actions">
                <button type="button" onClick={() => void regenerateVariation()} disabled={generatingPrompt || !selectedLead}>{generatingPrompt ? 'Gerando...' : 'Gerar nova variação'}</button>
                <button type="button" onClick={copyPrompt} disabled={!generatedBrief}>{copied ? 'Copiado ✓' : 'Copiar prompt'}</button>
              </div>
            </div>
            <div className="prompt-code">
              <div className="prompt-top"><span>prompt-site.md · automático compacto</span><i>{activePrompt.length.toLocaleString('pt-BR')} caracteres</i></div>
              <textarea className="prompt-editor" value={activePrompt} onChange={(event) => setGeneratedBrief(event.target.value)} aria-label="Prompt do site" />
            </div>
            <div className="prompt-footer"><span>✦ Único para cada oportunidade</span><span>Busca Google + acesso por URL</span><span>{reasoningLabel(builderAiModel)}</span><span>Auditoria factual</span></div>
          </div>

          <div className="proposal-panel" id="proposta">
            <div className="prompt-header">
              <div className="panel-heading"><span>04B</span><div><b>Proposta automática</b><small>{selectedLead ? `Escopo comercial para ${selectedLead.name}` : 'Gerada junto com o prompt'}</small></div></div>
              <div className="prompt-actions"><button type="button" onClick={copyProposal} disabled={!generatedProposal}>{copiedProposal ? 'Copiada ✓' : 'Copiar proposta'}</button></div>
            </div>
            <div className="proposal-summary"><span>Mensagem curta</span><span>Pronta para WhatsApp</span><span>Sem preço inventado</span></div>
            <textarea className="proposal-editor" value={generatedProposal || 'Selecione uma oportunidade para gerar uma proposta curta e pronta para enviar ao cliente.'} onChange={(event) => setGeneratedProposal(event.target.value)} aria-label="Proposta automática" />
          </div>
          </section>

          <section className={`builder-panel form-step ${currentStep === 5 ? 'active' : ''}`} id="site-gerado" aria-hidden={currentStep !== 5}>
            <div className="builder-heading">
              <div className="panel-heading"><span>05</span><div><b>Construtor integrado</b><small>O site é criado e exibido aqui, sem encaminhamento</small></div></div>
              <div className="usage-chip">{siteUsage !== null ? `${siteUsage.toLocaleString('pt-BR')} tokens · ${reasoningLabel(builderAiModel)}` : `AI ROUTER · ${reasoningLabel(builderAiModel).toUpperCase()}`}</div>
            </div>

            <article className={`strategic-analysis ${generatingPrompt ? 'loading' : ''}`} aria-live="polite">
              <span>ANÁLISE DA IA EM TEMPO REAL</span>
              <h3>Por que este site pode gerar valor para {selectedLead?.name || 'o estabelecimento'}</h3>
              {generatingPrompt
                ? <p>O {modelLabel(builderAiModel)} está cruzando o briefing, a oportunidade e os materiais sociais confirmados...</p>
                : <p>{strategicAnalysis || 'A análise aparecerá aqui quando o briefing estiver pronto. Ela explicará posicionamento, proposta de valor e como o site ajuda o cliente a avançar.'}</p>}
              <small>Modelo: {builderAiModel} · {reasoningLabel(builderAiModel)} · dados públicos e materiais autorizados · sem fatos inventados</small>
            </article>

            <div className="builder-options">
              <article className="builder-option recommended">
                <span className="builder-badge">RECOMENDADO</span>
                <div className="builder-logo">IA</div>
                <h3>Construir com {modelLabel(builderAiModel)}</h3>
                <p>A IA gera a página completa com {reasoningLabel(builderAiModel)} e mostra a prévia dentro do Lead Studio.</p>
                <button type="button" onClick={() => void buildSite()} disabled={Boolean(buildingSite) || !generatedBrief || !activeProviderConfigured}>
                  {buildingSite === 'internal' ? 'A IA está programando...' : 'Criar e visualizar agora'}
                </button>
              </article>

            </div>

            <div className="builder-notice" role="status">{siteBuildNotice}</div>

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

        <nav className="wizard-actions" aria-label="Navegação entre etapas">
          <button type="button" className="wizard-back" onClick={prevStep} disabled={currentStep === 1}>← Voltar</button>
          <span>Etapa {currentStep} de {totalSteps}</span>
          <button type="button" className="wizard-next" onClick={() => void nextStep()} disabled={currentStep === totalSteps || generatingPrompt}>
            {currentStep === totalSteps ? 'Fluxo concluído ✓' : generatingPrompt ? `${modelLabel(builderAiModel)} analisando...` : 'Avançar →'}
          </button>
        </nav>
    </main>
  );
}
