'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center', background: '#0b0e1a', color: '#fff' }}>
        <h2>Algo deu errado!</h2>
        <p style={{ color: '#8b92a8', margin: '1rem 0' }}>Ocorreu um erro ao carregar a página.</p>
        <button
          onClick={() => reset()}
          style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#3b5bff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
