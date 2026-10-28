/* Runs only inside the crypto ticker frame. No page-wide error suppression. */
(() => {
  let failed = false;
  let ready = false;
  const report = status => parent.postMessage({ type: "txbiz:crypto-widget", status }, new URL(document.baseURI).origin);
  const fail = () => {
    if (failed) return;
    failed = true;
    report("failed"); // Parent removes the frame, including all vendor timers.
  };
  window.addEventListener("error", event => {
    if (event instanceof ErrorEvent || event.target instanceof HTMLScriptElement) {
      fail();
      event.preventDefault();
    }
  }, true);
  window.addEventListener("unhandledrejection", event => {
    fail();
    event.preventDefault();
  });
  window.addEventListener("offline", fail);
  const observer = new MutationObserver(() => {
    if (!failed && !ready && /\$\s*\d/u.test(document.body.textContent || "")) {
      ready = true;
      observer.disconnect();
      report("ready");
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  const script = document.createElement("script");
  script.src = "https://www.livecoinwatch.com/static/lcw-widget.js";
  script.async = true;
  script.onerror = fail;
  document.body.appendChild(script);
})();
