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

export type PublicLead = {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string;
  phone: string;
  website: null;
  mapsUrl: string;
  source: 'google';
  verificationLabel: string;
};

const ALLOWED_PROFESSIONS = new Set([
  'Barbearia', 'Imobiliária', 'Clínica de estética', 'Odontologia', 'Advocacia', 'Restaurante',
  'Academia', 'Pet shop', 'Salão de beleza', 'Contabilidade', 'Oficina mecânica', 'Fotografia',
  'Psicologia', 'Consultoria', 'Lavanderia', 'Design de interiores', 'Seguros', 'Hotel',
  'Auto Center', 'Agência de marketing',
]);
const MAX_BODY_BYTES = 2_048;
const MAX_GOOGLE_PAGES = 3;
const MAX_LEADS = 100;
let rotationCursor = 0;

class GoogleCredentialError extends Error {}

export function buildSearchQueries(profession: string, city: string, state: string): string[] {
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

export function normalizePublicPhone(value: string | undefined): string {
  if (!value) return '';

  const firstPhone = value.split(/[;/]/)[0]?.trim() ?? '';
  const hasInternationalPrefix = firstPhone.startsWith('+');
  const digits = firstPhone.replace(/\D/g, '');
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

export function filterLeadCandidates(results: GooglePlace[], minReviews: number): PublicLead[] {
  const floor = Math.max(20, Math.min(500, Math.round(minReviews)));

  return [...results]
    .filter((place) => place.id)
    .filter((place) => place.businessStatus === 'OPERATIONAL')
    .filter((place) => !place.websiteUri?.trim())
    .filter((place) => Boolean(normalizePublicPhone(place.nationalPhoneNumber)))
    .filter((place) => Boolean(place.googleMapsUri?.startsWith('https://')))
    .filter((place) => (place.userRatingCount ?? 0) >= floor)
    .map((place) => ({
      id: place.id as string,
      name: place.displayName?.text?.trim() || 'Empresa sem nome',
      rating: typeof place.rating === 'number' ? place.rating : null,
      reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      address: place.formattedAddress?.trim() ?? '',
      phone: normalizePublicPhone(place.nationalPhoneNumber),
      website: null,
      mapsUrl: place.googleMapsUri ?? '',
      source: 'google' as const,
      verificationLabel: 'Cadastro operacional verificado no Google Maps',
    }))
    .filter((lead) => lead.name !== 'Empresa sem nome')
    .sort((left, right) => (right.reviewCount ?? 0) - (left.reviewCount ?? 0) || (right.rating ?? 0) - (left.rating ?? 0));
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

async function fetchPlacesWithKey(apiKey: string, query: string): Promise<GooglePlace[]> {
  const places: GooglePlace[] = [];
  let pageToken = '';

  for (let page = 0; page < MAX_GOOGLE_PAGES; page += 1) {
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
): Promise<GooglePlace[]> {
  const unique = new Map<string, GooglePlace>();

  for (const query of buildSearchQueries(profession, city, state)) {
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

    if (filterLeadCandidates([...unique.values()], minReviews).length >= MAX_LEADS) break;
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
    const minReviews = Math.max(20, Math.min(500, Number(body?.minReviews) || 30));

    if (!ALLOWED_PROFESSIONS.has(profession) || !/^[\p{L} .'-]{2,120}$/u.test(city) || !/^[\p{L} .'-]{2,60}$/u.test(state)) {
      return secureJson({ error: 'Os filtros informados não são válidos.' }, 400);
    }

    const apiKeys = getGoogleKeys();
    if (!apiKeys.length) {
      return secureJson({
        leads: [],
        mode: 'blocked',
        error: 'Google Maps ainda não está configurado. Adicione GOOGLE_PLACES_API_KEY_1 nas variáveis privadas.',
      }, 503);
    }

    const results = await fetchPlaces(apiKeys, profession, city, state, minReviews);
    const leads = filterLeadCandidates(results, minReviews)
      .slice(0, MAX_LEADS)
      .map((lead) => ({ ...lead, address: lead.address || `${city}, ${state}` }));

    return secureJson({
      leads,
      mode: 'google',
      notice: leads.length
        ? `${leads.length} empresas reais, operacionais, com telefone público e sem site informado no Google Maps.`
        : 'Nenhuma empresa do Google Maps atingiu todos os filtros. Diminua o mínimo de avaliações ou tente outra cidade.',
    });
  } catch (error) {
    console.error('Lead search failed:', error instanceof Error ? error.message : 'UnknownError');
    const isProviderLimit = error instanceof GoogleCredentialError && error.message === 'google_429';
    return secureJson({
      error: isProviderLimit
        ? 'A cota da conta do Google Maps foi recusada. Verifique faturamento e limite da chave na Google Cloud.'
        : 'O Google Maps não respondeu agora. Tente novamente em alguns instantes.',
    }, isProviderLimit ? 503 : 502);
  }
}
