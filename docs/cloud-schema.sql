-- NEXUS OS additive cloud schema; preserves existing nexus_workflows and subscriptions.
create table public.nexus_organizations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 100),created_at timestamptz not null default now()
);
create table public.nexus_team_members (
 org_id uuid not null references public.nexus_organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','editor','viewer')),created_at timestamptz not null default now(),primary key(org_id,user_id)
);
create table public.nexus_team_invites (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.nexus_organizations(id) on delete cascade,
 email text not null,role text not null check(role in ('admin','editor','viewer')),token_hash text not null unique,
 expires_at timestamptz not null,accepted_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table public.nexus_cloud_workspaces (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 org_id uuid references public.nexus_organizations(id) on delete cascade,
 name text not null check(length(name) between 1 and 100),content jsonb not null check(pg_column_size(content)<=100000),
 updated_at timestamptz not null default now()
);
create table public.nexus_billing_customers(user_id uuid primary key references auth.users(id) on delete cascade,customer_id text not null unique);
create table public.nexus_webhook_events(id text primary key,processed_at timestamptz not null default now());
alter table public.nexus_organizations enable row level security;
alter table public.nexus_team_members enable row level security;
alter table public.nexus_team_invites enable row level security;
alter table public.nexus_cloud_workspaces enable row level security;
alter table public.nexus_billing_customers enable row level security;
alter table public.nexus_webhook_events enable row level security;
create policy "Own membership" on public.nexus_team_members for select to authenticated using(user_id=(select auth.uid()));
create policy "Organization visibility" on public.nexus_organizations for select to authenticated using(owner_id=(select auth.uid()) or exists(select 1 from public.nexus_team_members m where m.org_id=id and m.user_id=(select auth.uid())));
create policy "Personal or team visibility" on public.nexus_cloud_workspaces for select to authenticated using((org_id is null and user_id=(select auth.uid())) or exists(select 1 from public.nexus_organizations o where o.id=org_id));
revoke all on public.nexus_organizations,public.nexus_team_members,public.nexus_team_invites,public.nexus_cloud_workspaces,public.nexus_billing_customers,public.nexus_webhook_events from anon,authenticated;
grant select on public.nexus_organizations,public.nexus_team_members,public.nexus_cloud_workspaces to authenticated;
grant all on public.nexus_organizations,public.nexus_team_members,public.nexus_team_invites,public.nexus_cloud_workspaces,public.nexus_billing_customers,public.nexus_webhook_events to service_role;
create index nexus_org_owner_idx on public.nexus_organizations(owner_id);
create index nexus_member_user_idx on public.nexus_team_members(user_id);
create index nexus_invite_org_idx on public.nexus_team_invites(org_id);
create index nexus_workspace_user_idx on public.nexus_cloud_workspaces(user_id);
create index nexus_workspace_org_idx on public.nexus_cloud_workspaces(org_id);
create index nexus_invite_accepted_idx on public.nexus_team_invites(accepted_by);
-- Server-only RPCs serialize quotas and invitation acceptance. No browser grants.
create function public.nexus_save_workspace(p_user uuid,p_org uuid,p_id uuid,p_name text,p_content jsonb,p_limit int) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(coalesce(p_org,p_user)::text,0));
 if p_id is null then
  if (select count(*) from public.nexus_cloud_workspaces where (p_org is null and org_id is null and user_id=p_user) or (p_org is not null and org_id=p_org))>=p_limit then raise exception 'Workspace quota reached';end if;
  insert into public.nexus_cloud_workspaces(user_id,org_id,name,content) values(p_user,p_org,p_name,p_content) returning id into v_id;
 else
  update public.nexus_cloud_workspaces set name=p_name,content=p_content,updated_at=now() where id=p_id and ((p_org is null and org_id is null and user_id=p_user) or (p_org is not null and org_id=p_org)) returning id into v_id;
  if v_id is null then raise exception 'Workspace not found';end if;
 end if;
 return v_id;
end $$;
create function public.nexus_accept_invite(p_user uuid,p_email text,p_hash text) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_inv public.nexus_team_invites;v_owner uuid;
begin
 select * into v_inv from public.nexus_team_invites where token_hash=p_hash for update;
 if v_inv.id is null or v_inv.accepted_by is not null or v_inv.expires_at<=now() or lower(v_inv.email)<>lower(p_email) then raise exception 'Invitation invalid or expired';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_inv.org_id::text,0));
 select owner_id into v_owner from public.nexus_organizations where id=v_inv.org_id;
 if v_owner=p_user then raise exception 'Owner already belongs to organization';end if;
 if not exists(select 1 from public.nexus_subscriptions where user_id=v_owner and plan='team' and status in('active','trialing') and current_period_end>now()) then raise exception 'Organization subscription inactive';end if;
 if (select count(*) from public.nexus_team_members where org_id=v_inv.org_id)>=9 then raise exception 'Team seat limit reached';end if;
 insert into public.nexus_team_members(org_id,user_id,role) values(v_inv.org_id,p_user,v_inv.role) on conflict(org_id,user_id) do nothing;
 update public.nexus_team_invites set accepted_by=p_user where id=v_inv.id;
 return v_inv.org_id;
end $$;
revoke all on function public.nexus_save_workspace(uuid,uuid,uuid,text,jsonb,int), public.nexus_accept_invite(uuid,text,text) from public,anon,authenticated;
grant execute on function public.nexus_save_workspace(uuid,uuid,uuid,text,jsonb,int),public.nexus_accept_invite(uuid,text,text) to service_role;

create unique index if not exists nexus_one_org_per_owner on public.nexus_organizations(owner_id);
