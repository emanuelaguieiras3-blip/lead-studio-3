import { NextRequest, NextResponse } from 'next/server.js';

const MAX_BODY_BYTES = 4_096;
const MAX_HTML_BYTES = 1_000_000;

type Platform = 'instagram' | 'facebook';

function secureJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowedOrigins = new Set([new URL(request.url).origin]);
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) {
    try { allowedOrigins.add(new URL(configuredOrigin).origin); } catch { /* configuração inválida não amplia CORS */ }
  }
  return allowedOrigins.has(origin);
}

function cleanText(value: unknown, max = 2_000): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
    : '';
}

function normalizeProfileUrl(value: unknown, platform: Platform): string {
  const input = cleanText(value, 500);
  if (!input) return '';
  try {
    const url = new URL(input);
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

function normalizeSocialImageUrl(value: unknown): string {
  const input = cleanText(value, 1_200);
  if (!input) return '';
  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    const allowedDomains = ['fbcdn.net', 'cdninstagram.com', 'fbsbx.com', 'instagram.com', 'facebook.com'];
    if (url.protocol !== 'https:' || !allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html: string, keys: string[]): string {
  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapedKey}["'][^>]*>`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern)?.[1];
      if (match) return cleanText(decodeEntities(match), 1_200);
    }
  }
  return '';
}

async function inspectProfile(platform: Platform, url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadStudio/1.2; +https://leads-orpin-three.vercel.app)',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (!response.ok || declaredSize > MAX_HTML_BYTES) throw new Error('unavailable');
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const title = metaContent(html, ['og:title', 'twitter:title']);
    const description = metaContent(html, ['og:description', 'description', 'twitter:description']);
    const imageUrl = normalizeSocialImageUrl(metaContent(html, ['og:image', 'twitter:image']));
    if (!title && !description) throw new Error('blocked');
    return { platform, url, title, description, imageUrl, status: 'public' as const };
  } catch {
    return {
      platform,
      url,
      title: '',
      description: '',
      imageUrl: '',
      status: 'restricted' as const,
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!isTrustedOrigin(request)) return secureJson({ error: 'Origem não autorizada.' }, 403);
    const declaredSize = Number(request.headers.get('content-length') || 0);
    if (declaredSize > MAX_BODY_BYTES) return secureJson({ error: 'Solicitação inválida.' }, 413);
    const body = await request.json() as Record<string, unknown> | null;
    const instagramUrl = normalizeProfileUrl(body?.instagramUrl, 'instagram');
    const facebookUrl = normalizeProfileUrl(body?.facebookUrl, 'facebook');
    if (!instagramUrl && !facebookUrl) return secureJson({ error: 'Informe ao menos um perfil válido.' }, 400);

    const profiles = await Promise.all([
      instagramUrl ? inspectProfile('instagram', instagramUrl) : null,
      facebookUrl ? inspectProfile('facebook', facebookUrl) : null,
    ]);
    const availableProfiles = profiles.filter((profile) => profile !== null);
    const publicCount = availableProfiles.filter((profile) => profile.status === 'public').length;
    return secureJson({
      profiles: availableProfiles,
      notice: publicCount
        ? `${publicCount} perfil(is) com metadados públicos analisados.`
        : 'As redes limitaram a leitura automática. Cole a bio e os materiais autorizados no campo abaixo.',
    });
  } catch {
    return secureJson({ error: 'Não foi possível analisar os perfis agora.' }, 500);
  }
}
