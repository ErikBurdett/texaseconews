import { useEffect, useRef, useState } from "react";

// A separate document gives the vendor's polling timers and event handlers a
// real teardown when the reader changes tabs or leaves the page.
export function CryptoTicker() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    const timer = window.setTimeout(() => setStatus("failed"), 15_000);
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin ||
          event.data?.type !== "txbiz:crypto-widget") return;
      if (event.data.status === "ready" || event.data.status === "failed") {
        window.clearTimeout(timer);
        setStatus(event.data.status);
      }
    };
    window.addEventListener("message", receive);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", receive); };
  }, [attempt]);

  return <aside className="crypto-ticker" aria-label="Crypto ticker" aria-busy={status === "loading"}>
    {status === "failed" ? <div className="ticker-notice" role="status">
      <span>Crypto prices unavailable.</span>
      <button type="button" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Retry crypto</button>
    </div> : <>
      {status === "loading" ? <div className="ticker-notice ticker-loading" role="status">Loading crypto prices…</div> : null}
      <iframe key={attempt} ref={frame} title="Crypto price ticker" width="100%" height="50"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        srcDoc={`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>html,body{margin:0;background:#071329;color:white;overflow:hidden;height:50px} .livecoinwatch-widget-5{height:50px!important;min-height:50px!important;background:#071329!important}</style></head><body><div class="livecoinwatch-widget-5" lcw-base="USD" lcw-color-tx="#ffffff" lcw-marquee-1="coins" lcw-marquee-2="none" lcw-marquee-items="12"></div><script src="${window.location.origin}/widgets/crypto-frame.js"></script></body></html>`} />
    </>}
  </aside>;
}
