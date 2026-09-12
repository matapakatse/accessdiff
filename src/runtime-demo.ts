import {readFile} from 'node:fs/promises';

type RouteResult={status:number;body?:unknown};
type Route=(request:{user?:{id:string};params:{id:string}},db:{invoice:{findUnique:()=>Promise<{id:string;customerId:string}>}})=>Promise<RouteResult>;

const actors=[
  {name:'Right customer',user:{id:'owner'}},
  {name:'Different customer',user:{id:'other'}},
  {name:'Not signed in',user:undefined},
] as const;

async function execute(name:string):Promise<number[]> {
  const source=await readFile(new URL(`../fixtures/invoice-${name}.txt`,import.meta.url),'utf8');
  const module=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`) as {getInvoice:Route};
  const statuses:number[]=[];
  for(const actor of actors){
    const result=await module.getInvoice(
      {user:actor.user,params:{id:'invoice-123'}},
      {invoice:{findUnique:async()=>({id:'invoice-123',customerId:'owner'})}},
    );
    statuses.push(result.status);
  }
  return statuses;
}

const base=await execute('fixed');
const vulnerable=await execute('vulnerable');
const repaired=await execute('fixed');
const helper=await execute('helper');

console.log('\nAccessDiff live demonstration: who can see this invoice?');
console.log('The program is making real requests against four safe sample versions of an invoice route.\n');
console.log('| Person requesting the invoice | Safe version | Safety check removed | Safety check restored | Safe helper |');
console.log('| --- | ---: | ---: | ---: | ---: |');
for(let index=0;index<actors.length;index++){
  console.log(`| ${actors[index]!.name} | ${base[index]} | ${vulnerable[index]} | ${repaired[index]} | ${helper[index]} |`);
}
console.log('\nWhat changed: when the safety check is removed, a different customer gets a successful response instead of being blocked.');
console.log('What fixes it: restoring the check, directly or through the safe helper, blocks that customer again.');
console.log('People who are not signed in stay blocked in every version.');
console.log('\nThis demonstration executes only the safe sample code included with AccessDiff.');
