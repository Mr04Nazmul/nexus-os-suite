# NEXUS OS cloud backend

Frontend: https://mr04nazmul.github.io/nexus-os-suite/
Supabase project: NAZU Cloud Staging (`rmvmnxijigbbjnunwfwk`), selected by the owner.
Function: `nexus-api` with its own `auth.getUser` verification on every protected route. Gateway JWT checking is disabled to allow public health/config and signed Stripe webhooks; this does not disable application authorization.

## Implemented and tested

- Email/password sign-in, sign-out, confirmation-required accounts, password recovery/update UI, persisted sessions.
- Three Free personal projects, 100 personal projects for active Pro/Team.
- Team organization with owner/admin/editor/viewer roles; 10 seats including owner.
- Invitations bound to a confirmed email, hashed tokens, 7-day expiry, single-use acceptance.
- Personal and shared JSON workspaces with save/load/update/delete and workflow opening.
- Server-only writes; RLS on every exposed table. Clients cannot update subscriptions or roles directly.
- Stripe test-only $9/$29 monthly Checkout, Customer Portal, raw-body signature verification, canonical subscription state and duplicate event handling. Live keys are rejected.

Backend code is under `supabase/functions/nexus-api`. Additive schema is in `docs/cloud-schema.sql`; existing subscription/workflow tables were preserved. The cloud-schema file records an already-applied setup, not a script to reapply unchanged.

## Required Stripe account setup (not completed)

No Stripe account or secrets were available through the connected services. Set these through Supabase Dashboard → Edge Functions → Secrets, never in source or chat:

- `NEXUS_STRIPE_SECRET_KEY`: test secret key
- `NEXUS_STRIPE_PRO_PRICE_ID`: $9 USD, monthly recurring test price
- `NEXUS_STRIPE_TEAM_PRICE_ID`: $29 USD, monthly recurring test price
- `NEXUS_STRIPE_WEBHOOK_SECRET`: endpoint signing secret

Webhook URL: `https://rmvmnxijigbbjnunwfwk.supabase.co/functions/v1/nexus-api?action=webhook`.
Subscribe to `customer.subscription.created`, `.updated`, `.deleted`. Configure the Stripe test Customer Portal. Do not allow portal changes to prices outside the two mapped plans.

After setup, test both plans, webhook retries/out-of-order events, declined payments, cancellation, renewal and role access after expiry before enabling purchases. Checkout is explicitly unavailable while setup is missing. No real payments are activated.

## Email redirects and SMTP

Allow `https://mr04nazmul.github.io/nexus-os-suite/**` under Supabase Authentication → URL Configuration → Redirect URLs, preserving other apps' existing URLs. The shared project's Site URL should not be changed without reviewing those apps. Configure reliable SMTP and test real confirmation/recovery email delivery. Dashboard sign-in is needed to review these settings; the current connector does not expose Auth configuration updates.

## Verification

18 automated local tests pass. A disposable backend integration run passed 23 checks against the deployed database/function: real email/password login/logout, Free quota, cross-user isolation, Team create, invitation/replay, viewer denial, role change, editor shared save, RLS and subscription tamper denial. Temporary test users and their organizations were removed; the temporary QA endpoint was replaced with an inert 410 handler requiring JWT.

Stripe end-to-end testing and actual confirmation/recovery email delivery remain unverified. No test user was retained and no real account was granted a synthetic paid subscription.

## Sandbox provisioned on 2026-10-27

Selected Stripe sandbox: `acct_1UV08HKYXlIqyCWm` (Nexus sandbox).

- Pro recurring test price: `price_1UV1bFKYXlIqyCWmotrXItqx` ($9 USD/month).
- Team recurring test price: `price_1UV1bOKYXlIqyCWmrih652d8` ($29 USD/month).
- Portal configuration: `bpc_1UV1cCKYXlIqyCWmM5iZ1K6A` (payment-method updates, invoice history, end-of-period cancellation).
- Webhook endpoint: `we_1UV1cMKYXlIqyCWmAQQrApXM`.

The signing secret and price/portal configuration are encrypted in Supabase Vault. Only service_role can execute the configuration RPC; public clients cannot read it. No Stripe secret appears in repository files.

**Remaining credential:** In Supabase Edge Function Secrets, set `NEXUS_STRIPE_SECRET_KEY` to a restricted test key (`rk_test_...`) from this exact sandbox. Allow Customers read/write, Checkout Sessions read/write, Subscriptions read, Prices read and Billing Portal Sessions write (including dependencies Stripe indicates). A regular test secret key is compatible, but a restricted key is preferred. The backend rejects live keys. Do not paste keys into chat.

The Stripe account connection authorizes connector operations; it does not supply a durable server API credential. Until this key is set, website checkout is intentionally unavailable and the complete billing lifecycle is unverified. Sandbox products and webhook creation alone do not establish working subscription fulfillment.
