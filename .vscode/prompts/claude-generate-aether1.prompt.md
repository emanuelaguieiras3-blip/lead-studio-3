---
description: Gerar prompt e proposta Aether 1 para uma oportunidade real do Lead Studio (Claude)
---

# Gerar entrega Aether 1 (Claude)

Siga o modo Aether 1 (`.vscode/prompts/aether1-mode.prompt.md`). Para a oportunidade real do Lead Studio:

1. Busque os comércios reais via `POST /api/leads` (Google Places + OpenStreetMap) e valide os dados.
2. Gere via `POST /api/generate` com `provider: "claude"`.
3. Separe obrigatoriamente `prompt` (brief de produção) de `proposal` (texto comercial).
4. Aplique os gatilhos mentais éticos e mantenha português do Brasil.
5. Valide com `npm run lint` e `npm run build`.
