---
title: LeadsPipeline Backend
emoji: 🚀
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# LeadsPipeline Backend

Docker backend for Hugging Face Spaces.

## Endpoints

- `GET /health`
- `GET /mail/status`
- `POST /mail/send`
- `POST /messages/tailor`
- `POST /ai/intel`

## Hugging Face Space secrets

Set these in Space settings:

- `ALLOWED_ORIGINS`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `PERPLEXITY_API_KEY`
- `SERPER_API_KEY`
- `MESSAGE_SMTP_HOST`
- `MESSAGE_SMTP_PORT`
- `MESSAGE_SMTP_SECURE`
- `MESSAGE_SMTP_USER`
- `MESSAGE_SMTP_PASS`
- `MESSAGE_SMTP_FROM`
- `BREVO_API_KEY`
- `BREVO_FROM_EMAIL`
- `BREVO_FROM_NAME`

Example `ALLOWED_ORIGINS`:

```text
https://your-vercel-app.vercel.app,http://localhost:3000
```
