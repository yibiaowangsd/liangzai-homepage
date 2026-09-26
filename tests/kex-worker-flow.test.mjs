import test from 'node:test';
import assert from 'node:assert/strict';
import { NGCC_KEX_WASM } from '../public/pqc-practice/ngcc-kex-runtime.js';

// Exercise the actual browser worker handler and actual submitted WASM, with only
// the postMessage boundary adapted to Node. No protocol or material is mocked.
globalThis.self={};
let reply;
globalThis.postMessage=value=>{reply=structuredClone(value);};
await import('../public/pqc-practice/kex-worker.js');
async function command(data){reply=null;await self.onmessage({data});assert.ok(reply);return reply;}
async function okay(data){const r=await command(data);assert.equal(r.error,undefined);return r;}
async function initialized(){await okay({action:'init',id:'kex-02',index:0});}
async function publicInputs(){await okay({action:'public',side:0});await okay({action:'public',side:1});}

for(const [id,names] of Object.entries(NGCC_KEX_WASM))for(const [index,name] of names.entries())if(name){
  test(`${name}: local output must be explicitly sent; independent final keys match`,async()=>{
    const init=await okay({action:'init',id,index});
    const a=await okay({action:'public',side:0}),b=await okay({action:'public',side:1});
    assert.equal(a.message.fingerprint,init.materials[0].fingerprint);
    assert.equal(b.message.fingerprint,init.materials[3].fingerprint);
    for(let pass=1;pass<=init.passes;pass++){
      const local=await okay({action:'pass',pass});
      assert.equal(local.state.slot,pass%2?2:5);
      const delivered=await okay({action:'send',pass});
      assert.deepEqual(delivered.message,local.message,'sent packet must be the exact locally computed output');
    }
    const alice=await okay({action:'derive',side:0});
    const bob=await okay({action:'derive',side:1});
    assert.equal(bob.match,true);assert.equal(alice.secret.fingerprint,bob.secret.fingerprint);
  });
}
test('reject premature computation, invented send, unsent-round skip and premature derive',async()=>{
  await initialized();await okay({action:'public',side:0});
  assert.ok((await command({action:'pass',pass:1})).error);
  await initialized();await publicInputs();
  assert.ok((await command({action:'send',pass:1})).error);
  await initialized();await publicInputs();await okay({action:'pass',pass:1});
  assert.ok((await command({action:'pass',pass:2})).error);
  await initialized();await publicInputs();await okay({action:'pass',pass:1});
  assert.ok((await command({action:'derive',side:0})).error);
  await initialized();await publicInputs();await okay({action:'pass',pass:1});await okay({action:'send',pass:1});
  assert.ok((await command({action:'send',pass:1})).error);
  assert.ok((await command({action:'pass',pass:2})).error,'error resets the session');
});
