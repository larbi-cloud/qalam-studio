# Qalam Studio AI Worker

Secure Cloudflare Worker proxy for the Qalam Studio content generator.

## Architecture

Browser -> Cloudflare Worker -> OpenRouter -> AI model

The OpenRouter API key must never be stored in `index.html`, client-side JavaScript, GitHub Pages, or a public GitHub secret file.

## Model

The production model is configured in `wrangler.jsonc`. Qalam Studio currently pins a free OpenRouter model rather than relying on the rotating `openrouter/free` router.

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
- `POST /api/generate` — generate AI marketing content

Example request body:

```json
{
  "business": "مقهى مختص",
  "city": "الرباط",
  "contentType": "mixed",
  "tone": "professional",
  "language": "darija"
}
```

Example response shape:

```json
{
  "ok": true,
  "model": "provider/model-used",
  "items": [
    { "title": "فكرة 1", "text": "..." },
    { "title": "فكرة 2", "text": "..." },
    { "title": "فكرة 3", "text": "..." }
  ]
}
```

## Cloudflare Build

Production branch: `main`
Root directory: `worker`
Deploy command: `npx wrangler deploy --config wrangler.jsonc`

## Rollout status

- Cloudflare Worker deployed successfully from the feature branch during initial rollout.
- `/health` endpoint verified.
- OpenRouter generation verified.
- Frontend generator wired through `ai-generator.js`.
- Generator supports content type, tone, and language controls.
- Service worker uses network-first delivery for live generator files.
- API key is stored only as a Cloudflare encrypted secret.

## Security notes

- `OPENROUTER_API_KEY` is a Cloudflare encrypted secret.
- CORS is restricted through `ALLOWED_ORIGINS`.
- Input length is capped before being sent to OpenRouter.
- Provider errors are normalized before reaching the browser.
- Before scaling public usage, add Cloudflare rate limiting and/or Turnstile to reduce automated abuse. CORS alone is not an abuse-prevention mechanism.
