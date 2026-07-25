# LeadsPipeline deployment

## Current architecture

This project is a Next.js app. The UI and API routes live in the same app:

- Frontend: `src/app/page.tsx` and components
- Backend API routes: `src/app/api/**`

Deploying to Vercel will run both frontend and API routes together.

The `backend` folder contains a Docker/FastAPI backend for Hugging Face Spaces. It currently supports AI intel, message tailoring, SMTP status, and outbound email sending.

## Vercel frontend/fullstack deploy

Add these GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Add the app environment variables in Vercel Project Settings. Do not commit `.env.local`.

If you want Vercel frontend to call the Hugging Face backend, set:

- `NEXT_PUBLIC_BACKEND_URL`

Example:

```text
https://raheemakhter-leadspipeline.hf.space
```

The workflow is:

- `.github/workflows/vercel-frontend.yml`

It runs on `main` push and manual dispatch.

## Hugging Face backend deploy

Create a Hugging Face Space and add these GitHub repository secrets:

- `HF_TOKEN`
- `HF_SPACE_ID`

Example `HF_SPACE_ID`:

```text
your-username/leadspipeline-backend
```

The workflow is:

- `.github/workflows/huggingface-backend.yml`

It is manual-only. It uploads the folder selected in `backend_path`, defaulting to `backend`.

Set these secrets in the Hugging Face Space settings:

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

## Backend split checklist

The current Hugging Face backend already supports:

- AI company intel
- AI message tailoring
- SMTP status
- SMTP email sending
- Brevo transactional email sending

These routes still run inside the Next.js/Vercel app unless you split them later:

- Auth/login/OTP
- Saved leads
- Campaigns
- Ready-to-buy lead scraping
- CSV export
