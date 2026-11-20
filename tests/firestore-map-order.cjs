const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const file of ['index.html','painel.html','cadastro.html']){
const html=fs.readFileSync(__dirname+'/../'+file,'utf8'),ctx={};vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf("const missing="),html.indexOf("const captureStore="))+";this.api={mergeChanges,equal,missing}",ctx);
const {mergeChanges:merge,equal,missing}=ctx.api;
const base=[{type:'whatsapp',label:'Falar com a AYE',enabled:true}],remote=[{enabled:true,label:'Falar com a AYE',type:'whatsapp'}];
const local=[...base,{id:'instagram',type:'url',label:'Instagram',url:'https://instagram.com/aye',enabled:true}];
assert.equal(equal(base,remote),true);
assert.deepEqual(JSON.parse(JSON.stringify(merge(base,local,remote))),local);
const nested={settings:{storefront:{links:base,title:'AYE'},phone:'5541'}};
const reordered={settings:{phone:'5541',storefront:{title:'AYE',links:remote}}};
const edit=structuredClone(nested);edit.settings.storefront.links=local;
assert.deepEqual(JSON.parse(JSON.stringify(merge(nested,edit,reordered))),edit);
const different=structuredClone(nested);different.settings.phone='5542';
const combined=JSON.parse(JSON.stringify(merge(nested,edit,different)));assert.equal(combined.settings.phone,'5542');assert.deepEqual(combined.settings.storefront.links,local);
assert.throws(()=>merge(base,local,[{...base[0],label:'Outro nome'}]),e=>e.code==='store/conflict');
assert.equal(equal([1,2],[2,1]),false);assert.equal(equal({a:undefined},{}),false);assert.equal(equal(missing,{}),false);assert.equal(equal(null,{}),false);
assert.equal(equal([{id:'a',name:'one'}],[{name:'one',id:'a'}]),true);
assert.throws(()=>merge({stock:2},{stock:3},{stock:0}),e=>e.code==='store/conflict');
assert.throws(()=>merge({title:'AYE'},{title:'A'},{title:'B'}),e=>e.code==='store/conflict');
assert.equal(equal({a:0},{a:false}),false);
console.log('PASS',file,': map order, idless links, independent edits, array order and genuine conflicts.');
}
