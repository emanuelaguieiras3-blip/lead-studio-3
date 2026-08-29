---
description: Gerar prompt e proposta Aether 1 para uma oportunidade real do Lead Studio (Cursor)
---

# Gerar entrega Aether 1 (Cursor)

Use o modo Aether 1 (`.vscode/prompts/aether1-mode.prompt.md`). Fluxo para o Lead Studio:

1. `POST /api/leads` → comércios reais sem site (Google Places / OpenStreetMap).
2. `POST /api/generate` com `provider: "gemini"` (fallback openai/claude).
3. Dois artefatos separados: `prompt` e `proposal`, com gatilhos mentais éticos.
4. `npm run lint` e `npm run build` antes do deploy na Vercel.
