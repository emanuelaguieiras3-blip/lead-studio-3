import { NextRequest, NextResponse } from 'next/server';

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

const requestWindows = new Map<string, { startedAt: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

function text(value: unknown, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
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

async function fetchPlaces(apiKey: string, query: string) {
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
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Google Places error:', response.status, detail.slice(0, 500));
      throw new Error(`Google Places respondeu com status ${response.status}.`);
    }

    const payload = await response.json() as GoogleResponse;
    places.push(...(payload.places ?? []));
    pageToken = payload.nextPageToken ?? '';
    if (!pageToken) break;
  }

  return places;
}

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request)) {
      return NextResponse.json({ error: 'Muitas pesquisas em pouco tempo. Aguarde um minuto e tente novamente.' }, { status: 429 });
    }

    const body = await request.json();
    const profession = text(body.profession);
    const city = text(body.city);
    const state = text(body.state, 60);
    const minReviews = Math.max(0, Math.min(10000, Number(body.minReviews) || 0));

    if (!profession || !city || !state) {
      return NextResponse.json({ error: 'Informe profissão, cidade e estado.' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'A conexão com o Google Places ainda precisa ser ativada pelo proprietário.',
        code: 'GOOGLE_PLACES_NOT_CONFIGURED',
      }, { status: 503 });
    }

    const results = await fetchPlaces(apiKey, `${profession} em ${city}, ${state}, Brasil`);
    const unique = new Map(results.filter((place) => place.id).map((place) => [place.id as string, place]));
    const leads = [...unique.values()]
      .filter((place) => place.businessStatus !== 'CLOSED_PERMANENTLY')
      .filter((place) => !place.websiteUri && (place.userRatingCount ?? 0) >= minReviews)
      .filter((place) => Boolean(place.nationalPhoneNumber))
      .map((place) => ({
        id: place.id as string,
        name: place.displayName?.text ?? 'Empresa sem nome',
        rating: place.rating ?? 0,
        reviewCount: place.userRatingCount ?? 0,
        address: place.formattedAddress ?? `${city}, ${state}`,
        phone: place.nationalPhoneNumber ?? '',
        website: null,
        mapsUrl: place.googleMapsUri ?? '',
        source: 'google' as const,
      }))
      .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);

    return NextResponse.json({
      leads,
      mode: 'google',
      notice: leads.length
        ? `${leads.length} empresas reais com telefone e sem site informado no Google, ordenadas por avaliações.`
        : 'Nenhuma empresa real com telefone e sem site atingiu o mínimo de avaliações nesta busca. Tente diminuir o filtro.',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'A busca real não respondeu. Tente novamente em alguns instantes.' }, { status: 502 });
  }
}
