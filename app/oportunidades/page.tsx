'use client';

import Link from 'next/link';

export default function OportunidadesPage() {
  return (
    <main className="page-shell">
      <div className="page-shell-inner">
        <div className="page-topbar">
          <div className="page-brand">
            <div className="page-brand-mark">L</div>
            <h1>Oportunidades</h1>
          </div>
          <nav className="page-nav" aria-label="Navegação de oportunidades">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/oportunidades" className="primary">Oportunidades</Link>
            <Link href="/briefs">Briefs</Link>
            <Link href="/insights">Insights</Link>
          </nav>
        </div>

        <div className="page-grid">
          <section className="page-card">
            <h2>Empresas em foco</h2>
            <div className="list-stack">
              <div className="list-item"><div><b>Barbearia Atlas</b><span>São Paulo · SP</span></div><span>4.9 ★</span></div>
              <div className="list-item"><div><b>Clínica Soléa</b><span>Campinas · SP</span></div><span>4.8 ★</span></div>
              <div className="list-item"><div><b>Advocacia Mello</b><span>Rio · RJ</span></div><span>4.7 ★</span></div>
            </div>
          </section>

          <section className="page-card">
            <h2>Filtragem ativa</h2>
            <div className="list-stack">
              <div className="list-item"><div><b>Sem site</b><span>Google Places</span></div><span>Ativo</span></div>
              <div className="list-item"><div><b>Reputação</b><span>30+ avaliações</span></div><span>OK</span></div>
              <div className="list-item"><div><b>Localidade</b><span>São Paulo</span></div><span>Atual</span></div>
            </div>
          </section>

          <section className="page-card">
            <h2>Próximo passo</h2>
            <p>Escolha um lead, gere o prompt e mova a oportunidade direto para a criação do site premium.</p>
            <Link href="/" className="page-action">Voltar ao radar →</Link>
          </section>
        </div>
      </div>
    </main>
  );
}
