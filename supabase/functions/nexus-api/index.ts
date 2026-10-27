import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@18.5.0';
import {createHandler} from './handler.js';
Deno.serve(createHandler({createClient,Stripe,env:(key:string)=>Deno.env.get(key)}));
