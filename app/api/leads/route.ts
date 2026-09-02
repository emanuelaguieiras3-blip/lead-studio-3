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

type GoogleResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
};

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
  extratags?: Record<string, string>;
};

export type PublicLead = {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string;
  phone: string;
  website: null;
  mapsUrl: string;
  source: 'google' | 'openstreetmap';
  verificationLabel: string;
  socialProfiles: { instagram: string; facebook: string };
};

export type CountryCode = 'BR' | 'PT';

const COUNTRY_CONFIG: Record<CountryCode, { name: string; languageCode: string; nominatimCode: string }> = {
  BR: { name: 'Brasil', languageCode: 'pt-BR', nominatimCode: 'br' },
  PT: { name: 'Portugal', languageCode: 'pt-PT', nominatimCode: 'pt' },
};

const ALLOWED_PROFESSIONS = new Set([
  'Barbearia', 'Imobiliária', 'Clínica de estética', 'Odontologia', 'Advocacia', 'Restaurante',
  'Academia', 'Pet shop', 'Salão de beleza', 'Contabilidade', 'Oficina mecânica', 'Fotografia',
  'Psicologia', 'Consultoria', 'Lavanderia', 'Design de interiores', 'Seguros', 'Hotel',
  'Auto Center', 'Agência de marketing', 'Todos os comércios',
]);
const MAX_BODY_BYTES = 2_048;
const MAX_GOOGLE_PAGES = 3;
const MAX_LEADS = 100;
let rotationCursor = 0;

class GoogleCredentialError extends Error {}

