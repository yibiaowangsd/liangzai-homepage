import { HybridDemo } from "./hybrid-engine.mjs";
const demo = new HybridDemo();
let busy = false;
self.onmessage = async (event) => {
  if (busy) return;
  busy = true;
  try {
    self.postMessage({ result: await demo.next(event.data.mode) });
  } catch (error) {
    demo.clear();
    self.postMessage({ error: String(error.message) });
  } finally {
    busy = false;
  }
};
