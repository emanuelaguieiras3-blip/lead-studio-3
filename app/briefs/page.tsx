'use client';

import Link from 'next/link';

export default function BriefsPage() {
  return (
    <main className="page-shell">
      <div className="page-shell-inner">
        <div className="page-topbar">
          <div className="page-brand">
            <div className="page-brand-mark">L</div>
            <h1>Briefs</h1>
          </div>
          <nav className="page-nav" aria-label="Navegação de briefs">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/oportunidades">Oportunidades</Link>
            <Link href="/briefs" className="primary">Briefs</Link>
            <Link href="/insights">Insights</Link>
          </nav>
        </div>

        <div className="page-grid">
          <section className="page-card">
            <h2>Brief principal</h2>
            <p>O prompt foi gerado com foco em prestígio, conversão e posicionamento premium, seguindo a linha de marca de alto padrão.</p>
            <Link href="/" className="page-action">Ir para o prompt →</Link>
          </section>

          <section className="page-card">
            <h2>Agentes ativos</h2>
            <div className="list-stack">
              <div className="list-item"><div><b>Gemini</b><span>Brief detalhado</span></div><span>Ativo</span></div>
              <div className="list-item"><div><b>Codex</b><span>Implementação</span></div><span>Pronto</span></div>
              <div className="list-item"><div><b>Cursor</b><span>Iterações</span></div><span>Disponível</span></div>
            </div>
          </section>

          <section className="page-card">
            <h2>Uso sugerido</h2>
            <p>Copie o prompt para o agente que você preferir e ajuste só os pontos específicos da marca ou do cliente.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
