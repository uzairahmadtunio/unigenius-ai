// Guarded service worker registration for UniGenius AI.
// Only registers in production deployments — never in Lovable previews, iframes,
// dev, or when the user opts out via ?sw=off.

const SW_PATH = "/sw.js";

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isLovablePreviewHost(host: string): boolean {
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterMatching(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_PATH);
        })
        .map((r) => r.unregister().catch(() => false))
    );
  } catch {
    /* noop */
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const isProd = import.meta.env.PROD;
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const hasOptOut =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("sw") === "off";

  const refuse = !isProd || isInIframe() || isLovablePreviewHost(host) || hasOptOut;

  if (refuse) {
    await unregisterMatching();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch (err) {
    // Never break the app if SW fails
    console.warn("[PWA] Service worker registration failed:", err);
  }
}
