'use client';

import { useEffect, useMemo, useState } from 'react';

type StateOption = { id: number; sigla: string; nome: string };
type CityOption = { id: number; nome: string };
type SitePlan = {
  headline: string;
  subheadline: string;
  cta: string;
  benefits: string[];
  tone: string;
  palette: { primary: string; accent: string; background: string };
};

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

const agents = [
  ['✦', 'Criador de sites', 'Ativo'], ['◎', 'Estrategista', 'Briefing'],
  ['T', 'Copywriter', 'Textos'], ['◫', 'Designer', 'Visual'], ['↗', 'SEO local', 'Busca'],
];

export default function Home() {
  const [business, setBusiness] = useState('Clínica Aurora');
  const [segment, setSegment] = useState('Clínica de estética');
  const [audience, setAudience] = useState('Mulheres de 25 a 55 anos que buscam autocuidado e resultados naturais.');
  const [stateId, setStateId] = useState('35');
  const [cities, setCities] = useState<CityOption[]>([]);
  const [city, setCity] = useState('São Paulo');
  const [loadingCities, setLoadingCities] = useState(false);
  const [activeAgent, setActiveAgent] = useState(0);
  const [objective, setObjective] = useState('Receber pedidos de avaliação pelo WhatsApp');
  const [tone, setTone] = useState('Elegante e acolhedor');
  const [sitePlan, setSitePlan] = useState<SitePlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [engine, setEngine] = useState('auto');
  const [generationMode, setGenerationMode] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoadingCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: CityOption[]) => {
        setCities(data);
        if (!data.some((item) => item.nome === city)) setCity(data[0]?.nome ?? '');
      })
      .catch((error) => { if (error.name !== 'AbortError') setCities([]); })
      .finally(() => setLoadingCities(false));
    return () => controller.abort();
  }, [stateId]);

  const state = useMemo(() => states.find((item) => String(item.id) === stateId), [stateId]);
  const headline = sitePlan?.headline ?? `${segment || 'Seu negócio'}, com uma presença que inspira confiança.`;
  const subheadline = sitePlan?.subheadline ?? audience;
  const benefits = sitePlan?.benefits ?? ['Experiência personalizada', 'Contato sem fricção', 'Presença que converte'];

  async function generateSite() {
    if (!business.trim() || !segment.trim() || !city) {
      setGenerationError('Preencha o nome, o segmento e a localização.');
      return;
    }
    setGenerating(true);
    setGenerationError('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business, segment, audience, objective, tone, city, state: state?.nome, engine }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível gerar o site.');
      setSitePlan(data.plan);
      setGenerationMode(data.mode === 'openai' ? 'Criado com OpenAI' : 'Criado no modo local ilimitado');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Não foi possível gerar o site.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand-mark" aria-label="Lead Studio">L</div>
        <nav className="rail-nav" aria-label="Navegação principal">
          <button className="rail-button active" aria-label="Estúdio">✦</button>
          <button className="rail-button" aria-label="Projetos">▦</button>
          <button className="rail-button" aria-label="Leads">♙</button>
          <button className="rail-button" aria-label="Biblioteca">◫</button>
        </nav>
        <button className="rail-button account" aria-label="Sua conta">LM</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow"><span className="live-dot" /> AGENTE ONLINE</div>
            <h1>Lead Studio <span>/ Novo projeto</span></h1>
          </div>
          <div className="top-actions">
            <label className="model-menu"><span>MODELO</span>
              <select value={engine} onChange={(event) => setEngine(event.target.value)}>
                <option value="auto">Lead Agent · automático</option>
                <option value="local">Lead Local · ilimitado</option>
                <option disabled>Claude · conectar API</option>
                <option disabled>Cursor · ambiente externo</option>
              </select>
            </label>
            <button className="ghost-button">Salvar rascunho</button>
            <button className="primary-button" onClick={generateSite} disabled={generating}>{generating ? 'Criando...' : 'Gerar com IA'} <span>↗</span></button>
          </div>
        </header>

        <div className="content-grid">
          <section className="control-panel">
            <div className="panel-intro">
              <span className="step-pill">01 — PERFIL</span>
              <h2>Conte sobre a pessoa ou negócio.</h2>
              <p>A IA transforma estas respostas em estratégia, texto e visual.</p>
            </div>

            <div className="agent-picker">
              <div className="section-label">TIME DE IA</div>
              {agents.map(([icon, name, label], index) => (
                <button key={name} className={`agent-row ${activeAgent === index ? 'selected' : ''}`} onClick={() => setActiveAgent(index)}>
                  <span className="agent-icon">{icon}</span>
                  <span><strong>{name}</strong><small>{label}</small></span>
                  <span className="agent-check">{activeAgent === index ? '●' : '›'}</span>
                </button>
              ))}
            </div>

            <div className="form-card">
              <label>Nome do negócio
                <input value={business} onChange={(event) => setBusiness(event.target.value)} placeholder="Ex.: Clínica Aurora" />
              </label>
              <label>Segmento
                <input value={segment} onChange={(event) => setSegment(event.target.value)} placeholder="Ex.: Arquitetura, estética, advocacia" />
              </label>
              <div className="field-row">
                <label>Estado
                  <select value={stateId} onChange={(event) => setStateId(event.target.value)}>
                    {states.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </label>
                <label>Cidade
                  <select value={city} onChange={(event) => setCity(event.target.value)} disabled={loadingCities}>
                    {loadingCities && <option>Carregando...</option>}
                    {!loadingCities && cities.map((item) => <option key={item.id} value={item.nome}>{item.nome}</option>)}
                  </select>
                </label>
              </div>
              <label>Público ideal
                <textarea value={audience} onChange={(event) => setAudience(event.target.value)} rows={3} />
              </label>
              <label>Objetivo principal
                <input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Ex.: receber contatos no WhatsApp" />
              </label>
              <label>Tom da marca
                <select value={tone} onChange={(event) => setTone(event.target.value)}>
                  <option>Elegante e acolhedor</option><option>Direto e comercial</option>
                  <option>Moderno e ousado</option><option>Técnico e confiável</option>
                  <option>Leve e próximo</option>
                </select>
              </label>
              <div className="form-footer">
                <span><b>6/6</b> informações essenciais</span>
                <span className="ready-badge">Pronto para criar</span>
              </div>
            </div>
          </section>

          <section className="preview-panel">
            <div className="preview-toolbar">
              <div className="browser-dots"><i /><i /><i /></div>
              <div className="preview-address">{business.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'seu-site'}.com.br</div>
              <div className="device-toggle"><button className="active">▱</button><button>▯</button></div>
            </div>

            <div className="site-preview">
              <nav className="site-nav">
                <div className="preview-logo"><span>{business.charAt(0) || 'L'}</span>{business || 'Seu negócio'}</div>
                <div className="site-links"><span>Início</span><span>Serviços</span><span>Sobre</span></div>
                <button>Agendar conversa</button>
              </nav>
              <div className="hero-preview" style={sitePlan ? { background: sitePlan.palette.background } : undefined}>
                <div className="hero-copy">
                  <div className="location-tag">ATENDIMENTO EM {city.toUpperCase()} · {state?.sigla}</div>
                  <h3>{headline}</h3>
                  <p>{subheadline || 'Uma experiência criada para o perfil certo, no lugar certo.'}</p>
                  <div className="hero-actions"><button style={sitePlan ? { background: sitePlan.palette.primary, color: '#fff' } : undefined}>{sitePlan?.cta ?? 'Quero saber mais'}</button><span style={sitePlan ? { color: sitePlan.palette.accent } : undefined}>✦ EXPERIÊNCIA SOB MEDIDA <small>{sitePlan?.tone ?? tone}</small></span></div>
                </div>
                <div className="visual-card">
                  <div className="orb orb-one" /><div className="orb orb-two" />
                  <div className="glass-note"><b>+32%</b><span>mais contatos qualificados</span></div>
                  <div className="portrait-shape"><div className="portrait-head" /><div className="portrait-body" /></div>
                </div>
              </div>
              <div className="trust-strip"><span>ESTRATÉGIA LOCAL</span><span>•</span><span>DESIGN AUTORAL</span><span>•</span><span>CONVERSÃO REAL</span></div>
              <div className="service-row">
                {benefits.slice(0, 3).map((item, index) => (
                  <div key={item}><span>0{index + 1}</span><strong>{item}</strong><small>Conteúdo pensado para pessoas reais.</small></div>
                ))}
              </div>
            </div>

            <div className="generation-bar">
              <div className="ai-avatar">✦</div>
              <div><strong>{generating ? 'O Criador está trabalhando...' : sitePlan ? 'Nova versão criada' : 'O Criador está pronto'}</strong><span>{generationError || (sitePlan ? generationMode : 'Estratégia, copy e layout serão gerados juntos.')}</span></div>
              <button onClick={generateSite} disabled={generating}>{generating ? 'Gerando...' : sitePlan ? 'Gerar outra' : 'Começar geração'}</button>
            </div>
            <p className="usage-note">IA conectada à sua conta OpenAI · consumo sujeito à cota e ao faturamento do projeto.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
