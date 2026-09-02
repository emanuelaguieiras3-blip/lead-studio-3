import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#f5f5f7' }}>
      <h2>Página não encontrada</h2>
      <p style={{ color: '#8b92a8', margin: '1rem 0' }}>A rota solicitada não existe.</p>
      <Link
        href="/"
        style={{ display: 'inline-block', padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#3b5bff', color: '#fff', textDecoration: 'none', fontWeight: 600 }}
      >
        Voltar para a Visão Geral
      </Link>
    </div>
  );
}
