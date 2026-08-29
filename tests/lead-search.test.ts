import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFallbackLeads, buildSearchQueries, filterLeadCandidates } from '../app/api/leads/route.ts';

test('buildSearchQueries creates broader city-specific searches', () => {
  const queries = buildSearchQueries('Barbearia', 'São Paulo', 'São Paulo');

  assert.ok(queries.some((query) => query.includes('Barbearia') && query.includes('São Paulo')));
  assert.ok(queries.length >= 3);
});

test('filterLeadCandidates keeps real businesses with phone and local reputation even if a website is missing or review threshold is relaxed', () => {
  const results = [
    {
      id: '1',
      displayName: { text: 'Barbearia Central' },
      formattedAddress: 'São Paulo, SP',
      rating: 4.8,
      userRatingCount: 42,
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
});

test('buildFallbackLeads returns a usable set of local businesses when Google keys are absent', () => {
  const fallback = buildFallbackLeads('Barbearia', 'São Paulo', 'São Paulo');

  assert.ok(fallback.length >= 3);
  assert.ok(fallback.every((lead) => lead.phone.includes('+55')));
  assert.ok(fallback[0].rating >= 4.6);
});

test('buildFallbackLeads supports a larger opportunity volume for the dashboard', () => {
  const fallback = buildFallbackLeads('Barbearia', 'São Paulo', 'São Paulo');

  assert.ok(fallback.length >= 50);
  assert.ok(fallback.every((lead) => lead.name.length > 0));
});
