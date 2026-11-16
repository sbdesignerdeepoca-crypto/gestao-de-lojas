const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../painel.html','utf8');
const engine=html.slice(html.indexOf('// Three-way merge:'),html.indexOf('\nlet unsubFinance='));
const records=new Map();let calls=0;
const clone=x=>structuredClone(x);
const doc=(...parts)=>({path:parts.map(x=>typeof x==='object'?x.path:x).join('/')});
const snapshot=ref=>({exists:()=>records.has(ref.path),data:()=>clone(records.get(ref.path)),id:ref.path.split('/').pop()});
const context={console,crypto,JSON,Symbol,Object,Map,Set,Error,Number,Array,Date,
  db:'db',doc,shopRef:s=>doc('lojas',s),productsRef:s=>doc('lojas',s,'produtos'),
  settingsRef:s=>doc('lojas',s,'configuracoes','principal'),financeRef:s=>doc('lojas',s,'financeiro','privado'),financeMonthsRef:s=>doc('lojas',s,'financeiro','privado','meses'),
  remoteProducts:new Map(),remoteSettingsJson:'',safeJson:v=>JSON.stringify(v??null),
  currentUser:{uid:'owner'},ownerForCurrentShop:true,localDate:()=> '2026-11-16',
  stockOf:p=>p.stock??1,shopIsActive:s=>s.subscriptionStatus==='active',getDoc:async r=>snapshot(r),
  runTransaction:async(db,callback)=>{calls++;const pending=[];let writing=false;
    const tx={get:async r=>{assert.equal(writing,false,'reads precede writes');return snapshot(r)},set:(r,v)=>{writing=true;pending.push(()=>records.set(r.path,clone(v)))},update:(r,v)=>{writing=true;pending.push(()=>records.set(r.path,{...records.get(r.path),...clone(v)}))},delete:r=>{writing=true;pending.push(()=>records.delete(r.path))}};
    await callback(tx);for(const save of pending)save();
  }};
vm.createContext(context);vm.runInContext(engine+'\nthis.api={mergeChanges,writeData,writeFinance,recordSale};',context);
const {mergeChanges,writeData,writeFinance,recordSale}=context.api;
async function main(){
  assert.deepEqual(JSON.parse(JSON.stringify(mergeChanges({a:1,b:1},{a:2,b:1},{a:1,b:2}))),{a:2,b:2});
  assert.throws(()=>mergeChanges({a:1},{a:2},{a:3}),/outro aparelho/);
  assert.deepEqual(JSON.parse(JSON.stringify(mergeChanges([], [{id:'a',amount:10}], [{id:'b',amount:20}]))),[{id:'a',amount:10},{id:'b',amount:20}]);
  records.set('lojas/shop',{ownerUid:'owner',subscriptionStatus:'active'});
  const product={id:'p',name:'Peça',stock:2,status:'available',price:50};
  records.set('lojas/shop/produtos/p',product);records.set('lojas/shop/financeiro/privado',{costs:{p:20}});
  await recordSale('shop','p');await recordSale('shop','p');
  const ledgerPath='lojas/shop/financeiro/privado/meses/2026-11';
  assert.equal(records.get('lojas/shop/produtos/p').stock,0);
  assert.equal(records.get(ledgerPath).sales.length,2);
  assert.equal(records.get(ledgerPath).sales.reduce((n,x)=>n+x.amount-x.cost,0),60);
  await assert.rejects(()=>recordSale('shop','p'),/sem estoque/);
  assert.equal(records.get(ledgerPath).sales.length,2);
  const setting={settings:{name:'Loja',color:'gold'}};records.set('lojas/shop/configuracoes/principal',setting);
  const base={products:new Map([['p',JSON.stringify(product)]]),settings:JSON.stringify(setting)};
  await assert.rejects(()=>writeData('shop',{products:[{...product,stock:3}],settings:setting.settings},context.currentUser,base),/outro aparelho/);
  assert.equal(records.get('lojas/shop/produtos/p').stock,0);
  records.set('lojas/shop/produtos/remote',{id:'remote',stock:1});
  await writeData('shop',{products:[],settings:{...setting.settings,name:'Nova'}},context.currentUser,base);
  assert.ok(records.has('lojas/shop/produtos/remote'));
  assert.ok(records.has('lojas/shop/produtos/p'));
  // Stale financial save must preserve sales written since its baseline.
  const original=clone(records.get(ledgerPath));const financialBase={costs:{p:20},months:{'2026-11':original}};
  records.get(ledgerPath).sales.push({id:'remote-sale',amount:15,cost:5});
  await writeFinance('shop',{costs:{p:20},months:{'2026-11':{...original,expenses:[{id:'expense',amount:7}]}}},context.currentUser,financialBase);
  assert.equal(records.get(ledgerPath).sales.length,3);assert.equal(records.get(ledgerPath).expenses.length,1);
  // A cost edit preserves unrelated costs from another device.
  records.get('lojas/shop/financeiro/privado').costs.q=12;
  await writeFinance('shop',{costs:{p:25},months:financialBase.months},context.currentUser,financialBase);
  assert.deepEqual(records.get('lojas/shop/financeiro/privado').costs,{p:25,q:12});
  const stockExpression=html.match(/stock=data.products.filter\(p=>p.status!=="sold"\).reduce\(([^;]+?),0\)/)[0];
  const stockContext={data:{products:[{id:'a',status:'available',stock:3},{id:'b',status:'sold',stock:0}]},financeData:{costs:{a:20,b:30}},stockOf:p=>p.stock};
  vm.runInNewContext('let '+stockExpression+';result=stock',stockContext);assert.equal(stockContext.result,60);
  console.log('PASS: merge conflicts, independent edits, atomic sales, sold-out rejection, ledger preservation, cost isolation and stock quantity. Transactions:',calls);
}
main().catch(e=>{console.error(e);process.exitCode=1});