export function buildSearchQueries(profession: string, city: string, state: string, country: CountryCode = 'BR'): string[] {
  const normalizedProfession = profession.trim() === 'Todos os comércios' ? 'comércios e serviços' : profession.trim();
  const normalizedCity = city.trim();
  const normalizedState = state.trim();
  const countryName = COUNTRY_CONFIG[country].name;
  const queries = [
    `${normalizedProfession} em ${normalizedCity}, ${normalizedState}, ${countryName}`,
    `${normalizedProfession} em ${normalizedCity} ${normalizedState}`,
    `${normalizedProfession} ${normalizedCity} ${normalizedState}`,
    `${normalizedProfession} perto de ${normalizedCity} ${normalizedState}`,
    `${normalizedProfession} ${normalizedCity}`,
  ]
    .map((query) => query.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return [...new Set(queries)];
}

export function normalizePublicPhone(value: string | undefined, country: CountryCode = 'BR'): string {
  if (!value) return '';

  const firstPhone = value.split(/[;/]/)[0]?.trim() ?? '';
  const hasInternationalPrefix = firstPhone.startsWith('+');
  const digits = firstPhone.replace(/\D/g, '');
  if (country === 'PT') {
    const portugueseDigits = digits.startsWith('351') && digits.length === 12 ? digits.slice(3) : digits;
    if (!/^[2-9]\d{8}$/.test(portugueseDigits)) return '';
    const countryPrefix = hasInternationalPrefix || digits.startsWith('351') ? '+351 ' : '';
    return `${countryPrefix}${portugueseDigits.slice(0, 3)} ${portugueseDigits.slice(3, 6)} ${portugueseDigits.slice(6)}`;
  }

  const brazilianDigits = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;

  if (!/^\d{10,11}$/.test(brazilianDigits)) return '';

  const areaCode = brazilianDigits.slice(0, 2);
  const localNumber = brazilianDigits.slice(2);
  const formattedLocal = localNumber.length === 9
    ? `${localNumber.slice(0, 5)}-${localNumber.slice(5)}`
    : `${localNumber.slice(0, 4)}-${localNumber.slice(4)}`;
  const countryPrefix = hasInternationalPrefix || digits.startsWith('55') ? '+55 ' : '';
  return `${countryPrefix}(${areaCode}) ${formattedLocal}`;
}

export function filterLeadCandidates(results: GooglePlace[], minReviews: number, country: CountryCode = 'BR'): PublicLead[] {
  const floor = Math.max(20, Math.min(500, Math.round(minReviews)));

  return [...results]
    .filter((place) => place.id)
    .filter((place) => place.businessStatus === 'OPERATIONAL')
    .filter((place) => !place.websiteUri?.trim())
    .filter((place) => Boolean(normalizePublicPhone(place.nationalPhoneNumber, country)))
    .filter((place) => Boolean(place.googleMapsUri?.startsWith('https://')))
    .filter((place) => (place.userRatingCount ?? 0) >= floor)
    .map((place) => ({
      id: place.id as string,
      name: place.displayName?.text?.trim() || 'Empresa sem nome',
      rating: typeof place.rating === 'number' ? place.rating : null,
      reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      address: place.formattedAddress?.trim() ?? '',
      phone: normalizePublicPhone(place.nationalPhoneNumber, country),
      website: null,
      mapsUrl: place.googleMapsUri ?? '',
      source: 'google' as const,
      verificationLabel: 'Cadastro operacional verificado no Google Maps',
      socialProfiles: { instagram: '', facebook: '' },
    }))
    .filter((lead) => lead.name !== 'Empresa sem nome')
    .sort((left, right) => (right.reviewCount ?? 0) - (left.reviewCount ?? 0) || (right.rating ?? 0) - (left.rating ?? 0));
}

const OSM_FILTERS: Record<string, string[]> = {
  'Barbearia': ['["shop"="hairdresser"]["hairdresser"="barber"]', '["shop"="hairdresser"]'],
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
  'Todos os comércios': ['["shop"]', '["office"]', '["amenity"~"restaurant|cafe|bar|pharmacy|clinic|dentist|bank"]'],
};

const OSM_HEADERS = {
  'User-Agent': 'LeadStudio/1.1 (https://lead-studio-br.leonardo-r-manzo.chatgpt.site)',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

function osmPhone(tags: Record<string, string>, country: CountryCode): string {
  return normalizePublicPhone(tags.phone || tags['contact:phone'] || tags.mobile || tags['contact:mobile'], country);
}

function osmAddress(tags: Record<string, string>, city: string, state: string): string {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
  const district = tags['addr:suburb'] || tags['addr:district'];
  return [street, district, tags['addr:city'] || city, state].filter(Boolean).join(' · ');
}

function osmSocialProfile(tags: Record<string, string>, platform: 'instagram' | 'facebook'): string {
  const raw = (tags[`contact:${platform}`] || tags[platform] || '').trim();
  if (!raw) return '';
  const host = platform === 'instagram' ? 'www.instagram.com' : 'www.facebook.com';
  const candidate = /^https:\/\//i.test(raw)
    ? raw
    : `https://${host}/${raw.replace(/^@/, '').replace(/^\/+|\/+$/g, '')}`;
  try {
    const url = new URL(candidate);
    const allowedHosts = platform === 'instagram'
      ? new Set(['instagram.com', 'www.instagram.com'])
      : new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com']);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) return '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

async function fetchNominatimBusinesses(
  profession: string,
  city: string,
  state: string,
  location: NominatimResult,
  country: CountryCode,
): Promise<PublicLead[]> {
  const terms: Record<string, string> = {
    'Clínica de estética': 'estética', 'Salão de beleza': 'salão de beleza', 'Oficina mecânica': 'oficina mecânica',
    'Design de interiores': 'design de interiores', 'Agência de marketing': 'agência de marketing', 'Auto Center': 'auto center',
  };
  const params: Record<string, string> = {
    q: `${terms[profession] || profession}, ${city}, ${state}, ${COUNTRY_CONFIG[country].name}`,
    format: 'jsonv2', countrycodes: COUNTRY_CONFIG[country].nominatimCode, addressdetails: '1', extratags: '1', namedetails: '1', limit: '50',
  };
  if (location.boundingbox) {
    const [south, north, west, east] = location.boundingbox;
    params.viewbox = `${west},${north},${east},${south}`;
    params.bounded = '1';
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`, {
    headers: OSM_HEADERS,
    signal: AbortSignal.timeout(12_000),
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
      phone: normalizePublicPhone(item.extratags?.phone || item.extratags?.['contact:phone'], country),
      website: null,
      mapsUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
      source: 'openstreetmap' as const,
      verificationLabel: 'Cadastro público verificado no OpenStreetMap',
      socialProfiles: {
        instagram: osmSocialProfile(item.extratags ?? {}, 'instagram'),
        facebook: osmSocialProfile(item.extratags ?? {}, 'facebook'),
      },
    }));
}

async function fetchOpenStreetMap(profession: string, city: string, state: string, country: CountryCode): Promise<PublicLead[]> {
  const locationResponse = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: `${city}, ${state}, ${COUNTRY_CONFIG[country].name}`, format: 'jsonv2', countrycodes: COUNTRY_CONFIG[country].nominatimCode, limit: '1',
  })}`, {
    headers: OSM_HEADERS,
    signal: AbortSignal.timeout(12_000),
  });
  if (!locationResponse.ok) throw new Error('osm_location_failed');
  const [location] = await locationResponse.json() as NominatimResult[];
  if (!location?.lat || !location.lon) return [];

  const radius = ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Lisboa', 'Porto'].includes(city)
    ? 15_000
    : 10_000;
  const searchArea = `around:${radius},${location.lat},${location.lon}`;
  const filters = OSM_FILTERS[profession] ?? [];
  const query = `[out:json][timeout:12];(${filters.map((filter) => `nwr${filter}["name"](${searchArea});`).join('')});out tags center 160;`;
  const endpoints = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter'];
  let elements: OsmElement[] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...OSM_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) continue;
      const payload = await response.json() as { elements?: OsmElement[] };
      elements = payload.elements ?? [];
      break;
    } catch {
      // Tenta o próximo endpoint público do Overpass.
    }
  }

  if (!elements.length) return fetchNominatimBusinesses(profession, city, state, location, country);

  const leads = elements
    .filter((element) => element.tags?.name)
    .filter((element) => profession !== 'Barbearia' || /barbear|barber/i.test(element.tags?.name ?? ''))
    .filter((element) => {
      const tags = element.tags ?? {};
      return !tags.website && !tags['contact:website'] && !tags.url && tags.disused !== 'yes';
    })
    .map((element): PublicLead => {
      const tags = element.tags ?? {};
      return {
        id: `osm-${element.type}-${element.id}`,
        name: tags.name,
        rating: null,
        reviewCount: null,
        address: osmAddress(tags, city, state),
        phone: osmPhone(tags, country),
        website: null,
        mapsUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        source: 'openstreetmap',
        verificationLabel: 'Cadastro público verificado no OpenStreetMap',
        socialProfiles: {
          instagram: osmSocialProfile(tags, 'instagram'),
          facebook: osmSocialProfile(tags, 'facebook'),
        },
      };
    });

  return [...new Map(leads.map((lead) => [lead.id, lead])).values()]
    .sort((left, right) => Number(Boolean(right.phone)) - Number(Boolean(left.phone))
      || left.name.localeCompare(right.name, 'pt-BR'))
    .slice(0, MAX_LEADS);
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

function cleanText(value: unknown, max = 120): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
    : '';
}

function getGoogleKeys(): string[] {
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

function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) {
    try {
      allowed.add(new URL(configuredOrigin).origin);
    } catch {
      // Uma configuração inválida não deve ampliar as origens aceitas.
    }
  }
  return allowed.has(origin);
}

