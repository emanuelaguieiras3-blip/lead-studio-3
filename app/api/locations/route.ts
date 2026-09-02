import { NextRequest, NextResponse } from 'next/server.js';

export const revalidate = 86_400;

const PORTUGAL_SOURCE = 'https://raw.githubusercontent.com/iotechpis/geoapi.pt/main/res/details-parishes-municipalities/detalhesMunicipiosB.json';
const REGION_NAMES = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria',
  'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu',
  'Região Autónoma dos Açores', 'Região Autónoma da Madeira',
] as const;
const VALID_REGIONS = new Set<string>(REGION_NAMES);

type MunicipalityRecord = { Distrito?: unknown; 'MUNICÍPIO'?: unknown };
type PortugalDataset = { municipios?: MunicipalityRecord[] };

function secureJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': status === 200 ? 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function normalizeRegion(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLocaleUpperCase('pt-PT');
  if (normalized === 'R. A. AÇORES') return 'Região Autónoma dos Açores';
  if (normalized === 'R. A. MADEIRA') return 'Região Autónoma da Madeira';
  const district = normalized.replace(/^DISTRITO\s+/, '');
  return REGION_NAMES.find((region) => region.toLocaleUpperCase('pt-PT') === district) ?? '';
}

function titleCaseMunicipality(value: unknown): string {
  if (typeof value !== 'string') return '';
  const lowercaseWords = new Set(['DA', 'DAS', 'DE', 'DO', 'DOS', 'E']);
  return value.trim().split(/\s+/).map((word, index) => {
    if (index > 0 && lowercaseWords.has(word)) return word.toLocaleLowerCase('pt-PT');
    return word.charAt(0).toLocaleUpperCase('pt-PT') + word.slice(1).toLocaleLowerCase('pt-PT');
  }).join(' ');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const region = request.nextUrl.searchParams.get('region')?.trim() ?? '';
  if (!VALID_REGIONS.has(region)) return secureJson({ error: 'Distrito ou região inválido.' }, 400);

  try {
    const response = await fetch(PORTUGAL_SOURCE, {
      headers: { Accept: 'application/json', 'User-Agent': 'LeadStudio/1.2' },
      next: { revalidate: 604_800 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`portugal_locations_${response.status}`);
    const data = await response.json() as PortugalDataset;
    const municipalities = (data.municipios ?? [])
      .filter((item) => normalizeRegion(item.Distrito) === region)
      .map((item) => titleCaseMunicipality(item['MUNICÍPIO']))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, 'pt-PT'));

    if (!municipalities.length) throw new Error('portugal_locations_empty');
    return secureJson({ country: 'PT', region, municipalities: [...new Set(municipalities)], source: 'Dados.gov.pt / DGAL' });
  } catch (error) {
    console.error('Portugal locations unavailable:', error instanceof Error ? error.message : 'UnknownError');
    return secureJson({ error: 'Não foi possível carregar os municípios portugueses agora. Tente novamente.' }, 502);
  }
}
