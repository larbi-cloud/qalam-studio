# Qalam Studio AI Worker

Secure Cloudflare Worker proxy for the Qalam Studio content generator.

## Architecture

Browser -> Cloudflare Worker -> OpenRouter -> AI model

The OpenRouter API key must never be stored in `index.html`, client-side JavaScript, GitHub Pages, or a public GitHub secret file.

## Model

The default model is `openrouter/free`. Change `OPENROUTER_MODEL` in `wrangler.jsonc` later if Qalam Studio needs a specific paid or premium model.

## Local/deploy setup

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npm run deploy
```

When Wrangler asks for the secret value, paste the OpenRouter key there. Do not commit it to GitHub.

## Endpoints

- `GET /health` — service status
- `POST /api/generate` — generate three Moroccan Arabic marketing texts

Example request body:

```json
{
  "business": "مقهى مختص",
  "city": "الرباط"
}
```

Example response shape:

```json
{
  "ok": true,
  "model": "provider/model-used",
  "items": [
    { "title": "إعلان قصير", "text": "..." },
    { "title": "كابسيون", "text": "..." },
    { "title": "CTA", "text": "..." }
  ]
}
```

## Security notes

- `OPENROUTER_API_KEY` is a Cloudflare encrypted secret.
- CORS is restricted through `ALLOWED_ORIGINS`.
- Input length is capped before being sent to OpenRouter.
- Provider errors are normalized before reaching the browser.
- Before public launch, add Cloudflare rate limiting and/or Turnstile to reduce automated abuse. CORS alone is not an abuse-prevention mechanism.
