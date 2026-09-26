import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
test('shared-source parameters resolve by label and never silently pick a different instance',()=>{
  const code=`import sys
sys.path.insert(0,'scripts')
from ngcc_instance import select_instance
rows=[('Garnet_512_Cap512','same/source'),('Garnet_1024','same/source')]
assert select_instance(rows,{'label':'Garnet_1024','source':'same/source/'})=='Garnet_1024'
assert select_instance([('alias','unique')],{'label':'catalog-name','source':'unique'})=='alias'
assert select_instance(rows,{'label':'missing','source':'absent'}) is None
try: select_instance(rows,{'label':'unknown','source':'same/source'})
except ValueError: pass
else: raise AssertionError('ambiguous instance was accepted')
print('ok')`;
  assert.equal(execFileSync('python3',['-B','-c',code],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'}).trim(),'ok');
});
