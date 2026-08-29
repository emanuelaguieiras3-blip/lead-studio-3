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
};

const DEMO_NAMES: Record<string, string[]> = {
  barbearia: ['Barbearia Imperial', 'Corte Nobre', 'Estação do Barbeiro', 'Barba & Brasa', 'Oficina do Corte', 'Clube 27'],
  imobiliaria: ['Morada Prime Imóveis', 'Horizonte Imobiliária', 'Viva Lar Negócios', 'Chave Certa Imóveis', 'Ponto Alto Imobiliária', 'Casa Nova Consultoria'],
  estetica: ['Studio Lumi', 'Essenza Estética', 'Aura Clínica', 'Pele & Arte', 'Maison Belle', 'Vitta Estética'],
  odontologia: ['Sorriso Prime', 'Odonto Vitta', 'Clínica Oralis', 'Sorriso Leve', 'Dental Care', 'Odonto Essencial'],
};

function text(value: unknown, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function demoLeads(profession: string, city: string, state: string, minReviews: number) {
  const key = Object.keys(DEMO_NAMES).find((item) => profession.toLowerCase().includes(item));
  const names = key ? DEMO_NAMES[key] : [
    `${profession} Referência`, `${profession} Central`, `Espaço ${profession}`, `${profession} Prime`, `Studio ${profession}`, `${profession} & Co.`,
  ];
  const base = Math.max(minReviews, 80);
  return names.map((name, index) => ({
    id: `demo-${index + 1}`,
    name,
    rating: Number(Math.max(4.3, 4.9 - index * 0.1).toFixed(1)),
    reviewCount: base + [684, 447, 298, 176, 94, 37][index],
    address: `${city}, ${state}`,
    phone: '',
    website: null,
    mapsUrl: '',
    source: 'demo' as const,
  })).sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);
}

export async function POST(request: NextRequest) {
  try {
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
        leads: demoLeads(profession, city, state, minReviews),
        mode: 'demo',
        notice: 'Dados de exemplo. Adicione GOOGLE_PLACES_API_KEY para pesquisar empresas reais.',
      });
    }

    const googleResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: `${profession} em ${city}, ${state}, Brasil`,
        languageCode: 'pt-BR',
        regionCode: 'BR',
        pageSize: 20,
      }),
    });

    if (!googleResponse.ok) {
      const detail = await googleResponse.text();
      console.error('Google Places error:', googleResponse.status, detail.slice(0, 500));
      return NextResponse.json({
        leads: demoLeads(profession, city, state, minReviews),
        mode: 'demo',
        notice: 'A busca real não respondeu. Exibindo dados de exemplo.',
      });
    }

    const payload = await googleResponse.json() as { places?: GooglePlace[] };
    const leads = (payload.places ?? [])
      .filter((place) => !place.websiteUri && (place.userRatingCount ?? 0) >= minReviews)
      .map((place) => ({
        id: place.id ?? crypto.randomUUID(),
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
      notice: leads.length ? 'Resultados reais: sem site informado no Google e ordenados por avaliações.' : 'Nenhuma empresa sem site atingiu o mínimo de avaliações nesta busca.',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Não foi possível concluir a pesquisa.' }, { status: 500 });
  }
}
