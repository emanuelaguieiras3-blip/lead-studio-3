import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAgencyClosing, buildGeminiResearchRequest, buildOpenAIResearchRequest, buildOpportunityPrompt, buildProposalText, resolveAgencyChannels, socialHandleFromUrl } from '../app/api/generate/route.ts';

test('buildOpportunityPrompt creates a compact, source-grounded website brief', () => {
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
    {
      instagramUrl: 'https://www.instagram.com/barbeariacentral/',
      facebookUrl: '',
      notes: 'Bio confirmada: cortes masculinos. Paleta preta e cobre autorizada como referência.',
      profileContext: 'Instagram: Barbearia Central — tradição e estilo em São Paulo.',
    },
  );

  assert.ok(prompt.length >= 3_000);
  assert.ok(prompt.length <= 6_500);
  assert.match(prompt, /DADOS VERIFICADOS/);
  assert.match(prompt, /AUDITORIA FACTUAL/i);
  assert.match(prompt, /\+55 \(11\) 99999-0000/);
  assert.match(prompt, /https:\/\/maps\.google\.com\/\?cid=123/);
  assert.match(prompt, /não cri(?:ar|e) WhatsApp/i);
  assert.match(prompt, /\[VALIDAR COM O NEGÓCIO\]/);
  assert.doesNotMatch(prompt, /gatilhos mentais/i);
  assert.match(prompt, /PRINCÍPIOS DE COMUNICAÇÃO/);
  assert.match(prompt, /instagram\.com\/barbeariacentral/);
  assert.match(prompt, /@barbeariacentral/);
  assert.match(prompt, /REDES SOCIAIS OFICIAIS E PUBLICAÇÕES/i);
  assert.match(prompt, /Inclua no site uma área discreta de redes sociais/i);
  assert.match(prompt, /Preserve cada @ e URL sem alterar/i);
  assert.doesNotMatch(prompt, /não criar WhatsApp nem redes sociais/i);
  assert.match(prompt, /Paleta preta e cobre/);
  assert.match(prompt, /tradição e estilo/);
  assert.match(prompt, /VALIDAR DIREITO DE USO/);
  assert.match(prompt, /COREOGRAFIA AETHER-CLASS/i);
  assert.match(prompt, /Hero 100svh/i);
  assert.match(prompt, /cena sticky de 180–240vh/i);
  assert.match(prompt, /IntersectionObserver, requestAnimationFrame/i);
  assert.match(prompt, /Não copie marca, cores, textos, produto/i);
  assert.match(prompt, /não wireframe, plano, relatório ou pseudocódigo/i);
});

test('buildOpportunityPrompt never invents a social profile when no URL is confirmed', () => {
  const prompt = buildOpportunityPrompt(
    { segment: 'Restaurante', city: 'Lisboa', state: 'Lisboa', country: 'PT' },
    {
      id: 'place-without-social', name: 'Comércio sem perfil', address: 'Lisboa', phone: '',
      mapsUrl: 'https://maps.google.com/?cid=without-social', source: 'google', rating: null, reviewCount: null,
    },
    'editorial',
    0,
  );

  assert.match(prompt, /Nenhuma rede social oficial foi confirmada/i);
  assert.match(prompt, /Não crie @, URL, ícone com link/i);
});

test('social profile URLs become handles inside the production prompt', () => {
  assert.equal(socialHandleFromUrl('https://www.instagram.com/comercio.oficial/', 'instagram'), '@comercio.oficial');
  assert.equal(socialHandleFromUrl('https://www.facebook.com/comercio.portugal/', 'facebook'), '@comercio.portugal');
  assert.equal(socialHandleFromUrl('https://www.instagram.com/p/publicacao/', 'instagram'), '');
});

test('Gemini research uses public web tools with medium thinking', () => {
  const request = buildGeminiResearchRequest('Pesquise o perfil público informado.');
  assert.deepEqual(request.tools, [{ url_context: {} }, { google_search: {} }]);
  assert.ok('systemInstruction' in request);
  assert.equal(request.generationConfig.thinkingConfig.thinkingLevel, 'medium');
  assert.equal(request.generationConfig.maxOutputTokens, 1_800);
});

test('GPT-5.4 research uses medium reasoning without storing API responses', () => {
  const request = buildOpenAIResearchRequest('Pesquise o perfil público informado.');
  assert.equal(request.model, 'gpt-5.4');
  assert.deepEqual(request.reasoning, { effort: 'medium' });
  assert.deepEqual(request.tools, [{ type: 'web_search' }]);
  assert.equal(request.text.verbosity, 'low');
  assert.equal(request.store, false);
  assert.equal(request.max_output_tokens, 2_400);
});

test('automatic proposal follows the Portuguese language variant selected by country', () => {
  const lead = {
    id: 'pt-1', name: 'Comércio Lisboa', address: 'Lisboa', phone: '+351 912 345 678',
    mapsUrl: 'https://maps.google.com/?cid=pt-1', source: 'google' as const, rating: 4.7, reviewCount: 80,
  };
  const materials = { instagramUrl: '', facebookUrl: '', notes: '', profileContext: '' };
  const proposal = buildProposalText(
    { segment: 'Restaurante', city: 'Lisboa', state: 'Lisboa', country: 'PT' },
    lead,
    'editorial',
    0,
    materials,
  );
  const prompt = buildOpportunityPrompt(
    { segment: 'Restaurante', city: 'Lisboa', state: 'Lisboa', country: 'PT' },
    lead,
    'editorial',
    0,
    materials,
  );

  assert.match(proposal, /forma simples de contacto/i);
  assert.match(proposal, /versão para telemóvel/i);
  assert.match(proposal, /ajustar o projeto consigo/i);
  assert.doesNotMatch(proposal, /celular|contato/i);
  assert.match(prompt, /português europeu \(pt-PT\)/i);
});

test('official Leads Studios channels are sanitized and injected into commercial CTAs', () => {
  const channels = resolveAgencyChannels({
    INSTAGRAM_HANDLE: '@leadsstudios',
    LINKEDIN_URL: 'https://www.linkedin.com/company/leads-studios/',
    WHATSAPP_OR_PHONE: '+55 (11) 99999-0000',
    WEBSITE_URL: 'https://leads.example.com/',
  });
  const closing = buildAgencyClosing('BR', channels);

  assert.equal(channels.instagram, 'https://www.instagram.com/leadsstudios/');
  assert.equal(channels.whatsapp, 'https://wa.me/5511999990000');
  assert.match(closing, /Site oficial: https:\/\/leads\.example\.com\//);
  assert.match(closing, /WhatsApp: https:\/\/wa\.me\/5511999990000/);
  assert.match(closing, /Instagram: https:\/\/www\.instagram\.com\/leadsstudios\//);
  assert.match(closing, /LinkedIn: https:\/\/www\.linkedin\.com\/company\/leads-studios\//);

  const rejected = resolveAgencyChannels({
    INSTAGRAM_HANDLE: 'https://malicious.example/conta',
    LINKEDIN_URL: 'javascript:alert(1)',
    WHATSAPP_OR_PHONE: 'não configurado',
    WEBSITE_URL: 'http://inseguro.example',
  });
  assert.deepEqual(rejected, { instagram: '', linkedin: '', whatsapp: '', website: '' });
});
