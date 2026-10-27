# NEXUS OS

Local-first developer, API and AI workspace by Hossain Najmul.

Website: https://mr04nazmul.github.io/nexus-os-suite/

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

## Hosting and cloud services

Source, CI and automatic frontend deployment use this GitHub repository and GitHub Pages. No Vercel connection is required. Backend authentication, workspaces, Team roles and test-billing endpoints run in the owner-selected Supabase project.

See [cloud setup and verified status](docs/CLOUD_SETUP.md) for exact implementation, configuration and limitations.

## Current verification

18 local tests and a production build pass. A deployed backend integration run passed 23 checks using disposable accounts, including login/logout, project quota, role enforcement, team invitation acceptance and RLS isolation. Test accounts were removed.

Stripe sandbox billing is configured and passed 19 live-backend checks for Pro/Team Checkout Sessions, test invoices, signed webhook fulfillment, Portal and cancellation. Production/live charging remains disabled. Hosted browser card-form submission also passed 5 end-to-end checks, including paid Checkout, webhook Pro activation and Portal access. Real confirmation/recovery email delivery remains unverified. Team functionality is implemented and gated on server-verified membership.

## Licenses

See THIRD_PARTY_NOTICES.md and licenses/. API and model terms apply separately.
