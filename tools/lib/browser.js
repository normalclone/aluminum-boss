// Finds the real Chrome on this machine and opens it for measurement.
//
// Forward slashes on purpose: inside a single-quoted JavaScript string '\P' collapses to 'P',
// which silently turned these paths into nonsense and sent Playwright hunting for its own
// browser download instead.
const { chromium } = require('playwright-core');
const fs = require('fs');

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '').replace(/\\/g, '/') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

const CHROME = CANDIDATES.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Headless is right for pixels and wrong for frame times.
 *
 * requestAnimationFrame throttles to about 1Hz on a page the compositor considers hidden, so a
 * timing run in a window that never came to the front reports roughly a second per frame on a
 * page that is completely healthy. Timing tools must pass { headless: false } and then call
 * page.bringToFront() and assert document.visibilityState before they trust a number.
 */
/**
 * @param scrollbars Keep them. Every measuring tool hides them - a scrollbar is a few pixels of
 *   noise down the edge of an otherwise identical screenshot - but a tool that RECORDS somebody
 *   scrolling needs them: the bar is how a viewer knows where they are in the page.
 */
async function launch({ headless = true, scrollbars = false } = {}) {
  if (!CHROME) throw new Error('Khong tim thay Chrome hay Edge tren may nay');
  const args = ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'];
  if (!scrollbars) args.push('--hide-scrollbars');
  return chromium.launch({ executablePath: CHROME, headless, args });
}

/**
 * @param video { dir } to record this context to a webm.
 *
 *   The size is forced to the viewport on purpose. Playwright's default fits the video inside
 *   800x800, so a 1440x900 window is written out at 800x500 - readable text becomes a smear, and
 *   nothing says a word about it. Recording starts the moment this returns, so sign in somewhere
 *   else and carry the cookies over, or the first seconds of the film are a login form.
 */
async function newCtx(browser, { width = 1440, height = 900, dpr = 1, mobile = false,
                                 video = null } = {}) {
  return browser.newContext({
    viewport: { width, height },
    userAgent: UA,
    deviceScaleFactor: dpr,
    isMobile: mobile,
    hasTouch: mobile,
    ...(video ? { recordVideo: { dir: video.dir, size: { width, height } } } : {}),
  });
}

/** Every timing tool calls this before measuring. Returns false if the page is not visible. */
async function focus(page) {
  await page.bringToFront();
  return (await page.evaluate(() => document.visibilityState)) === 'visible';
}

const wait = ms => new Promise(r => setTimeout(r, ms));

module.exports = { launch, newCtx, focus, wait, CHROME, UA };
