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

  NextResponse = FallbackNextResponse as unknown as typeof import('next/server').NextResponse;
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

type OsmElement = {
  id: number;
  type: 'node' | 'way' | 'relation';
  tags?: Record<string, string>;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  boundingbox?: [string, string, string, string];
  osm_type?: 'node' | 'way' | 'relation';
  osm_id?: number;
  name?: string;
  display_name?: string;
  type?: string;
  category?: string;
  extratags?: Record<string, string>;
};

const ALLOWED_PROFESSIONS = new Set([
  'Barbearia', 'Imobiliária', 'Clínica de estética', 'Odontologia', 'Advocacia', 'Restaurante',
  'Academia', 'Pet shop', 'Salão de beleza', 'Contabilidade', 'Oficina mecânica', 'Fotografia',
  'Psicologia', 'Consultoria', 'Lavanderia', 'Design de interiores', 'Seguros', 'Hotel',
  'Auto Center', 'Agência de marketing',
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

const OSM_FILTERS: Record<string, string[]> = {
  'Barbearia': ['["shop"="hairdresser"]["hairdresser"="barber"]'],
  'Imobiliária': ['["office"="estate_agent"]'],
  'Clínica de estética': ['["shop"="beauty"]', '["healthcare"="clinic"]["healthcare:speciality"="aesthetic"]'],
  'Odontologia': ['["amenity"="dentist"]'],
  'Advocacia': ['["office"="lawyer"]'],
  'Restaurante': ['["amenity"="restaurant"]'],
  'Academia': ['["leisure"="fitness_centre"]'],
  'Pet shop': ['["shop"="pet"]'],
  'Salão de beleza': ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  'Contabilidade': ['["office"="accountant"]'],
  'Oficina mecânica': ['["shop"="car_repair"]'],
  'Fotografia': ['["shop"="photo"]', '["craft"="photographer"]'],
  'Psicologia': ['["healthcare"="psychotherapist"]', '["office"="therapist"]'],
  'Consultoria': ['["office"="consulting"]'],
  'Lavanderia': ['["shop"="laundry"]'],
  'Design de interiores': ['["office"="interior_design"]'],
  'Seguros': ['["office"="insurance"]'],
  'Hotel': ['["tourism"="hotel"]'],
  'Auto Center': ['["shop"="car_repair"]', '["shop"="tyres"]'],
  'Agência de marketing': ['["office"="advertising_agency"]'],
};

function osmPhone(tags: Record<string, string>) {
  return tags.phone || tags['contact:phone'] || tags.mobile || tags['contact:mobile'] || '';
}

function osmAddress(tags: Record<string, string>, city: string, state: string) {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
  const district = tags['addr:suburb'] || tags['addr:district'];
  return [street, district, tags['addr:city'] || city, state].filter(Boolean).join(' · ');
}

async function fetchNominatimBusinesses(profession: string, city: string, state: string, location: NominatimResult) {
  const terms: Record<string, string> = {
    'Clínica de estética': 'estética', 'Salão de beleza': 'salão de beleza', 'Oficina mecânica': 'oficina mecânica',
    'Design de interiores': 'design de interiores', 'Agência de marketing': 'agência de marketing', 'Auto Center': 'auto center',
  };
  const params: Record<string, string> = {
    q: `${terms[profession] || profession}, ${city}, ${state}, Brasil`, format: 'jsonv2', countrycodes: 'br',
    addressdetails: '1', extratags: '1', limit: '40',
  };
  if (location.boundingbox) {
    const [south, north, west, east] = location.boundingbox;
    params.viewbox = `${west},${north},${east},${south}`;
    params.bounded = '1';
  }
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`, {
    headers: { 'User-Agent': 'LeadStudio/1.0 (business-discovery)' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return [];
  const results = await response.json() as NominatimResult[];
  const ignoredTypes = new Set(['footway', 'road', 'residential', 'administrative', 'city', 'town', 'village']);
  return results
    .filter((item) => item.osm_type && item.osm_id && item.name && !ignoredTypes.has(item.type || ''))
    .filter((item) => !item.extratags?.website && !item.extratags?.['contact:website'])
    .map((item) => ({
      id: `osm-${item.osm_type}-${item.osm_id}`,
      name: item.name as string,
      rating: null,
      reviewCount: null,
      address: item.display_name || `${city} · ${state}`,
      phone: item.extratags?.phone || item.extratags?.['contact:phone'] || '',
      website: null,
      mapsUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
      source: 'openstreetmap' as const,
    }));
}

async function fetchOpenStreetMap(profession: string, city: string, state: string) {
  const locationResponse = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: `${city}, ${state}, Brasil`, format: 'jsonv2', countrycodes: 'br', limit: '1',
  })}`, {
    headers: { 'User-Agent': 'LeadStudio/1.0 (business-discovery)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!locationResponse.ok) throw new Error('Não foi possível localizar a cidade.');
  const [location] = await locationResponse.json() as NominatimResult[];
  if (!location?.lat || !location.lon) return [];

  const radius = profession === 'Barbearia' || profession === 'Salão de beleza' ? 3000 : 6000;
  const searchArea = `around:${radius},${location.lat},${location.lon}`;
  const filters = OSM_FILTERS[profession] ?? [];
  const query = `[out:json][timeout:6];(${filters.map((filter) => `node${filter}["name"](${searchArea});`).join('')});out tags 100;`;
  const endpoints = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter'];
  let elements: OsmElement[] = [];
  let providerResponded = false;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'LeadStudio/1.0 (business-discovery)' },
        signal: AbortSignal.timeout(7_000),
      });
      if (!response.ok) continue;
      const payload = await response.json() as { elements?: OsmElement[] };
      elements = payload.elements ?? [];
      providerResponded = true;
      break;
    } catch { /* Try the next public Overpass endpoint. */ }
  }
  if (!providerResponded) return fetchNominatimBusinesses(profession, city, state, location);

  return elements
    .filter((element) => element.tags?.name)
    .filter((element) => profession !== 'Barbearia' || /barbear|barber/i.test(element.tags?.name ?? ''))
    .filter((element) => {
      const tags = element.tags ?? {};
      return !tags.website && !tags['contact:website'] && !tags.url && tags.disused !== 'yes';
    })
    .map((element) => {
      const tags = element.tags ?? {};
      const phone = osmPhone(tags);
      return {
        id: `osm-${element.type}-${element.id}`,
        name: tags.name,
        rating: null,
        reviewCount: null,
        address: osmAddress(tags, city, state),
        phone,
        website: null,
        mapsUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        source: 'openstreetmap' as const,
      };
    })
    .sort((a, b) => Number(Boolean(b.phone)) - Number(Boolean(a.phone)) || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 50);
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

    const body = (await request.json()) as Record<string, unknown> | null;
    const profession = cleanText(body?.profession);
    const city = cleanText(body?.city);
    const state = cleanText(body?.state, 60);
    const minReviews = Math.max(20, Math.min(500, Number(body?.minReviews) || 30));

    if (!ALLOWED_PROFESSIONS.has(profession) || !/^[\p{L} .'-]{2,120}$/u.test(city) || !/^[\p{L} .'-]{2,60}$/u.test(state)) {
      return secureJson({ error: 'Os filtros informados não são válidos.' }, 400);
    }

    const apiKeys = getGoogleKeys();
    if (!apiKeys.length) {
      const leads = await fetchOpenStreetMap(profession, city, state);

      return secureJson({
        leads,
        mode: 'openstreetmap',
        notice: leads.length
          ? `${leads.length} negócios reais do OpenStreetMap sem site informado na fonte. Contatos informados aparecem primeiro.`
          : `Nenhum negócio sem site informado foi encontrado em ${city}/${state} nessa fonte pública.`,
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
