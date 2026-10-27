import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@22.6.0';
import {createHandler} from './handler.js';
let cached:Record<string,string>={},loaded=0;
const configClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async(req:Request)=>{
 if(Date.now()-loaded>60000){const {data,error}=await configClient.rpc('nexus_billing_configuration');if(!error&&data){cached=data;loaded=Date.now()}}
 return createHandler({createClient,Stripe,env:(key:string)=>Deno.env.get(key)||cached[key]})(req);
});
