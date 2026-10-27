# NEXUS OS cloud status

Website: https://mr04nazmul.github.io/nexus-os-suite/
Backend: owner-selected NAZU Cloud Staging (`rmvmnxijigbbjnunwfwk`). No Vercel connection is required.

## Active services

- Supabase email/password authentication, session restore, password recovery/update and direct confirmation-link verification.
- Free: 3 personal cloud projects. Pro/Team: up to 100 personal projects.
- Team: one organization, up to 10 people including owner; owner/admin/editor/viewer roles, 7-day single-use invitations tied to confirmed email, shared JSON projects.
- Server-authenticated writes, atomic project quotas, RLS on exposed tables, no browser subscription or role mutation.
- Stripe **sandbox** subscription Checkout, Customer Portal and signed webhooks. Live keys and real charging remain disabled.

The function validates protected requests using `auth.getUser`. Gateway JWT checking is disabled solely to permit the public config endpoint and Stripe signed webhooks; protected actions still require a confirmed authenticated user. Internal test functions are disabled and require JWT.

## Stripe sandbox configuration

Selected account: `acct_1UV08HKYXlIqyCWm` (Nexus sandbox).

| Resource | ID |
| --- | --- |
| Pro $9 USD/month | `price_1UV1bFKYXlIqyCWmotrXItqx` |
| Team $29 USD/month | `price_1UV1bOKYXlIqyCWmrih652d8` |
| Customer Portal | `bpc_1UV1cCKYXlIqyCWmM5iZ1K6A` |
| Webhook endpoint | `we_1UV1cMKYXlIqyCWmAQQrApXM` |

The existing sandbox test credential is stored in encrypted Supabase Edge Function Secrets as `NEXUS_STRIPE_SECRET_KEY`. It is not in source control. Restricted test keys are also supported and preferred for future credential rotation.

Price IDs, Portal ID and the signing secret are stored in Supabase Vault. Only service_role can invoke `nexus_billing_configuration`; anonymous and authenticated users cannot read its contents. Webhook URL: `https://rmvmnxijigbbjnunwfwk.supabase.co/functions/v1/nexus-api?action=webhook`.

Webhooks process subscription created/updated/deleted events by fetching canonical Stripe state, checking customer ownership and mapped price IDs, recording processed event IDs and updating server-owned membership. Portal allows billing information/payment-method updates, invoice history and cancellation at period end. Plan switching is disabled in the Portal.

## Verification

- 18 automated local tests and production build pass.
- 23 deployed authentication/workspace/Team checks passed: real login/logout, Free quota, cross-user isolation, Team invitations, replay denial, viewer write denial, editor writes, role changes, RLS and subscription-tamper denial.
- 19 deployed Stripe checks passed: correct sandbox identity; Pro/Team authenticated Checkout Session creation with exact prices; API-created test-paid subscriptions; real signed webhook activation; Customer Portal; access retained during scheduled cancellation; duplicate checkout rejection; immediate cancellation revocation.
- Disposable customers, subscriptions and application accounts were cleaned up, with zero temporary billing accounts remaining. QA endpoints were disabled.

The billing verification created subscriptions through Stripe's API using test payment tokens. Browser card-form submission was not exercised. Real signup/recovery email delivery remains unverified. GitHub Pages auth redirect URLs were added without changing the shared project's Site URL or removing the existing staging app callback.

## Operations

Deploy source changes through this GitHub repository. `docs/cloud-schema.sql` records the already-applied additive schema; do not reapply unchanged. Edge code is in `supabase/functions/nexus-api`; pinned Stripe SDK 22.6.0 and API 2026-08-26.dahlia are used. Configure `import_map_path: deno.json` when updating the function via MCP.

A production charging launch needs a separate reviewed live-mode deployment, account readiness, appropriate live credentials and complete billing/email testing. The current backend intentionally rejects live Stripe keys.
