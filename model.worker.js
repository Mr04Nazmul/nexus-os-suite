import {pipeline,env} from '@huggingface/transformers';
env.allowLocalModels=false;let classifier;
self.onmessage=async({data})=>{try{if(typeof data!=='string'||data.length>10000)throw Error('Use up to 10,000 characters');classifier??=await pipeline('sentiment-analysis','Xenova/distilbert-base-uncased-finetuned-sst-2-english',{dtype:'q8',device:'wasm',progress_callback:p=>self.postMessage(p.status==='progress'?`${p.file}: ${Math.round(p.progress||0)}%`:`Model: ${p.status}`)});self.postMessage({result:await classifier(data)})}catch(e){classifier=null;self.postMessage({error:e.message})}};
