---
name: Browser verification on Replit
description: Distinguishing early blank snapshots from emulator boot failures and browser test environment issues.
---

Verify emulator startup with a browser assertion that waits for the app shell,
not only an immediate screenshot.

**Why:** The screenshot capture completed before asynchronous emulator and audio
initialization, showing a blank page without errors, while a longer browser
check and the production browser suite loaded successfully.

**How to apply:** When a snapshot is blank, inspect console errors and wait for
visible app controls in Playwright before treating it as an application defect.

Downloaded Playwright Chromium requires explicit Nix runtime libraries on Replit,
including `libgbm`; `mesa` alone did not supply the needed shared library.

**Why:** Browser tests initially failed before opening a page due to missing
shared libraries, not failed application assertions.

**How to apply:** Inspect the first browser launch error and install the matching
Nix libraries before diagnosing application behavior. Keep browser downloads
excluded from Git and publishing.
