/** Keep the push visible when the GPU or the model loader is unavailable. */
export async function createAboutPushImage(host: HTMLElement, signal: AbortSignal) {
  signal.throwIfAborted();
  const image = document.createElement("img");
  image.className = "about-push__image";
  image.alt = "";
  image.src = "/assets/characters-v2/arsenal-liangzai-cutout.webp";
  host.append(image);
  try {
    await image.decode();
    signal.throwIfAborted();
  } catch (error) {
    image.remove();
    throw error;
  }
  const pose = { effort: 0, stride: 0, lean: 0, compression: 0, leftReach: 0, rightReach: 0, walking: 0 };
  return {
    pose,
    contactX: .82,
    render() {
      const step = Math.abs(Math.sin(pose.stride)) * pose.walking;
      image.style.transform = `translateY(${-step * 3}px) scaleX(-1) rotate(${-pose.lean * 26}deg) scaleY(${1 - pose.compression * .025})`;
    },
    dispose() { image.remove(); },
  };
}
