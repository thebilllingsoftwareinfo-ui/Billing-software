// scripts/verify-category-ui.js
// UI verification of Business Category Settings page using puppeteer-core.
// Starts the dev server if needed, launches Chrome via manage‑chrome, navigates to the target page,
// performs UI checks, and outputs a structured summary.

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const puppeteer = require('puppeteer');
const fs = require('fs');
const { spawn } = require('child_process');
const { startChrome, getDebugEndpoint, stopChrome } = require('./manage-chrome');
// duplicate import removed

(async () => {
  // ---------- 1. Ensure the application server is running ----------
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const serverSummary = { server: 'FAIL' };
  async function isServerUp() {
    try {
      const res = await fetch(baseUrl, { timeout: 2000 });
      return res.ok;
    } catch (_) { return false; }
  }
  if (!(await isServerUp())) {
    console.log('[verify] Application server not running – starting via npm run dev');
    const dev = spawn('npm', ['run', 'dev'], { detached: true, stdio: 'ignore', shell: true });
    dev.unref();
    // Wait up to 30 s for the server to answer.
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      if (await isServerUp()) { break; }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  if (await isServerUp()) {
    serverSummary.server = 'PASS';
  } else {
    serverSummary.server = 'FAIL';
    console.error('Unable to start the application server');
  }

  await startChrome();
  const debugEndpoint = getDebugEndpoint();
  const summary = {
    ...serverSummary,
    pageLoad: 'FAIL',
    jewelleryVisible: 'FAIL',
    activeIndicator: 'FAIL',
    selectorInteraction: 'FAIL',
    saveApply: 'N/A',
    persistence: 'FAIL',
    consoleErrors: false,
    screenshotPath: null,
    errors: []
  };


  // Helper to record errors
  const addError = (msg) => summary.errors.push(msg);

  // Connect to Chrome debugging endpoint
  // Connect to the Chrome instance (already started).
  let browser;
  try {
    const res = await fetch(`${debugEndpoint}/json/version`);
    const { webSocketDebuggerUrl } = await res.json();
    browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  } catch (e) {
    addError('Failed to connect to Chrome via CDP: ' + e.message);
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }



  // Open a fresh page and perform login before navigating to the target UI.
  const page = await browser.newPage();
  const loginUrl = `${baseUrl}/login`;
  try {
    // Go to login page
    await page.goto(loginUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    // Wait for the login form inputs to appear
    await page.waitForSelector('input[type="email"], input[name="email"], input#email', { visible: true, timeout: 15000 });
    await page.waitForSelector('input[type="password"], input[name="password"], input#password', { visible: true, timeout: 15000 });
    // Fill in credentials (demo user)
    await page.type('input[type="email"], input[name="email"], input#email', 'demo@acmeindustrial.com', { delay: 50 });
    await page.type('input[type="password"], input[name="password"], input#password', 'Demo12345!', { delay: 50 });
    // Submit login form and wait for navigation
    const loginBtn = await page.$('button[type="submit"], button:has-text("Sign In"), button:contains("Sign In")');
    if (!loginBtn) {
      throw new Error('Login button not found');
    }
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
      loginBtn.click()
    ]);
    // Legacy login flow removed
    // After successful login, go to the Business Category Settings page
    const targetUrl = `${baseUrl}/settings?tab=category`;
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    summary.pageLoad = 'PASS';
  } catch (e) {
    addError('Navigation or login failed: ' + e.message);
    summary.pageLoad = 'FAIL';
  }

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  // Capture page errors (e.g., uncaught exceptions)
  page.on('pageerror', err => {
    addError('Page error: ' + err.message);
  });
  // Record final URL and title for debugging
  const finalUrl = page.url();
  const pageTitle = await page.title();
  summary.finalUrl = finalUrl;
  summary.pageTitle = pageTitle;

  // 3. Ensure the page is loaded
  // Navigation already performed above; no extra wait needed.

  // 4. Verify Jewellery & Gems card exists
  let jewelleryCard;
  try {
    const handle = await page.evaluateHandle(() => {
      const xpath = "//div[contains(., 'Jewellery & Gems')]";
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    });
    const element = handle.asElement();
    if (element) {
      summary.jewelleryVisible = 'PASS';
      jewelleryCard = element;
    } else {
      addError('Jewellery & Gems card not found.');
    }
  } catch (e) {
    addError('Error searching for Jewellery & Gems card: ' + e.message);
  }

  // 5. Check for active indicator (simple heuristic: class contains "active" or "selected")
  if (jewelleryCard) {
    try {
      const className = await (await jewelleryCard.getProperty('className')).jsonValue();
      if (className && /(active|selected)/i.test(className)) {
        summary.activeIndicator = 'PASS';
      } else {
        // Maybe an aria-selected attribute
        const aria = await (await jewelleryCard.getProperty('ariaSelected')).jsonValue();
        if (aria === 'true') {
          summary.activeIndicator = 'PASS';
        } else {
          addError('Active indicator not detected on Jewellery card.');
        }
      }
    } catch (e) {
      addError('Failed to read active state: ' + e.message);
    }
  }

  // 6. Click the card to open selector UI
  if (jewelleryCard) {
    try {
      await jewelleryCard.click({delay: 100});
      summary.selectorInteraction = 'PASS';
    } catch (e) {
      addError('Failed to click Jewellery card: ' + e.message);
    }
  }

  // 7. Look for a drawer or preview that appears (simple check for element containing "preview" or role dialog)
  let drawerVisible = false;
  try {
    await new Promise(r => setTimeout(r, 500)); // short wait for UI animation
    const drawer = await page.$('dialog, [role="dialog"], .drawer, .preview');
    if (drawer) drawerVisible = true;
  } catch (_) {}

  // 8. Find Save/Apply button
  let saveButton = null;
  try {
    const saveHandle = await page.evaluateHandle(() => {
      const xpath = "//button[contains(translate(., 'SAVEAPPLY', 'saveapply'), 'save') or contains(translate(., 'SAVEAPPLY', 'saveapply'), 'apply')]";
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return result.snapshotLength > 0 ? result.snapshotItem(0) : null;
    });
    const saveButton = saveHandle ? saveHandle.asElement() : null;
    if (saveButton) {
      summary.saveApply = 'PASS';
      await saveButton.click({delay: 100});
    } else {
      summary.saveApply = 'N/A';
    }
  } catch (e) {
    addError('Error clicking Save/Apply: ' + e.message);
    summary.saveApply = 'FAIL';
  }

  // 9. Reload the page
  try {
    await page.reload({waitUntil: 'networkidle0', timeout: 10000});
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    addError('Page reload failed: ' + e.message);
  }

  // 10. Verify persistence: check again for active indicator on Jewellery card
  try {
    const handle = await page.evaluateHandle(() => {
      const xpath = "//div[contains(., 'Jewellery & Gems')]";
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    });
    const postCard = handle.asElement();
    if (postCard) {
      const className = await (await postCard.getProperty('className')).jsonValue();
      if (className && /(active|selected)/i.test(className)) {
        summary.persistence = 'PASS';
      } else {
        const aria = await (await postCard.getProperty('ariaSelected')).jsonValue();
        if (aria === 'true') summary.persistence = 'PASS';
        else addError('Jewellery card not marked active after reload.');
      }
    } else {
      addError('Jewellery card missing after reload.');
    }
  } catch (e) {
    addError('Error during persistence check: ' + e.message);
  }

  

  // 11. Capture screenshot
  try {
    const screenshotPath = 'category-ui-verification.png';
    await page.screenshot({path: screenshotPath, fullPage: true});
    summary.screenshotPath = `file://${process.cwd().replace(/\\/g, '/').replace(' ', '%20')}/${screenshotPath}`;
  } catch (e) {
    addError('Screenshot failed: ' + e.message);
  }

  // 12. Console errors flag
  summary.consoleErrors = consoleErrors.length > 0;

  // Close connection (optional)
  // await browser.disconnect();

  // Ensure any lingering pages are closed.
  try { await page.close(); } catch (_) {}
  console.log(JSON.stringify(summary, null, 2));
  await stopChrome();
})();
