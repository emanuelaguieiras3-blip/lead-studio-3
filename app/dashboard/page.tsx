'use client';

import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main className="page-shell">
      <div className="page-shell-inner">
        <div className="page-topbar">
          <div className="page-brand">
            <div className="page-brand-mark">L</div>
            <h1>Lead Studio</h1>
          </div>
          <nav className="page-nav" aria-label="Navegação da aplicação">
            <Link href="/dashboard" className="primary">Dashboard</Link>
            <Link href="/oportunidades">Oportunidades</Link>
            <Link href="/briefs">Briefs</Link>
            <Link href="/insights">Insights</Link>
          </nav>
        </div>

        <div className="metric-row">
          <div className="metric-box">
            <span>Leads</span>
            <strong>128</strong>
          </div>
          <div className="metric-box">
            <span>Taxa</span>
            <strong>27%</strong>
          </div>
          <div className="metric-box">
            <span>Pedidos</span>
            <strong>18</strong>
          </div>
        </div>

        <div className="page-grid" style={{ marginTop: 22 }}>
          <section className="page-card">
            <h2>Resumo</h2>
            <p>O radar está funcionando e mostrando oportunidades em processo de análise. Os principais indicadores estão estáveis e prontos para conversão.</p>
            <Link href="/oportunidades" className="page-action">Abrir oportunidades →</Link>
          </section>

          <section className="page-card">
            <h2>Briefs prontos</h2>
            <div className="list-stack">
              <div className="list-item"><div><b>Barbearia Premium</b><span>São Paulo · SP</span></div><span>2h</span></div>
              <div className="list-item"><div><b>Clínica de estética</b><span>Campinas · SP</span></div><span>4h</span></div>
              <div className="list-item"><div><b>Advocacia</b><span>Rio · RJ</span></div><span>1d</span></div>
            </div>
          </section>

          <section className="page-card">
            <h2>Atividade</h2>
            <div className="list-stack">
              <div className="list-item"><div><b>Google Places</b><span>Busca concluída</span></div><span>Ativo</span></div>
              <div className="list-item"><div><b>Prompt AI</b><span>Gemini e Codex</span></div><span>Pronto</span></div>
              <div className="list-item"><div><b>Campanhas</b><span>Aguardando revisão</span></div><span>3</span></div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
