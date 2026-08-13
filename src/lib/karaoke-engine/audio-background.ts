type AudioBackgroundWindow = Window & {
  __silentAudioLoop?: HTMLAudioElement;
  __audioKeepAliveContext?: AudioContext;
};

const KEEP_ALIVE_SOURCE = "/sound/allow-sound.mp3";

function getAudioWindow(): AudioBackgroundWindow | undefined {
  if (typeof window === "undefined") return undefined;
  return window as AudioBackgroundWindow;
}

/** Desktop browsers keep Web Audio alive without a looping media decoder. */
export function needsAudioKeepAlive(): boolean {
  const win = getAudioWindow();
  if (!win) return false;
  const navigatorWithHints = win.navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  if (navigatorWithHints.userAgentData?.mobile) return true;

  const userAgent = navigatorWithHints.userAgent;
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && navigatorWithHints.maxTouchPoints > 1)
  );
}

/**
 * Keeps a real media element playing a tiny silent MP3. Mobile Safari and
 * Android browsers are more reliable with a media resource than an empty
 * WebAudio graph when the page changes visibility.
 */
export function bindAudioKeepAlive(
  context: AudioContext,
  existingElement?: HTMLAudioElement
): HTMLAudioElement | undefined {
  const win = getAudioWindow();
  if (!win || context.state === "closed") return undefined;

  let element = existingElement ?? win.__silentAudioLoop;
  if (!element) {
    element = document.createElement("audio");
    element.setAttribute("playsinline", "");
    element.setAttribute("aria-hidden", "true");
    element.style.display = "none";
    document.body.appendChild(element);
    win.__silentAudioLoop = element;
  }

  if (
    win.__audioKeepAliveContext === context &&
    element.src &&
    !element.srcObject
  ) {
    return element;
  }

  const shouldResume = !element.paused;
  element.pause();
  element.srcObject = null;
  element.src = KEEP_ALIVE_SOURCE;
  element.loop = true;
  element.preload = "auto";
  element.setAttribute("playsinline", "");
  element.muted = false;
  element.volume = 0.05;
  element.load();
  win.__audioKeepAliveContext = context;

  if (shouldResume) void element.play().catch(() => undefined);
  return element;
}

export async function playAudioKeepAlive(): Promise<boolean> {
  const element = getAudioWindow()?.__silentAudioLoop;
  if (!element || !element.src) return false;
  if (!element.paused) return true;

  try {
    await element.play();
    return !element.paused;
  } catch {
    return false;
  }
}

export function pauseAudioKeepAlive(): void {
  getAudioWindow()?.__silentAudioLoop?.pause();
}

export function disposeAudioKeepAlive(): void {
  const win = getAudioWindow();
  const element = win?.__silentAudioLoop;
  if (!element) return;
  element.pause();
  element.removeAttribute("src");
  element.load();
  element.remove();
  if (win) {
    win.__silentAudioLoop = undefined;
    win.__audioKeepAliveContext = undefined;
  }
}
