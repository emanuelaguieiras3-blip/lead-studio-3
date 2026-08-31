import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOpportunityPrompt } from '../app/api/generate/route.ts';

test('buildOpportunityPrompt creates a detailed, source-grounded website brief', () => {
  const prompt = buildOpportunityPrompt(
    { segment: 'Barbearia', city: 'São Paulo', state: 'SP' },
    {
      id: 'place-123',
      name: 'Barbearia Central',
      address: 'Rua Exemplo, 100 · São Paulo, SP',
      phone: '+55 (11) 99999-0000',
      mapsUrl: 'https://maps.google.com/?cid=123',
      source: 'google',
      rating: 4.8,
      reviewCount: 125,
    },
    'cinematic',
    0,
  );

  assert.ok(prompt.length > 9_000);
  assert.match(prompt, /DADOS VERIFICADOS/);
  assert.match(prompt, /AUDITORIA FACTUAL/i);
  assert.match(prompt, /\+55 \(11\) 99999-0000/);
  assert.match(prompt, /https:\/\/maps\.google\.com\/\?cid=123/);
  assert.match(prompt, /não criar WhatsApp/i);
  assert.match(prompt, /\[VALIDAR COM O NEGÓCIO\]/);
});
