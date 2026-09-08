// Minimal browser harness, rebuilt after the scratchpad was cleared. Enough to load a page,
// measure it and take pictures - which is all the remaining checks need.
const { chromium } = require('playwright-core');
const fs = require('fs');

// forward slashes on purpose: in a single-quoted JS string '\P' collapses to 'P', which
// silently turned these into nonsense paths and sent Playwright looking for its own browser
const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '').replace(/\\/g, '/') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const CHROME = CANDIDATES.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function launch() {
  return chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none',
           '--disable-lcd-text', '--hide-scrollbars'],
  });
}

async function newCtx(browser, { width = 1440, height = 900, mobile = false } = {}) {
  return browser.newContext({
    viewport: { width, height }, userAgent: UA,
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1,
  });
}

module.exports = { launch, newCtx, UA, CHROME };
