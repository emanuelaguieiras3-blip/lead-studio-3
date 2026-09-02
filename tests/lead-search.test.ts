import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';

import { POST as searchLeads, buildSearchQueries, filterLeadCandidates, normalizePublicPhone } from '../app/api/leads/route.ts';

test('buildSearchQueries creates broader city-specific searches', () => {
  const queries = buildSearchQueries('Barbearia', 'São Paulo', 'São Paulo');

  assert.ok(queries.some((query) => query.includes('Barbearia') && query.includes('São Paulo')));
  assert.ok(queries.length >= 3);
});

test('filterLeadCandidates keeps operational Google Maps businesses with public phone, no website and the requested reputation', () => {
  const results = [
    {
      id: '1',
      displayName: { text: 'Barbearia Central' },
      formattedAddress: 'São Paulo, SP',
      rating: 4.8,
      userRatingCount: 52,
      websiteUri: undefined,
      nationalPhoneNumber: '+55 11 99999-0000',
      googleMapsUri: 'https://maps.google.com/1',
      businessStatus: 'OPERATIONAL',
    },
    {
      id: '2',
      displayName: { text: 'Barbearia Premium' },
      formattedAddress: 'São Paulo, SP',
      rating: 4.4,
      userRatingCount: 18,
      websiteUri: 'https://barbearia.com',
      nationalPhoneNumber: '+55 11 98888-0000',
      googleMapsUri: 'https://maps.google.com/2',
      businessStatus: 'OPERATIONAL',
    },
    {
      id: '3',
      displayName: { text: 'Fechada Permanente' },
      formattedAddress: 'São Paulo, SP',
      rating: 0,
      userRatingCount: 0,
      websiteUri: undefined,
      nationalPhoneNumber: '+55 11 97777-0000',
      googleMapsUri: '',
      businessStatus: 'CLOSED_PERMANENTLY',
    },
  ];

  const leads = filterLeadCandidates(results, 50);

  assert.equal(leads.length, 1);
  assert.equal(leads[0].id, '1');
  assert.equal(leads[0].phone, '+55 (11) 99999-0000');
  assert.match(leads[0].verificationLabel, /Google Maps/);
});

test('buildSearchQueries localizes Portuguese searches without spending a query on Brazil', () => {
  const queries = buildSearchQueries('Todos os comércios', 'Lisboa', 'Lisboa', 'PT');

  assert.ok(queries.some((query) => query.includes('comércios e serviços') && query.includes('Portugal')));
  assert.ok(queries.every((query) => !query.includes('Brasil')));
});

test('filterLeadCandidates rejects invalid phones and listings without a Google Maps URL', () => {
  const results = [
    {
      id: 'invalid-phone',
      displayName: { text: 'Negócio sem telefone válido' },
      formattedAddress: 'São Paulo, SP',
      rating: 4.9,
      userRatingCount: 120,
      nationalPhoneNumber: 'sem telefone',
      googleMapsUri: 'https://maps.google.com/invalid-phone',
      businessStatus: 'OPERATIONAL',
    },
    {
      id: 'without-map',
      displayName: { text: 'Negócio sem mapa' },
      formattedAddress: 'São Paulo, SP',
      rating: 4.9,
      userRatingCount: 120,
      nationalPhoneNumber: '(11) 3333-4444',
      googleMapsUri: '',
      businessStatus: 'OPERATIONAL',
    },
  ];

  assert.deepEqual(filterLeadCandidates(results, 20), []);
});

test('normalizePublicPhone accepts Brazilian public numbers and removes invalid values', () => {
  assert.equal(normalizePublicPhone('+55 11 98888-7777'), '+55 (11) 98888-7777');
  assert.equal(normalizePublicPhone('11 3333-2222'), '(11) 3333-2222');
  assert.equal(normalizePublicPhone('12345'), '');
});

test('normalizePublicPhone accepts Portuguese public numbers', () => {
  assert.equal(normalizePublicPhone('+351 912 345 678', 'PT'), '+351 912 345 678');
  assert.equal(normalizePublicPhone('213 456 789', 'PT'), '213 456 789');
  assert.equal(normalizePublicPhone('12345', 'PT'), '');
});

test('lead search falls back to real OpenStreetMap records without a shared anonymous click limit', async () => {
  const keyNames = [
    'GOOGLE_PLACES_API_KEY_1', 'GOOGLE_PLACES_API_KEY_2', 'GOOGLE_PLACES_API_KEY_3',
    'GOOGLE_PLACES_API_KEY_4', 'GOOGLE_PLACES_API_KEY_5', 'GOOGLE_PLACES_API_KEY',
  ] as const;
  const previous = new Map(keyNames.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  for (const key of keyNames) delete process.env[key];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes('nominatim.openstreetmap.org')) {
      return new Response(JSON.stringify([{
        lat: '-23.5505', lon: '-46.6333', boundingbox: ['-23.8', '-23.3', '-46.9', '-46.3'],
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('overpass')) {
      return new Response(JSON.stringify({ elements: [{
        id: 123,
        type: 'node',
        tags: {
          name: 'Barbearia Pública Teste',
          'addr:street': 'Rua Pública', 'addr:housenumber': '10', 'addr:city': 'São Paulo',
        },
      }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected URL: ${url}`);
  }) as typeof fetch;

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        body: JSON.stringify({ profession: 'Barbearia', city: 'São Paulo', state: 'São Paulo', minReviews: 30 }),
      });
      const response = await searchLeads(request);
      const payload = await response.json() as { mode?: string; leads?: Array<{ source?: string; mapsUrl?: string; phone?: string }> };
      assert.equal(response.status, 200);
      assert.equal(payload.mode, 'openstreetmap');
      assert.equal(payload.leads?.length, 1);
      assert.equal(payload.leads?.[0]?.source, 'openstreetmap');
      assert.equal(payload.leads?.[0]?.phone, '');
      assert.match(payload.leads?.[0]?.mapsUrl ?? '', /^https:\/\/www\.openstreetmap\.org\//);
    }
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keyNames) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

