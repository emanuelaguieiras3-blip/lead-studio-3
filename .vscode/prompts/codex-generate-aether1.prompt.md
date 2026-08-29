---
description: Gerar prompt e proposta Aether 1 para uma oportunidade real do Lead Studio (Codex)
---

# Gerar entrega Aether 1 (Codex)

Use o modo Aether 1 (`.vscode/prompts/aether1-mode.prompt.md`). Para a oportunidade real selecionada no Lead Studio:

1. Confirme que os dados vêm de `app/api/leads/route.ts` (Google Places ou OpenStreetMap) — nunca invente.
2. Acione `app/api/generate/route.ts` com `provider: "openai"` (fallback claude/gemini).
3. Entregue **dois artefatos separados**:
   - `prompt`: instrução de produção da landing page, com gatilhos mentais éticos e dados verificados.
   - `proposal`: proposta comercial persuasiva e fechada.
4. Rode `npm run lint` e `npm run build` e corrija falhas antes do deploy.
