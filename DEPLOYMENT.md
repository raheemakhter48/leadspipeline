# LeadsPipeline deployment

## Current architecture

This project is a Next.js app. The UI and API routes live in the same app:

- Frontend: `src/app/page.tsx` and components
- Backend API routes: `src/app/api/**`

Deploying to Vercel will run both frontend and API routes together.

If the backend must run on Hugging Face, split the API routes into a separate backend service first, then deploy that backend folder with the Hugging Face workflow.

## Vercel frontend/fullstack deploy

Add these GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Add the app environment variables in Vercel Project Settings. Do not commit `.env.local`.

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

## Backend split checklist

Before using Hugging Face as backend:

1. Move API logic from `src/app/api/**` into a separate `backend` folder.
2. Expose the backend with HTTP endpoints.
3. Add a Dockerfile or Hugging Face Space app file in `backend`.
4. Change frontend fetch calls from `/api/...` to `NEXT_PUBLIC_API_URL + "/..."`.
5. Add backend secrets in Hugging Face Space settings.
