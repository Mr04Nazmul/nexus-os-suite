-- Apply to a dedicated NEXUS OS Supabase project, never to unrelated app tables.
create table if not exists public.nexus_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 stripe_customer_id text unique, subscription_id text unique,
 plan text not null check (plan in ('free','pro','team')),
 status text not null, updated_at timestamptz not null default now()
);
alter table public.nexus_subscriptions enable row level security;
create policy "Read own membership" on public.nexus_subscriptions for select to authenticated using ((select auth.uid())=user_id);
grant select on public.nexus_subscriptions to authenticated;
revoke insert,update,delete on public.nexus_subscriptions from anon,authenticated;
create table if not exists public.nexus_workspaces (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name)<=100),content jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.nexus_workspaces enable row level security;
create index if not exists nexus_workspace_owner on public.nexus_workspaces(user_id);
create policy "Read own workspaces" on public.nexus_workspaces for select to authenticated using ((select auth.uid())=user_id);
-- Browser mutations deliberately not granted. Server verifies paid membership on writes.
grant select on public.nexus_workspaces to authenticated;
revoke insert,update,delete on public.nexus_workspaces from anon,authenticated;
