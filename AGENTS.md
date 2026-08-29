# Lead Studio — Instruções para Agentes de IA

## Visão geral
Este projeto é uma aplicação Next.js para encontrar leads em cidades brasileiras (empresas reais sem site informado) e gerar prompts premium com gatilhos mentais éticos para landing pages de negócios locais.

## Stack
- **Framework:** Next.js 16 com App Router
- **UI:** React 19
- **Linguagem:** TypeScript (strict)
- **Estilo:** Tailwind CSS 4
- **Build:** Vite 8 (complementar)
- **Deploy:** Vercel (automático via push no GitHub)

## Estrutura principal

### Rotas de API
| Arquivo | Função |
|---------|--------|
| `app/api/leads/route.ts` | Busca de leads via Google Places + OpenStreetMap |
| `app/api/generate/route.ts` | Geração de prompts premium com gatilhos mentais |
| `app/api/github/route.ts` | Consulta de repositórios públicos via GitHub API |

### Páginas
| Arquivo | Função |
|---------|--------|
| `app/page.tsx` | Interface principal do usuário |
| `app/layout.tsx` | Layout raiz com metadados |
| `app/briefs/` | Página de briefs |
| `app/dashboard/` | Dashboard |
| `app/insights/` | Insights |
| `app/oportunidades/` | Oportunidades |

### Testes
| Arquivo | Função |
|---------|--------|
| `tests/lead-search.test.ts` | Testes do fluxo de busca |

## Regras do projeto — OBRIGATÓRIAS

### Dados
- Nunca invente dados de empresas, telefones, avaliações ou endereços.
- Use apenas dados públicos e o comportamento atual do backend.
- Mantenha textos em **português do Brasil**.

### Segurança
- **NUNCA commite chaves, tokens ou secrets** no repositório.
- O `.env.local` está protegido pelo `.gitignore` — jamais commitar.
- Toda variável sensível deve ficar em `.env.local` localmente e nas Environment Variables da Vercel em produção.
- Use `secureJson()` para todas as respostas de API.
- Valide origens com `isTrustedOrigin()` em endpoints sensíveis.
- Sanitize inputs com `cleanText()` antes de queries externas.
- Use `AbortSignal.timeout()` em todas as chamadas a APIs externas.

### UX
- Preserve a experiência premium e interface clara.
- Priorize funcionalidade local e conversão de leads.
- Mobile first, responsivo, veloz e acessível.

### Código
- Tipos explícitos para funções e parâmetros.
- Prefer `const` e funções nomeadas.
- Tratamento de erros com try/catch.
- Faça commits pequenos e lógicos.
- Evite código duplicado.

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `OPENAI_API_KEY` | Geração de prompts via OpenAI |
| `OPENAI_MODEL` | Modelo da OpenAI |
| `GOOGLE_PLACES_API_KEY_1..5` | Busca de leads (rotação automática) |
| `GITHUB_TOKEN` | API do GitHub (rate limit maior) |
| `NEXT_PUBLIC_SITE_URL` | URL pública para CORS e metadados |

Referência: `.env.example`

## Comandos
```bash
npm install       # Instalar dependências
npm run dev       # Servidor de desenvolvimento
npm run build     # Build de produção
npm run lint      # Linting do código
```

## Instruções para agentes
- Fique atento à estabilidade do fluxo de busca e geração de prompts.
- Prefira ajustes pequenos e focados.
- Sempre verifique se a alteração não quebrou a UI nem a API.
- Se alterar regras de busca ou prompts, valide com build e testes.
- Antes de qualquer commit, verifique que nenhum secret está no código.
