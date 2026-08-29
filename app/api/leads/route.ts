import type { NextRequest } from 'next/server';

let NextResponse: typeof import('next/server').NextResponse;

try {
  ({ NextResponse } = await import('next/server'));
} catch {
  class FallbackNextResponse {
    static json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
      return {
        status: init.status ?? 200,
        headers: init.headers ?? {},
        json: async () => data,
      };
    }
  }

  NextResponse = FallbackNextResponse as typeof import('next/server').NextResponse;
}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  businessStatus?: string;
};

type GoogleResponse = { places?: GooglePlace[]; nextPageToken?: string };

const ALLOWED_PROFESSIONS = new Set([
  'Barbearia', 'Imobiliária', 'Clínica de estética', 'Odontologia', 'Advocacia', 'Restaurante',
  'Academia', 'Pet shop', 'Salão de beleza', 'Contabilidade', 'Oficina mecânica', 'Fotografia',
]);
const requestWindows = new Map<string, { startedAt: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const MAX_BODY_BYTES = 2_048;
let rotationCursor = 0;

class GoogleCredentialError extends Error {}

export function buildSearchQueries(profession: string, city: string, state: string) {
  const normalizedProfession = profession.trim();
  const normalizedCity = city.trim();
  const normalizedState = state.trim();
  const queries = [
    `${normalizedProfession} em ${normalizedCity}, ${normalizedState}, Brasil`,
    `${normalizedProfession} em ${normalizedCity} ${normalizedState}`,
    `${normalizedProfession} ${normalizedCity} ${normalizedState}`,
    `${normalizedProfession} perto de ${normalizedCity} ${normalizedState}`,
    `${normalizedProfession} ${normalizedCity}`,
  ]
    .map((query) => query.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return [...new Set(queries)];
}

export function filterLeadCandidates(results: GooglePlace[], minReviews: number) {
  const floor = Math.max(15, Math.min(250, Math.round(minReviews * 0.35)));

  return [...results]
    .filter((place) => place.id)
    .filter((place) => place.businessStatus !== 'CLOSED_PERMANENTLY')
    .filter((place) => !place.websiteUri || !place.websiteUri.trim())
    .filter((place) => Boolean(place.nationalPhoneNumber))
    .filter((place) => (place.userRatingCount ?? 0) >= floor || (place.rating ?? 0) >= 4.6)
    .map((place) => ({
      id: place.id as string,
      name: place.displayName?.text ?? 'Empresa sem nome',
      rating: place.rating ?? 0,
      reviewCount: place.userRatingCount ?? 0,
      address: place.formattedAddress ?? '',
      phone: place.nationalPhoneNumber ?? '',
      website: null,
      mapsUrl: place.googleMapsUri ?? '',
      source: 'google' as const,
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);
}

export function buildFallbackLeads(profession: string, city: string, state: string) {
  const baseNames = {
    'Barbearia': ['Barbearia Nova Era', 'Estilo & Corte', 'The Blade Studio', 'Barbearia Atlas', 'Corte & Arte', 'Luxe Barber', 'Barbearia Módulo', 'A Casa do Corte', 'Centro do Barbeiro', 'Prime Blade'],
    'Imobiliária': ['Imóveis Prime', 'Residencial Horizonte', 'Capital Realty', 'Vila Imóveis', 'Urbania Homes', 'Top Imóveis', 'Áurea Realty', 'Nobre Moradia', 'Terra & Vida', 'Metro Plus'],
    'Clínica de estética': ['Glow Clínica', 'Lume Estética', 'Bella Forma', 'Studio Glow', 'Astera Care', 'Novo Rosto', 'Vision Estética', 'Skin Lab', 'Vita Beauty', 'Luna Clinic'],
    'Odontologia': ['Smile Studio', 'Sorriso Mais', 'Dental Prime', 'Clínica Fênix', 'Vitta Odonto', 'Aretê Dental', 'Aura Dental', 'Bela Smile', 'Odonto Vital', 'Smile Art'],
    'Advocacia': ['Advocacia Horizonte', 'Legal & Associados', 'Fórum Direito', 'Nobre Advocacia', 'Direito & Cia', 'Vita Legal', 'Apex Jurídico', 'Sólida Advocacia', 'Praxis Legal', 'Guerra & Silva'],
    'Restaurante': ['Mesa & Brasa', 'Sabor do Centro', 'Bistro do Bairro', 'Ponto Gourmet', 'Casa da Praça', 'Aroma & Co', 'The Table', 'Sabor Local', 'Bistrô Vitta', 'Canto Vivo'],
    'Academia': ['Energia Fit', 'Body One', 'Vita Performance', 'Elite Pulse', 'Gym Forte', 'Nexxus Training', 'Ação Fit', 'Vitalidade Club', 'Impacto Gym', 'Motion Lab'],
    'Pet shop': ['Pet Life', 'Mundo Pet', 'Paw & Co', 'Dog & Cat', 'Happy Pets', 'Pet House', 'Fofura Pet', 'Bichos & Cia', 'Pata e Pêlo', 'Luiz Pet'],
    'Salão de beleza': ['Beauty Lab', 'Studio Beleza', 'Aurea Hair', 'Color & Style', 'Glow Studio', 'Lumin Beauty', 'Arte do Cabelo', 'Bela Forma', 'Vogue Hair', 'Atena Beauty'],
    'Contabilidade': ['Contábil Mais', 'Nexos Contábil', 'Assessoria Central', 'Valore Contábil', 'Apex Contábil', 'Nobre Fiscal', 'Prisma Gestão', 'Top Contabilidade', 'Balance Contábil', 'Ação Assessoria'],
    'Oficina mecânica': ['Auto Center', 'Moto & Cia', 'Mecânica Premium', 'Torque Auto', 'Veloz Oficina', 'Caminho Auto', 'Reset Mecanica', 'Performance Garage', 'Mão na Roda', 'Prime Auto'],
    'Fotografia': ['Luz & Frame', 'Pixel Atelier', 'Mirante Fotografia', 'Estúdio Nobre', 'Cenas & Luz', 'Foco Vivo', 'Brilho Studio', 'Lente Forma', 'Momento Real', 'Auralight'],
  };

  const names = baseNames[profession as keyof typeof baseNames] ?? ['Negócio Local', 'Atelier Local', 'Empresa Vizinhança', 'Foco & Valor', 'Vila Mais', 'Ponto Alto', 'Eixo Business', 'Comunidade Prime', 'Nexo Local', 'Ação Vida'];

  const expanded = [...names];
  for (let index = 0; index < 50; index += 1) {
    const base = names[index % names.length];
    const suffix = index < names.length ? '' : ` ${index + 1}`;
    expanded.push(`${base}${suffix}`);
  }

  return expanded.slice(0, 50).map((name, index) => ({
    id: `fallback-${profession}-${index}-${city}`,
    name,
    rating: Number((4.6 + ((index % 10) * 0.08)).toFixed(1)),
    reviewCount: 90 + index * 18 + (city.length % 10) * 8,
    address: `${name} • ${city}, ${state}`,
    phone: `+55 11 9${String(2000 + index * 97).padStart(5, '0')}-${String(1000 + index * 79).slice(0, 4)}`,
    website: null,
    mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${name} ${city}`)}`,
    source: 'google' as const,
  }));
}

function secureJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function cleanText(value: unknown, max = 120) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
    : '';
}

function getGoogleKeys() {
  const configured = [
    process.env.GOOGLE_PLACES_API_KEY_1,
    process.env.GOOGLE_PLACES_API_KEY_2,
    process.env.GOOGLE_PLACES_API_KEY_3,
    process.env.GOOGLE_PLACES_API_KEY_4,
    process.env.GOOGLE_PLACES_API_KEY_5,
    process.env.GOOGLE_PLACES_API_KEY,
  ].filter((value): value is string => Boolean(value && value.length >= 20));
  return [...new Set(configured)];
}

function isTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) {
    try { allowed.add(new URL(configuredOrigin).origin); } catch { /* Ignore invalid configuration. */ }
  }
  return allowed.has(origin);
}

function isRateLimited(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwarded || request.headers.get('cf-connecting-ip') || 'anonymous';
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

async function fetchPlacesWithKey(apiKey: string, query: string) {
  const places: GooglePlace[] = [];
  let pageToken = '';

  for (let page = 0; page < 3; page += 1) {
    const body: Record<string, unknown> = {
      textQuery: query,
      languageCode: 'pt-BR',
      regionCode: 'BR',
      pageSize: 20,
    };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.businessStatus,nextPageToken',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      if ([401, 403, 429].includes(response.status)) throw new GoogleCredentialError('Chave indisponível.');
      throw new Error('O provedor de dados não respondeu corretamente.');
    }

    const payload = await response.json() as GoogleResponse;
    places.push(...(payload.places ?? []));
    pageToken = payload.nextPageToken ?? '';
    if (!pageToken) break;
  }

  return places;
}

async function fetchPlaces(apiKeys: string[], profession: string, city: string, state: string) {
  const queries = buildSearchQueries(profession, city, state);
  const unique = new Map<string, GooglePlace>();

  for (const query of queries) {
    const start = rotationCursor % apiKeys.length;
    for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
      const index = (start + attempt) % apiKeys.length;
      try {
        const places = await fetchPlacesWithKey(apiKeys[index], query);
        rotationCursor = (index + 1) % apiKeys.length;
        for (const place of places) {
          if (place.id) unique.set(place.id, place);
        }
        break;
      } catch (error) {
        if (!(error instanceof GoogleCredentialError) || attempt === apiKeys.length - 1) throw error;
      }
    }
  }

  return [...unique.values()];
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) return secureJson({ error: 'Origem não autorizada.' }, 403);

    const declaredSize = Number(request.headers.get('content-length') || 0);
    if (declaredSize > MAX_BODY_BYTES) return secureJson({ error: 'Solicitação inválida.' }, 413);

    if (isRateLimited(request)) {
      return secureJson({ error: 'Muitas pesquisas em pouco tempo. Aguarde um minuto e tente novamente.' }, 429);
    }

    const body = await request.json();
    const profession = cleanText(body.profession);
    const city = cleanText(body.city);
    const state = cleanText(body.state, 60);
    const minReviews = Math.max(20, Math.min(500, Number(body.minReviews) || 30));

    if (!ALLOWED_PROFESSIONS.has(profession) || !/^[\p{L} .'-]{2,120}$/u.test(city) || !/^[\p{L} .'-]{2,60}$/u.test(state)) {
      return secureJson({ error: 'Os filtros informados não são válidos.' }, 400);
    }

    const apiKeys = getGoogleKeys();
    if (!apiKeys.length) {
      const leads = buildFallbackLeads(profession, city, state)
        .filter((lead) => lead.reviewCount >= Math.max(20, minReviews * 0.4))
        .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);

      return secureJson({
        leads,
        mode: 'demo',
        notice: `Google Places não configurado. Mostrando oportunidades de demonstração para ${city}/${state}.`,
      });
    }

    const results = await fetchPlaces(apiKeys, profession, city, state);
    const leads = filterLeadCandidates(results, minReviews).map((lead) => ({
      ...lead,
      address: lead.address || `${city}, ${state}`,
    }));

    return secureJson({
      leads,
      mode: 'google',
      notice: leads.length
        ? `${leads.length} empresas reais com telefone e sem site informado no Google, ordenadas por avaliações.`
        : 'Nenhuma empresa real com telefone e sem site atingiu o mínimo de avaliações nesta busca. Tente diminuir o filtro.',
    });
  } catch (error) {
    console.error('Lead search failed:', error instanceof Error ? error.name : 'UnknownError');
    return secureJson({ error: 'A busca real não respondeu. Tente novamente em alguns instantes.' }, 502);
  }
}
