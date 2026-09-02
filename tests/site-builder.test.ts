import test from 'node:test';
import assert from 'node:assert/strict';

import { NextRequest } from 'next/server.js';

import { POST, buildCompactSitePrompt, buildLocalFallbackSite, buildOpenAISiteRequest, extractSafeHtml } from '../app/api/build-site/route.ts';

test('extractSafeHtml keeps a complete page and injects an isolated content policy', () => {
  const html = extractSafeHtml(`\`\`\`html
<!doctype html><html lang="pt-BR"><head><title>Teste</title></head><body><main>Conteúdo</main></body></html>
\`\`\``);

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'none'/);
});

test('extractSafeHtml removes external executable embeds', () => {
  const html = extractSafeHtml('<!doctype html><html><head></head><body><iframe src="https://example.com"></iframe><script src="https://example.com/a.js"></script><main>Seguro</main></body></html>');

  assert.doesNotMatch(html, /iframe/i);
  assert.doesNotMatch(html, /script src/i);
  assert.match(html, /<main>Seguro<\/main>/);
});

test('extractSafeHtml rejects responses that are not complete pages', () => {
  assert.equal(extractSafeHtml('<section>Somente um fragmento</section>'), '');
});

test('extractSafeHtml accepts a streamed page even when the trailing code fence has not arrived', () => {
  const html = extractSafeHtml('```html\n<!doctype html><html><head></head><body><main>Streaming</main></body></html>');
  assert.match(html, /^<!doctype html>/i);
  assert.doesNotMatch(html, /```/);
});

test('buildCompactSitePrompt requires verified data and a complete standalone page', () => {
  const prompt = buildCompactSitePrompt('NEGÓCIO: exemplo verificado');

  assert.match(prompt, /<!doctype html>/i);
  assert.match(prompt, /Não invente telefone/i);
  assert.match(prompt, /não use bibliotecas/i);
  assert.match(prompt, /NEGÓCIO: exemplo verificado/);
  assert.match(prompt, /hero de tela cheia, narrativa por scroll, cena sticky/i);
  assert.match(prompt, /não devolva relatório, checklist, markdown/i);
});

test('GPT-5.4 site builder uses medium reasoning, streaming and no response storage', () => {
  const request = buildOpenAISiteRequest('NEGÓCIO: exemplo verificado');
  assert.equal(request.model, 'gpt-5.4');
  assert.deepEqual(request.reasoning, { effort: 'medium' });
  assert.equal(request.text.verbosity, 'low');
  assert.equal(request.stream, true);
  assert.equal(request.store, false);
  assert.match(request.input, /NEGÓCIO: exemplo verificado/);
  assert.doesNotMatch(JSON.stringify(request), /api[_-]?key/i);
});

test('local fallback builds a complete page using only verified fields', () => {
  const html = buildLocalFallbackSite(`# PROMPT DE PRODUÇÃO — Barbearia Exemplo

## DADOS VERIFICADOS — NÃO ALTERAR NEM COMPLETAR POR SUPOSIÇÃO
- Nome: Barbearia Exemplo
- Segmento pesquisado: Barbearia
- Endereço/localização pública: Rua Exemplo, 10
- Contato público: (11) 99999-0000
- Reputação pública: 4.8 estrelas em 120 avaliações públicas
- Fonte do cadastro: Google Places
- Link da fonte/mapa: https://maps.google.com/?q=exemplo`);

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /Barbearia Exemplo/);
  assert.match(html, /tel:11999990000/);
  assert.doesNotMatch(html, /WhatsApp/i);
});

test('site builder uses European Portuguese for Portugal, including the safe fallback', () => {
  const specification = `# PROMPT DE PRODUÇÃO — Comércio Lisboa

## DADOS VERIFICADOS — NÃO ALTERAR NEM COMPLETAR POR SUPOSIÇÃO
- Nome: Comércio Lisboa
- Segmento pesquisado: Restaurante
- Endereço/localização pública: Lisboa, Portugal
- Contato público: +351 912 345 678
- Reputação pública: 4.7 estrelas em 80 avaliações públicas
- Fonte do cadastro: Google Places
- Link da fonte/mapa: https://maps.google.com/?q=lisboa`;
  const html = buildLocalFallbackSite(specification, 'PT');
  const geminiPrompt = buildCompactSitePrompt(specification, 'PT');

  assert.match(html, /<html lang="pt-PT">/i);
  assert.match(html, /Entrar em contacto/);
  assert.match(html, /Contacto direto/);
  assert.match(html, /equipa e elementos diferenciadores/);
  assert.match(html, /tel:\+351912345678/);
  assert.doesNotMatch(html, /Entrar em contato|equipe e diferenciais/);
  assert.match(geminiPrompt, /português europeu \(pt-PT\)/i);
  assert.match(geminiPrompt, /Não misture variantes linguísticas/i);
});

test('POST returns a safe working fallback when no private Gemini key exists', async () => {
  const previousGemini = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const request = new NextRequest('http://localhost:3000/api/build-site', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json', 'x-forwarded-for': 'test-gemini-fallback' },
      body: JSON.stringify({ action: 'build', provider: 'gemini', model: 'gemini-3.6-flash', prompt: 'Brief verificado. '.repeat(40) }),
    });
    const response = await POST(request);
    const payload = await response.json() as { html?: string; mode?: string };
    assert.equal(response.status, 200);
    assert.equal(payload.mode, 'local-fallback');
    assert.match(payload.html ?? '', /<!doctype html>/i);
  } finally {
    if (previousGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGemini;
  }
});

test('POST returns a safe working fallback when no private OpenAI key exists', async () => {
  const previousOpenAI = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const request = new NextRequest('http://localhost:3000/api/build-site', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json', 'x-forwarded-for': 'test-openai-fallback' },
      body: JSON.stringify({ action: 'build', provider: 'openai', model: 'gpt-5.4', prompt: 'Brief verificado. '.repeat(40) }),
    });
    const response = await POST(request);
    const payload = await response.json() as { provider?: string; html?: string; mode?: string };
    assert.equal(response.status, 200);
    assert.equal(payload.provider, 'openai');
    assert.equal(payload.mode, 'local-fallback');
    assert.match(payload.html ?? '', /<!doctype html>/i);
  } finally {
    if (previousOpenAI === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAI;
  }
});

test('POST rejects mismatched or removed AI providers', async () => {
  const invalidChoices = [
    { provider: 'openai', model: 'gemini-3.6-flash' },
    { provider: 'anthropic', model: 'gpt-5.4' },
  ];
  for (const [index, choice] of invalidChoices.entries()) {
    const request = new NextRequest('http://localhost:3000/api/build-site', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json', 'x-forwarded-for': `test-invalid-${index}` },
      body: JSON.stringify({ action: 'build', ...choice, prompt: 'Brief verificado. '.repeat(40) }),
    });
    const response = await POST(request);
    assert.equal(response.status, 400);
  }
});
