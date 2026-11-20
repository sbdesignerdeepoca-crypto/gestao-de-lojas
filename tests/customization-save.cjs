const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
async function check(file){
 const html=fs.readFileSync(__dirname+'/../'+file,'utf8');
 const compare=html.slice(html.indexOf('const missing='),html.indexOf('const captureStore='));
 const writer=html.slice(html.indexOf('async function writeStorefront'),html.indexOf('async function writeFinance'));
 const defaults={storeName:'AYE',heroTitle:'Bem-vindo',links:[]};
 let record={settings:{pix:'private-existing',shopWhatsApp:'5541',storefront:{storeName:'AYE',links:[{enabled:true,label:'WhatsApp',type:'whatsapp'}]}},other:'keep'};
 let owner={ownerUid:'me',subscriptionStatus:'active'},read=[],writes=0;
 const context={createDefaultStorefront:()=>structuredClone(defaults),shopRef:()=> 'shop',settingsRef:()=> 'settings',shopIsActive:s=>s.subscriptionStatus==='active',db:{},runTransaction:async(_,fn)=>{let pending;const value=await fn({get:async ref=>{read.push(ref);return {exists:()=>true,data:()=>structuredClone(ref==='shop'?owner:record)}},set:(ref,value)=>{assert.equal(ref,'settings');pending=value}});if(pending){record=structuredClone(pending);writes++}return value}};
 vm.createContext(context);vm.runInContext(compare+writer+';this.write=writeStorefront',context);
 const base={...defaults,links:[{type:'whatsapp',label:'WhatsApp',enabled:true}]},local=structuredClone(base);local.links.push({id:'instagram',type:'url',platform:'instagram',enabled:true,label:'Instagram',url:'https://www.instagram.com/ayeartigosreligiosos8/'});
 record.settings.storefront.heroTitle='Atualizado por outra sessão';record.settings.pix='new-pix';
 const result=await context.write('aye',{base,value:local},{uid:'me'});
 assert.equal(result.links[1].url,'https://www.instagram.com/ayeartigosreligiosos8/');assert.equal(record.settings.storefront.heroTitle,'Atualizado por outra sessão');assert.equal(record.settings.pix,'new-pix');assert.equal(record.other,'keep');assert.equal(read.includes('products'),false);
 const retryBase=structuredClone(result),retryLocal=structuredClone(result);retryLocal.links[1].label='Instagram AYE';
 record.settings.storefront.links[1].url='https://instagram.com/changed-elsewhere';
 const before=structuredClone(record),oldWrites=writes;
 await assert.rejects(()=>context.write('aye',{base:retryBase,value:retryLocal},{uid:'me'}),e=>e.code==='store/conflict'&&e.field==='links');assert.deepEqual(record,before);assert.equal(writes,oldWrites);
 owner.ownerUid='someone';await assert.rejects(()=>context.write('aye',{base,value:local},{uid:'me'}),e=>e.code==='permission-denied');
 // A failed save keeps a browser draft; success removes it and updates its baseline.
 const save=html.slice(html.indexOf('async function saveStorefront'),html.indexOf('function applyStorefront'));
 for(const fail of [true,false]){
  const storage=new Map(),messages=[];const c={storefrontEditBase:base,data:{settings:{storefront:structuredClone(local)}},storeId:'aye',customizationDraftKey:()=> 'draft',sessionStorage:{setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},previewStorefront:()=>{},persist:()=>{},applyStorefront:()=>{},document:{querySelector:()=>null,getElementById:()=>({textContent:''})},toast:m=>messages.push(m),window:{firebaseBridge:{saveStorefrontNow:async(slug,draft)=>{assert.equal(slug,'aye');assert.equal(draft.value.links[1].platform,'instagram');if(fail)throw Object.assign(Error('conflito'),{code:'store/conflict'});return result}}}};
  vm.createContext(c);vm.runInContext(save+';this.save=saveStorefront',c);await c.save();assert.equal(storage.has('draft'),fail);if(!fail)assert.equal(c.storefrontEditBase.links[1].url,result.links[1].url);
 }
 console.log('PASS',file,': Instagram saved, unrelated edits preserved, settings-only transaction, genuine link conflicts, owner authorization and draft recovery.');
}
(async()=>{for(const f of ['index.html','painel.html','cadastro.html'])await check(f)})().catch(e=>{console.error(e);process.exit(1)});
