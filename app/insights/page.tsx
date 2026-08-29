'use client';

import Link from 'next/link';

export default function InsightsPage() {
  return (
    <main className="page-shell">
      <div className="page-shell-inner">
        <div className="page-topbar">
          <div className="page-brand">
            <div className="page-brand-mark">L</div>
            <h1>Insights</h1>
          </div>
          <nav className="page-nav" aria-label="Navegação de insights">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/oportunidades">Oportunidades</Link>
            <Link href="/briefs">Briefs</Link>
            <Link href="/insights" className="primary">Insights</Link>
          </nav>
        </div>

        <div className="page-grid">
          <section className="page-card">
            <h2>Performance segmentada</h2>
            <p>As oportunidades com mais indicações e avaliações locais possuem maior chance de conversão e oportunidade de posicionamento premium.</p>
          </section>

          <section className="page-card">
            <h2>Indicadores</h2>
            <div className="list-stack">
              <div className="list-item"><div><b>CTR local</b><span>navegadores locais</span></div><span>43%</span></div>
              <div className="list-item"><div><b>Conversão</b><span>contatos viáveis</span></div><span>27%</span></div>
              <div className="list-item"><div><b>Retenção</b><span>clientes ativos</span></div><span>68%</span></div>
            </div>
          </section>

          <section className="page-card">
            <h2>Recomendação</h2>
            <p>Priorize negócios com boa avaliação, presença local forte e pouco ou nenhum site para maximizar a conversão de lead em cliente.</p>
            <Link href="/" className="page-action">Voltar ao radar →</Link>
          </section>
        </div>
      </div>
    </main>
  );
}
