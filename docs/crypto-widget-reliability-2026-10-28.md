# Crypto widget failure handling

LiveCoinWatch's public widget script calls its response callback with `null` on a non-200 XMLHttpRequest result, then the marquee callback reads `response.data` without checking for null. A network change or interrupted request therefore produces the reported uncaught TypeError.

Only the selected market widget now mounts. Crypto runs in a separate document so unmounting destroys its polling timers and callbacks. The frame reports script/runtime failures to the React parent, which removes it and shows an accessible unavailable/retry state. A 15-second deadline handles silent loading failures. Error handling is confined to this frame; host-page errors remain observable. No vendor code is copied into the application, and no global browser networking APIs are patched.

The parent validates both message origin and sending frame. The production CSP adds only same-origin frames; existing third-party allowlists and framing protection for the public site remain. The frame uses `srcDoc` with an external same-origin bootstrap script, so it does not require inline-script permission.

Six desktop/mobile browser checks cover lazy loading, interrupted requests, the vendor's null-data exception, successful retry, blocked scripts, timeout, tab cleanup and host-page error visibility. A separate check ran the actual downloaded vendor script against success and interrupted-request fixtures under the production CSP and X-Frame-Options. Both outcomes worked without uncaught exceptions. Browser network diagnostics may still report a real disconnection; the app cannot prevent an interrupted network connection.
