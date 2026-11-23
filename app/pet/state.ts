export const rooms = [
  { id: "meadow", name: "晨光草甸", threshold: 0, note: "在草坡等你，风很轻。" },
  { id: "tide", name: "果冻海岸", threshold: 6, note: "浪花带来一颗会发光的贝壳。" },
  { id: "ember", name: "橘子云屋", threshold: 15, note: "搬到暖橘色云层上看晚霞。" },
  { id: "night", name: "星光小站", threshold: 27, note: "留一盏灯，给下次来访的你。" },
] as const;

export type RoomId = (typeof rooms)[number]["id"];
export const actions = ["pet", "feed", "play"] as const;
export type Action = (typeof actions)[number];
export type PetState = {
  version: 1;
  counts: Record<Action, number>;
  room: RoomId;
};
export const storageKey = "liangzai-puff-pet-v1";
export const initialState: PetState = { version: 1, counts: { pet: 0, feed: 0, play: 0 }, room: "meadow" };
const limit = 99999;
const gains: Record<Action, number> = { pet: 1, feed: 2, play: 3 };

export function experience(state: PetState) {
  return actions.reduce((total, action) => total + state.counts[action] * gains[action], 0);
}

export function isRoomOpen(state: PetState, room: RoomId) {
  return rooms.some(item => item.id === room && experience(state) >= item.threshold);
}

export function chooseRoom(state: PetState, room: RoomId): PetState {
  return isRoomOpen(state, room) ? { ...state, room } : state;
}

export function doAction(state: PetState, action: Action): PetState {
  return { ...state, counts: { ...state.counts, [action]: Math.min(limit, state.counts[action] + 1) } };
}

export function readState(raw: string | null): PetState {
  if (!raw) return initialState;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || parsed.version !== 1) return initialState;
    if (!("counts" in parsed) || !parsed.counts || typeof parsed.counts !== "object") return initialState;
    const input = parsed.counts as Partial<Record<Action, unknown>>;
    const counts = { ...initialState.counts };
    for (const action of actions) {
      const value = input[action];
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > limit) return initialState;
      counts[action] = value;
    }
    const state = { ...initialState, counts };
    const room = "room" in parsed ? rooms.find(item => item.id === parsed.room) : undefined;
    return room ? chooseRoom(state, room.id) : state;
  } catch {
    return initialState;
  }
}
