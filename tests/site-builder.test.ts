import test from 'node:test';
import assert from 'node:assert/strict';

import { extractSafeHtml } from '../app/api/build-site/route.ts';

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
