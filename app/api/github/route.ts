import { NextRequest, NextResponse } from 'next/server';

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  archived: boolean;
  disabled: boolean;
};

type GitHubErrorResponse = {
  message?: string;
  documentation_url?: string;
};

const requestWindows = new Map<string, { startedAt: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_BODY_BYTES = 1_024;

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

export async function POST(request: NextRequest) {
  try {
    const declaredSize = Number(request.headers.get('content-length') || 0);
    if (declaredSize > MAX_BODY_BYTES) {
      return secureJson({ error: 'Solicitação inválida.' }, 413);
    }

    if (isRateLimited(request)) {
      return secureJson({ error: 'Muitas consultas em pouco tempo. Aguarde um minuto.' }, 429);
    }

    const body = (await request.json()) as Record<string, unknown> | null;
    const username = cleanText(body?.username, 80);
    const repoName = cleanText(body?.repo, 200);

    if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
      return secureJson({ error: 'Username inválido.' }, 400);
    }

    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'LeadStudio/1.0',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Se um repo específico foi informado, busca detalhes dele
    if (repoName && /^[a-zA-Z0-9._-]{1,200}$/.test(repoName)) {
      const response = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as GitHubErrorResponse;
        return secureJson({
          error: errorData.message || 'Repositório não encontrado.',
        }, response.status === 404 ? 404 : 502);
      }

      const repo = (await response.json()) as GitHubRepo;
      return secureJson({
        repo: {
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          homepage: repo.homepage,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          issues: repo.open_issues_count,
          topics: repo.topics ?? [],
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          archived: repo.archived,
        },
        mode: 'detail',
      });
    }

    // Listar repositórios públicos do usuário
    const sort = cleanText(body?.sort, 20) || 'updated';
    const validSorts = new Set(['created', 'updated', 'pushed', 'full_name', 'stars']);
    const sortParam = validSorts.has(sort) ? sort : 'updated';
    const perPage = Math.max(1, Math.min(30, Number(body?.perPage) || 10));

    const url = `https://api.github.com/users/${username}/repos?sort=${sortParam}&per_page=${perPage}&type=public`;
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as GitHubErrorResponse;
      if (response.status === 404) {
        return secureJson({ error: `Usuário "${username}" não encontrado no GitHub.` }, 404);
      }
      if (response.status === 403) {
        return secureJson({ error: 'Rate limit do GitHub atingido. Tente novamente em breve.' }, 429);
      }
      return secureJson({ error: errorData.message || 'Erro ao consultar o GitHub.' }, 502);
    }

    const repos = (await response.json()) as GitHubRepo[];
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');

    return secureJson({
      repos: repos
        .filter((repo) => !repo.archived && !repo.disabled)
        .map((repo) => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          homepage: repo.homepage,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          topics: repo.topics ?? [],
          updatedAt: repo.updated_at,
        })),
      total: repos.length,
      mode: 'list',
      authenticated: Boolean(token),
      rateLimitRemaining: rateLimitRemaining ? Number(rateLimitRemaining) : null,
    });
  } catch (error) {
    console.error('GitHub API failed:', error instanceof Error ? error.name : 'UnknownError');
    return secureJson({ error: 'Não foi possível consultar o GitHub. Tente novamente.' }, 502);
  }
}
