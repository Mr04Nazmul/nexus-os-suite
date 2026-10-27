# NEXUS OS

Local-first developer, API and AI workspace by Hossain Najmul.

Production target: https://nexus-os-suite.vercel.app

## Run

Node 22+: `npm ci --ignore-scripts`, `npm run dev`.
Validate: `npm run check`, `npm test`, `npm run build`.

## Implemented

- 33 browser tools: JSON, YAML, CSV, numeric statistics, encoding, hashing, JWT inspection, text utilities, regex testing and simple code formatting.
- Local image resize/conversion, PDF merging/text creation, sanitized Markdown preview.
- 2,215 searchable categorized public API records imported from public-apis; fixed live GET connectors for weather, Pokemon and test data. Directory presence does not verify provider availability.
- Three-step local pipelines, device draft save, validated JSON import/export.
- Ollama chat, conversation export, assisted agent modes, local lexical document retrieval with model-assisted Q&A. No autonomous browsing or code execution.
- Transformers.js sentiment worker: downloads the selected model on request. Model inference not verified in this build environment.
- Supabase email auth integration; server-protected cloud workspace API; Stripe test-only Checkout, Portal and signed subscription webhooks.
- Help, Privacy and Terms, responsive dark interface.

## Deployment

Vercel imports `Mr04Nazmul/nexus-os-suite`, framework Vite, output `dist`; `/api/index` is a Node function. Enable automatic deployments from main in Vercel project settings. CI runs build and tests on pushes. Manual Pages workflow provides a **static demo only**, without account/backend functions; enable Pages Actions in repository settings first.

## Required service setup

No secrets are committed. Configure `.env.example` variables in **Vercel Environment Variables**, never in chat. Create a dedicated Supabase project, apply `docs/schema.sql`, set Site URL and allowed auth redirects to the production origin. Email delivery and account confirmation must be tested before launch.

Create a Stripe **test** $9 USD monthly recurring price and configure its ID. Register a webhook at `/api/index?action=webhook` for `customer.subscription.created`, `.updated`, `.deleted`. Save its signing secret securely. Backend rejects live Stripe keys and Team checkout. Test a complete subscription lifecycle, duplicate events, cancellation and portal before any commercial launch. Add production-grade per-user provider quotas before enabling an owner-funded cloud AI provider broadly.

## Limits / outstanding

Live accounts, RLS against a dedicated database, cloud saves and Stripe lifecycle are **not verified until credentials/schema are configured**. Team workspaces, invites, permissions and organization administration are not implemented. SQL is a formatter, not an executable database. PDF text creation uses a standard Latin font; uploaded PDF Q&A/OCR is not implemented. Retrieval is lexical chunk ranking, not vector embeddings. API and model directory records are not prepaid service access. Browser automation is limited to supported local workflow execution, not arbitrary external websites.

## Licenses

See `THIRD_PARTY_NOTICES.md` and `licenses/`. Third-party API, dataset and model terms apply separately. The additional commercial agreements described by the owner were not supplied; required notices are retained. Product source is proprietary unless the owner chooses otherwise.
