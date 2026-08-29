# Lead Studio — Contexto para Gemini

## Objetivo
Aplicação Next.js para buscar leads locais (empresas reais sem site informado no Google ou OpenStreetMap) e gerar prompts premium com gatilhos mentais éticos para criação de landing pages.

## Stack
- **Framework:** Next.js 16 com App Router
- **UI:** React 19
- **Linguagem:** TypeScript (strict)
- **Estilo:** Tailwind CSS 4
- **Build complementar:** Vite 8
- **Deploy:** Vercel (automático via GitHub push)

## Arquitetura

### Rotas de API
| Rota | Método | Função |
|------|--------|--------|
| `app/api/leads/route.ts` | POST | Busca leads reais via Google Places + OpenStreetMap |
| `app/api/generate/route.ts` | POST | Gera prompts premium com gatilhos mentais éticos |
| `app/api/github/route.ts` | POST | Consulta repositórios públicos via GitHub API |

### Páginas
| Arquivo | Função |
|---------|--------|
| `app/page.tsx` | Interface principal — filtros, lista de leads, direção criativa e editor de prompt |
| `app/layout.tsx` | Layout raiz com metadados, Open Graph e fontes |
| `app/briefs/` | Página de briefs |
| `app/dashboard/` | Dashboard |
| `app/insights/` | Insights |
| `app/oportunidades/` | Oportunidades |

### Fontes de dados
- **Google Places API** (v1) — busca principal de leads
- **OpenStreetMap / Overpass / Nominatim** — fallback gratuito
- **GitHub API** (v3 REST) — busca de repositórios públicos
- **IBGE** — estados e municípios (client-side)

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | Não | Chave da OpenAI para geração de prompts |
| `OPENAI_MODEL` | Não | Modelo da OpenAI |
| `GOOGLE_PLACES_API_KEY_1..5` | Não | Chaves do Google Places (rotação) |
| `GITHUB_TOKEN` | Não | Personal Access Token do GitHub |
| `NEXT_PUBLIC_SITE_URL` | Não | URL pública para CORS |

Referência: `.env.example`

## Segurança — OBRIGATÓRIO
- **NUNCA** commite chaves, tokens ou secrets.
- `.env.local` está no `.gitignore` e NUNCA deve ser commitado.
- Use `secureJson()` para respostas de API com headers de segurança.
- Valide origens e sanitize inputs.
- Rate limiting implementado — respeite o padrão.

## Regras gerais
- Trabalhe em **português do Brasil**.
- **Não invente dados** — nomes, telefones, avaliações, endereços.
- Preserve a experiência **premium e limpa**.
- Faça commits pequenos e lógicos.
- Evite código duplicado.

## Comandos
```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run lint     # Linting
```

## Testes
- `tests/lead-search.test.ts` — testes do fluxo de busca
- Execute `npm run build` antes de commitar mudanças estruturais.
- Execute `npm run lint` ao alterar código reutilizável.