async function fetchPlacesWithKey(apiKey: string, query: string, country: CountryCode): Promise<GooglePlace[]> {
  const places: GooglePlace[] = [];
  let pageToken = '';

  for (let page = 0; page < MAX_GOOGLE_PAGES; page += 1) {
    const body: Record<string, unknown> = {
      textQuery: query,
      languageCode: COUNTRY_CONFIG[country].languageCode,
      regionCode: country,
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
      if ([401, 403, 429].includes(response.status)) throw new GoogleCredentialError(`google_${response.status}`);
      throw new Error(`google_${response.status}`);
    }

    const payload = await response.json() as GoogleResponse;
    places.push(...(payload.places ?? []));
    pageToken = payload.nextPageToken ?? '';
    if (!pageToken) break;
  }

  return places;
}

async function fetchPlaces(
  apiKeys: string[],
  profession: string,
  city: string,
  state: string,
  minReviews: number,
  country: CountryCode,
): Promise<GooglePlace[]> {
  const unique = new Map<string, GooglePlace>();

  for (const query of buildSearchQueries(profession, city, state, country)) {
    const start = rotationCursor % apiKeys.length;
    for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
      const index = (start + attempt) % apiKeys.length;
      try {
        const places = await fetchPlacesWithKey(apiKeys[index], query, country);
        rotationCursor = (index + 1) % apiKeys.length;
        for (const place of places) {
          if (place.id) unique.set(place.id, place);
        }
        break;
      } catch (error) {
        if (!(error instanceof GoogleCredentialError) || attempt === apiKeys.length - 1) throw error;
      }
    }

    if (filterLeadCandidates([...unique.values()], minReviews, country).length >= MAX_LEADS) break;
  }

  return [...unique.values()];
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) return secureJson({ error: 'Origem não autorizada.' }, 403);

    const declaredSize = Number(request.headers.get('content-length') || 0);
    if (declaredSize > MAX_BODY_BYTES) return secureJson({ error: 'Solicitação inválida.' }, 413);

    const body = (await request.json()) as Record<string, unknown> | null;
    const profession = cleanText(body?.profession);
    const city = cleanText(body?.city);
    const state = cleanText(body?.state, 60);
    const country = (cleanText(body?.country, 2).toUpperCase() || 'BR') as CountryCode;
    const minReviews = Math.max(20, Math.min(500, Number(body?.minReviews) || 30));

    if (!COUNTRY_CONFIG[country] || !ALLOWED_PROFESSIONS.has(profession) || !/^[\p{L} .'-]{2,120}$/u.test(city) || !/^[\p{L} .'-]{2,60}$/u.test(state)) {
      return secureJson({ error: 'Os filtros informados não são válidos.' }, 400);
    }

    const apiKeys = getGoogleKeys();
    if (apiKeys.length) {
      try {
        const results = await fetchPlaces(apiKeys, profession, city, state, minReviews, country);
        const googleLeads = filterLeadCandidates(results, minReviews, country)
          .slice(0, MAX_LEADS)
          .map((lead) => ({ ...lead, address: lead.address || `${city}, ${state}` }));
        if (googleLeads.length) {
          return secureJson({
            leads: googleLeads,
            mode: 'google',
            notice: `${googleLeads.length} empresas reais, operacionais, com telefone público e sem site informado no Google Maps.`,
          });
        }
      } catch (error) {
        console.error('Google Places unavailable, using OpenStreetMap:', error instanceof Error ? error.message : 'UnknownError');
      }
    }

    const streetLeads = await fetchOpenStreetMap(profession, city, state, country);
    return secureJson({
      leads: streetLeads,
      mode: 'openstreetmap',
      notice: streetLeads.length
        ? `${streetLeads.length} comércios reais sem site informado no OpenStreetMap. Telefones são exibidos quando constam na fonte.`
        : `Nenhum cadastro com telefone público e sem site informado foi encontrado para ${profession} em ${city}. Tente outra profissão ou cidade.`,
    });
  } catch (error) {
    console.error('Lead search failed:', error instanceof Error ? error.message : 'UnknownError');
    return secureJson({ error: 'As fontes públicas não responderam agora. Tente novamente em alguns instantes.' }, 502);
  }
}
