import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseRoom, doAction, experience, initialState, isRoomOpen, readState, rooms } from '../app/pet/state.ts';

test('puff care accrues bounded, positive, non-destructive progress', () => {
  const petted = doAction(initialState, 'pet');
  const fed = doAction(petted, 'feed');
  const played = doAction(fed, 'play');
  assert.deepEqual([experience(initialState), experience(petted), experience(fed), experience(played)], [0, 1, 3, 6]);
  assert.deepEqual(played.counts, { pet: 1, feed: 1, play: 1 });
  const limit = { ...initialState, counts: { ...initialState.counts, feed: 99999 } };
  assert.equal(doAction(limit, 'feed').counts.feed, 99999);
});

test('rooms unlock at named thresholds; selection cannot bypass lock', () => {
  for (const room of rooms) {
    const exact = { ...initialState, counts: { ...initialState.counts, pet: room.threshold } };
    assert.ok(isRoomOpen(exact, room.id));
    assert.equal(chooseRoom(exact, room.id).room, room.id);
    if (room.threshold === 0) continue;
    const below = { ...initialState, counts: { ...initialState.counts, pet: room.threshold - 1 } };
    assert.equal(isRoomOpen(below, room.id), false);
    assert.equal(chooseRoom(below, room.id), below);
  }
});

test('saved room and care totals survive reload without time-based decay', () => {
  const oldSave = {
    ...initialState, room: 'night',
    counts: { pet: 12, feed: 6, play: 2 },
    lastVisited: '1992-01-01T00:00:00.000Z',
  };
  const restored = readState(JSON.stringify(oldSave));
  assert.deepEqual(restored.counts, oldSave.counts);
  assert.equal(restored.room, 'night');
  assert.equal(experience(restored), 30);
});

test('bad storage resets safely and impossible room falls back without losing valid totals', () => {
  for (const bad of [null, 'x', '[]', 'null', '{"version":2}', '{"version":1,"counts":{"pet":-3,"feed":1,"play":0}}',
    '{"version":1,"counts":{"pet":0,"feed":100000,"play":0}}']) {
    assert.equal(readState(bad), initialState);
  }
  const manipulated = { ...doAction(initialState, 'pet'), room: 'night' };
  assert.deepEqual(readState(JSON.stringify(manipulated)), doAction(initialState, 'pet'));
});
