import assert from 'node:assert/strict';

// Model only. "generation" is the latest PPK in the modeled key lineage.
// Each scenario starts with an RFC 8784-established IKE SA and two Child SAs.
function initial(mode) {
  return { ikeControl: mode === '9867' ? 'P1' : 'none',
           ikeRoot: 'P1', childA: 'P1', childB: 'P1' };
}
function rekey(s, target, selection, required) {
  if (required && selection === null) return { state: {...s}, result: 'rejected' };
  const lineage = selection ?? s.ikeRoot;
  return { state: target === 'IKE' ? {...s, ikeControl: lineage, ikeRoot: lineage}
    : {...s, [target]: lineage}, result: selection ? 'fresh' : 'inherited' };
}
const baseline = initial('8784');
const scenarios = [
  ['8784 初始', baseline],
  ['9867 初始', initial('9867')],
  ['A 成功轮换 P2', rekey(baseline, 'childA', 'P2', true).state],
  ['IKE 成功轮换 P2', rekey(baseline, 'IKE', 'P2', true).state],
  ['无 P2，按兼容策略轮换 IKE', rekey(baseline, 'IKE', null, false).state],
  ['无 P2，按严格策略拒绝轮换', rekey(baseline, 'IKE', null, true).state],
];
const expected = [
  ['none','P1','P1','P1'], ['P1','P1','P1','P1'], ['none','P1','P2','P1'],
  ['P2','P2','P1','P1'], ['P1','P1','P1','P1'], ['none','P1','P1','P1'],
];
for (const [[name, state], want] of scenarios.map((s, i) => [s, expected[i]])) {
  assert.deepEqual(Object.values(state), want);
  console.log(name, ...Object.values(state));
}
assert.equal(rekey(baseline, 'IKE', null, true).result, 'rejected');
assert.equal(rekey(baseline, 'IKE', null, false).result, 'inherited');
const upgraded = rekey(baseline, 'IKE', 'P2', true).state;
assert.equal(rekey(upgraded, 'childB', null, false).state.childB, 'P2');
assert.equal(rekey(upgraded, 'childB', null, true).result, 'rejected');
console.log('10 model assertions passed');
