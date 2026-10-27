const APP='https://mr04nazmul.github.io/nexus-os-suite/';
const ORIGIN=new URL(APP).origin;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const active=s=>!!s&&['active','trialing'].includes(s.status)&&new Date(s.current_period_end).getTime()>Date.now()&&['pro','team'].includes(s.plan);
export const canWrite=role=>['owner','admin','editor'].includes(role);
export const canManage=role=>['owner','admin'].includes(role);
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('')}
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
export function createHandler({createClient,Stripe,env}){
const db=()=>createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const query=async q=>{const r=await q;if(r.error)throw Error(r.error.message);return r.data};
const subscription=async(client,id)=>await query(client.from('nexus_subscriptions').select('plan,status,current_period_end').eq('user_id',id).maybeSingle());
const team=async(client,user,id)=>{if(!uuid(id))fail('Invalid organization');const org=await query(client.from('nexus_organizations').select('*').eq('id',id).maybeSingle());if(!org)fail('Organization not found',404);let role='owner';if(org.owner_id!==user.id){const m=await query(client.from('nexus_team_members').select('role').eq('org_id',id).eq('user_id',user.id).maybeSingle());if(!m)fail('Organization access denied',403);role=m.role}const sub=await subscription(client,org.owner_id);return {org,role,paid:active(sub)&&sub.plan==='team'}};
const stripe=()=>{const key=env('NEXUS_STRIPE_SECRET_KEY');if(!(/^(sk|rk)_test_/.test(key||'')))fail('Stripe test account is not configured. No payment will be taken.',503);return new Stripe(key,{apiVersion:'2026-08-26.dahlia',httpClient:Stripe.createFetchHttpClient()})};
return async req=>{const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'};const respond=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});try{
if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
const action=new URL(req.url).searchParams.get('action');
if(action==='config'&&req.method==='GET')return respond({status:'online',auth:true,team:true,billingMode:/^(sk|rk)_test_/.test(env('NEXUS_STRIPE_SECRET_KEY')||'')&&env('NEXUS_STRIPE_PRO_PRICE_ID')&&env('NEXUS_STRIPE_TEAM_PRICE_ID')&&env('NEXUS_STRIPE_WEBHOOK_SECRET')?'test':'unavailable'});
if(Number(req.headers.get('content-length')||0)>150000)fail('Request too large',413);
if(action==='webhook'&&req.method==='POST'){
 const client=stripe(),secret=env('NEXUS_STRIPE_WEBHOOK_SECRET');if(!secret)fail('Webhook is not configured',503);
 const raw=await req.text();if(raw.length>150000)fail('Request too large',413);let event;try{event=await client.webhooks.constructEventAsync(raw,req.headers.get('stripe-signature')||'',secret,undefined,Stripe.createSubtleCryptoProvider())}catch{fail('Invalid webhook signature',400)}
 if(event.livemode)fail('Live events are disabled',400);
 if(!['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type))return respond({received:true,ignored:true});
 const store=db();const known=await query(store.from('nexus_webhook_events').select('id').eq('id',event.id).maybeSingle());if(known)return respond({received:true,duplicate:true});
 // Fetch canonical state so retries and out-of-order events cannot revive canceled access.
 const sub=await client.subscriptions.retrieve(event.data.object.id);const userId=sub.metadata.user_id,customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
 if(!uuid(userId))fail('Subscription owner missing');
 const mapped=await query(store.from('nexus_billing_customers').select('customer_id').eq('user_id',userId).maybeSingle());if(mapped?.customer_id!==customer)fail('Customer owner mismatch',400);
 const price=sub.items.data[0]?.price.id;const plan=price===env('NEXUS_STRIPE_PRO_PRICE_ID')?'pro':price===env('NEXUS_STRIPE_TEAM_PRICE_ID')?'team':null;if(!plan)fail('Unknown subscription price');
 const end=sub.items.data[0]?.current_period_end||sub.current_period_end;if(!end)fail('Subscription period missing');
 await query(store.from('nexus_subscriptions').upsert({user_id:userId,plan,status:sub.status,stripe_customer_id:customer,stripe_subscription_id:sub.id,current_period_end:new Date(end*1000).toISOString(),updated_at:new Date().toISOString()},{onConflict:'user_id'}));
 await query(store.from('nexus_webhook_events').upsert({id:event.id},{onConflict:'id'}));return respond({received:true});
}
if(!['membership','workspaces','workspace-save','workspace-delete','organizations','organization-create','members','invite-create','invite-accept','member-update','member-remove','checkout','portal'].includes(action))fail('Unknown endpoint',404);
const write=['workspace-save','workspace-delete','organization-create','invite-create','invite-accept','member-update','member-remove','checkout','portal'].includes(action);if(req.method!==(write?'POST':'GET'))fail('Method not allowed',405);
const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)fail('Sign in required',401);const store=db();const auth=await store.auth.getUser(token);if(auth.error||!auth.data.user)fail('Invalid or expired session',401);const user=auth.data.user;if(!user.email_confirmed_at)fail('Confirm your email first',403);
let body={};if(write){const raw=await req.text();if(raw.length>150000)fail('Request too large',413);try{body=JSON.parse(raw||'{}')}catch{fail('Invalid JSON')}}const sub=await subscription(store,user.id),plan=active(sub)?sub.plan:'free';
if(action==='membership')return respond({plan,status:sub?.status||'free',current_period_end:sub?.current_period_end||null,workspaceLimit:plan==='free'?3:100});
if(action==='workspaces'){const org=new URL(req.url).searchParams.get('org');if(org)await team(store,user,org);let q=store.from('nexus_cloud_workspaces').select('id,name,content,org_id,updated_at').order('updated_at',{ascending:false}).limit(100);q=org?q.eq('org_id',org):q.eq('user_id',user.id).is('org_id',null);return respond({workspaces:await query(q)})}
if(action==='workspace-save'){
 const org=body.org_id||null;let limit=plan==='free'?3:100;
 if(org){const t=await team(store,user,org);if(!t.paid||!canWrite(t.role))fail('Active Team plan and editor permission required',403);limit=100}
 if(body.id&&!uuid(body.id))fail('Invalid workspace ID');if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100||!body.content||JSON.stringify(body.content).length>90000)fail('Invalid workspace');
 const id=await query(store.rpc('nexus_save_workspace',{p_user:user.id,p_org:org,p_id:body.id||null,p_name:body.name.trim(),p_content:body.content,p_limit:limit}));return respond({id},body.id?200:201)
}
if(action==='workspace-delete'){if(!uuid(body.id))fail('Invalid workspace');const row=await query(store.from('nexus_cloud_workspaces').select('id,user_id,org_id').eq('id',body.id).maybeSingle());if(!row)fail('Workspace not found',404);if(row.org_id){const t=await team(store,user,row.org_id);if(!t.paid||!canWrite(t.role))fail('Editor permission required',403)}else if(row.user_id!==user.id)fail('Workspace access denied',403);await query(store.from('nexus_cloud_workspaces').delete().eq('id',row.id));return respond({deleted:true})}
if(action==='organizations'){
 const owned=await query(store.from('nexus_organizations').select('*').eq('owner_id',user.id));const member=await query(store.from('nexus_team_members').select('org_id,role').eq('user_id',user.id));const others=member.length?await query(store.from('nexus_organizations').select('*').in('id',member.map(m=>m.org_id))):[];
 return respond({organizations:[...owned.map(o=>({...o,role:'owner'})),...others.map(o=>({...o,role:member.find(m=>m.org_id===o.id).role}))]})
}
if(action==='organization-create'){if(plan!=='team')fail('Verified active Team subscription required',403);if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)fail('Use an organization name under 100 characters');const existing=await query(store.from('nexus_organizations').select('id').eq('owner_id',user.id));if(existing.length>=1)fail('One organization per Team subscription');return respond(await query(store.from('nexus_organizations').insert({owner_id:user.id,name:body.name.trim()}).select().single()),201)}
if(action==='invite-accept'){if(typeof body.token!=='string'||body.token.length<32||body.token.length>128)fail('Invalid invitation');const org=await query(store.rpc('nexus_accept_invite',{p_user:user.id,p_email:user.email,p_hash:await digest(body.token)}));return respond({org_id:org})}
if(['members','invite-create','member-update','member-remove'].includes(action)){
 const orgId=write?body.org_id:new URL(req.url).searchParams.get('org'),t=await team(store,user,orgId);if(action==='members'){const members=await query(store.from('nexus_team_members').select('user_id,role,created_at').eq('org_id',orgId));return respond({organization:t.org,role:t.role,active:t.paid,members:[{user_id:t.org.owner_id,role:'owner'},...members]})}
 if(!t.paid||!canManage(t.role))fail('Active Team plan and administrator permission required',403);
 if(action==='invite-create'){if(typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||body.email.length>254)fail('Valid invitation email required');const role=body.role||'viewer';if(!['viewer','editor','admin'].includes(role)||(role==='admin'&&t.role!=='owner'))fail('Only the owner can grant admin access',403);const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');const row=await query(store.from('nexus_team_invites').insert({org_id:orgId,email:body.email.toLowerCase(),role,token_hash:await digest(token),expires_at:new Date(Date.now()+7*86400000).toISOString()}).select('id,expires_at').single());return respond({...row,url:APP+'?invite='+token+'#team',delivery:'Share this link with the invited email owner. No email is sent automatically.'},201)}
 if(!uuid(body.user_id)||body.user_id===t.org.owner_id)fail('Owner role cannot be changed here',403);const target=await query(store.from('nexus_team_members').select('role').eq('org_id',orgId).eq('user_id',body.user_id).maybeSingle());if(!target)fail('Member not found',404);if(t.role!=='owner'&&target.role==='admin')fail('Only owner can manage administrators',403);
 if(action==='member-update'){if(!['viewer','editor','admin'].includes(body.role)||(body.role==='admin'&&t.role!=='owner'))fail('Invalid role assignment',403);await query(store.from('nexus_team_members').update({role:body.role}).eq('org_id',orgId).eq('user_id',body.user_id));return respond({updated:true})}
 await query(store.from('nexus_team_members').delete().eq('org_id',orgId).eq('user_id',body.user_id));return respond({removed:true})
}
if(action==='checkout'){
 if(!['pro','team'].includes(body.plan))fail('Select Pro or Team');if(plan!=='free')fail('Manage your existing subscription in the billing portal');const client=stripe(),priceId=env(body.plan==='pro'?'NEXUS_STRIPE_PRO_PRICE_ID':'NEXUS_STRIPE_TEAM_PRICE_ID');if(!priceId||!env('NEXUS_STRIPE_WEBHOOK_SECRET'))fail('Billing setup incomplete',503);
 const price=await client.prices.retrieve(priceId);if(price.livemode||price.currency!=='usd'||price.unit_amount!==(body.plan==='pro'?900:2900)||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1)fail('Expected USD monthly test price',503);
 let mapped=await query(store.from('nexus_billing_customers').select('customer_id').eq('user_id',user.id).maybeSingle());if(!mapped){const customer=await client.customers.create({email:user.email,metadata:{user_id:user.id}},{idempotencyKey:'nexus-customer-'+user.id});await query(store.from('nexus_billing_customers').upsert({user_id:user.id,customer_id:customer.id},{onConflict:'user_id'}));mapped={customer_id:customer.id}}
 const checkout=await client.checkout.sessions.create({customer:mapped.customer_id,client_reference_id:user.id,mode:'subscription',line_items:[{price:priceId,quantity:1}],subscription_data:{metadata:{user_id:user.id},billing_mode:{type:'flexible'}},integration_identifier:'nexus_os_checkout_'+Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>String.fromCharCode(97+n%26)).join(''),success_url:APP+'#account',cancel_url:APP+'#pricing'},{idempotencyKey:`nexus-checkout-${user.id}-${body.plan}-${Math.floor(Date.now()/300000)}`});return respond({url:checkout.url,mode:'test'})
}
if(action==='portal'){const client=stripe(),mapped=await query(store.from('nexus_billing_customers').select('customer_id').eq('user_id',user.id).maybeSingle());if(!mapped)fail('No subscription customer found');const p=await client.billingPortal.sessions.create({customer:mapped.customer_id,configuration:env('NEXUS_STRIPE_PORTAL_CONFIG_ID'),return_url:APP+'#account'});return respond({url:p.url})}
return respond({error:'Unsupported action'},404);
}catch(e){if(e.status)return respond({error:e.message},e.status);console.error('nexus-api',e.message);return respond({error:'Operation failed. Check your access, quota and service configuration.'},500)}}}
