import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';

import { POST } from '../app/api/social-profile/route.ts';

test('social profile analysis extracts only public metadata from an allowed profile URL', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(`<!doctype html><html><head>
    <meta property="og:title" content="Marca Exemplo no Instagram">
    <meta property="og:description" content="Bio pública &amp; confirmada">
    <meta property="og:image" content="https://cdninstagram.com/public.jpg">
  </head></html>`, { status: 200, headers: { 'Content-Type': 'text/html' } })) as typeof fetch;

  try {
    const request = new NextRequest('http://localhost:3000/api/social-profile', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      body: JSON.stringify({ instagramUrl: 'https://www.instagram.com/marca-exemplo/' }),
    });
    const response = await POST(request);
    const payload = await response.json() as { profiles: Array<{ title: string; description: string; status: string }> };
    assert.equal(response.status, 200);
    assert.equal(payload.profiles[0]?.status, 'public');
    assert.equal(payload.profiles[0]?.title, 'Marca Exemplo no Instagram');
    assert.equal(payload.profiles[0]?.description, 'Bio pública & confirmada');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('social profile analysis rejects non-social destinations', async () => {
  const request = new NextRequest('http://localhost:3000/api/social-profile', {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ instagramUrl: 'https://example.com/private' }),
  });
  const response = await POST(request);
  assert.equal(response.status, 400);
});
