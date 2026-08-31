import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSearchQueries, filterLeadCandidates, normalizePublicPhone } from '../app/api/leads/route.ts';

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

