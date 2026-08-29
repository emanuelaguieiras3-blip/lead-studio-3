# Claude Project Context

## Objetivo
Este repositório contém o **Lead Studio**, um gerador de oportunidades de negócios locais que busca empresas reais sem site informado e cria prompts premium para landing pages com gatilhos mentais éticos.

## Stack
- **Framework:** Next.js 16 com App Router
- **UI:** React 19
- **Linguagem:** TypeScript (strict)
- **Estilo:** Tailwind CSS 4
- **Build complementar:** Vite 8
- **Deploy:** Vercel (automático via GitHub)

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
- **Google Places API** (v1 searchText) — busca principal, requer chaves em `GOOGLE_PLACES_API_KEY_*`
- **OpenStreetMap / Overpass / Nominatim** — fallback gratuito quando não há chaves Google
- **GitHub API** (v3 REST) — busca repos públicos, usa `GITHUB_TOKEN` para rate limit maior
- **IBGE** — lista de estados e municípios brasileiros (client-side)

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | Não | Chave da OpenAI para gerar prompts via IA |
| `OPENAI_MODEL` | Não | Modelo da OpenAI (ex: gpt-5.4-mini) |
| `GOOGLE_PLACES_API_KEY_1..5` | Não | Chaves do Google Places (rotação automática) |
| `GITHUB_TOKEN` | Não | Personal Access Token do GitHub (público_repo) |
| `NEXT_PUBLIC_SITE_URL` | Não | URL pública do site para CORS e metadados |

## Segurança — regras obrigatórias
- **NUNCA** commite chaves, tokens ou secrets. Verifique o `.gitignore`.
- O `.env.local` está no `.gitignore` e NUNCA deve ser commitado.
- Toda rota de API deve usar `secureJson()` com headers de segurança.
- Valide origens com `isTrustedOrigin()` em rotas sensíveis.
- Rate limiting está implementado em `leads/route.ts` — respeite o padrão.
- Sanitize inputs com `cleanText()` antes de usar em queries.

## Boas práticas
- Trabalhe em **português do Brasil** em toda a interface e comentários.
- Mantenha a experiência **premium e limpa** visual.
- **Não invente dados** que não existam no sistema ou na API — nomes, telefones, avaliações, endereços.
- Valide sempre que houver alteração em roteamento, UI ou API.
- Faça commits pequenos e lógicos.
- Evite código duplicado.

## Comandos
```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run lint     # Linting do código
```

## Regras de contribuição
- Faça pequenos commits lógicos.
- Evite código duplicado.
- Sempre mantenha o ambiente de desenvolvimento funcionando.
- Execute `npm run build` antes de commitar mudanças estruturais.
- Execute `npm run lint` ao alterar código reutilizável.
