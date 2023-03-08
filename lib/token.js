import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { logger } from "./logger.js";

const DEV_HEADLESS = true;
const WAIT_AFTER_PAGE_LOAD = 10; // 10 seconds

export async function getAccessToken(microsoftUsername, microsoftPassword, maxPrewait = 600) {
  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch({ headless: DEV_HEADLESS, userDataDir: ".browser" });
  const page = await browser.newPage();

  try {
    // limit number of connections (to prevent detection)
    await page.setRequestInterception(true);
    page.on("request", async (request) => {
      if (request.resourceType() == "image") {
        await request.abort();
      } else {
        await request.continue();
      }
    });

    // wait for a random time before navigating to a new web page (to prevent detection)
    await sleep((Math.floor(Math.random() * maxPrewait) + 5) * 1000);

    await page.setViewport({ width: 1400, height: 800 });

    await page.goto("https://developer.microsoft.com/en-us/graph/graph-explorer");

    await sleep((Math.floor(Math.random() * 4) + WAIT_AFTER_PAGE_LOAD) * 1000);

    // accept cookies
    await safeClick(page, "#msccBannerV2 button:first-child", { timeout: 5000, ignorant: true });

    // check login status
    const isLoggedIn = await waitForText(page, "div > .ms-Label:nth-child(2)", "Personal", {
      ignorant: true,
    });

    if (!isLoggedIn) {
      // click sign in button
      await safeClick(page, "button[aria-label='Sign in']");

      // capture sing in popup
      const popup = await getPopup(browser, page);

      // type in email
      await safeType(popup, "input[type=email]", microsoftUsername);

      // submit email
      await safeClick(popup, "input[type=submit]");

      // type in password
      await safeType(popup, "input[type=password]", microsoftPassword);

      // submit password
      await safeClick(popup, "input[type=submit]", { postwait: 3000 });

      // decide to stay logged in
      await safeClick(popup, "input[type=submit]", { postwait: 3000 });

      // wait for authentication to finish
      await waitForText(page, "div > .ms-Label:nth-child(2)", "Personal");
    }

    // open access token tab
    await safeClick(page, "#Pivot64-Tab3 > span");

    // wait for token to render
    await page.waitForSelector("#access-token-tab label:last-child", { timeout: 10000 });

    // get token
    const token = await page.$eval(
      "#access-token-tab label:last-child",
      (element) => element.textContent
    );

    if (!DEV_HEADLESS) await sleep(30000);

    browser.close();
    return token;
  } catch (error) {
    await page.screenshot({
      path: ".data/error-" + moment().format("YYYY-MM-DD[T]HH-mm-ss") + ".png",
      fullPage: true,
    });
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safetyWrapper(
  page,
  selector,
  action,
  { prewait = 1000, timeout = 10000, ignorant = false, postwait = 100 } = {}
) {
  if (prewait) await sleep(prewait);
  try {
    await page.waitForSelector(selector, { timeout });
    await action();
  } catch (e) {
    logger.info("timeout exceeded for: " + selector);
    if (ignorant) return false;
    else throw e;
  }
  if (postwait) await sleep(prewait);
  return true;
}

function safeClick(page, selector, options) {
  logger.info("click: " + selector);
  return safetyWrapper(page, selector, () => page.click(selector), options);
}

function safeType(page, selector, text, options) {
  logger.info("type: " + selector);
  return safetyWrapper(page, selector, () => page.type(selector, text, { delay: 30 }), options);
}

async function getPopup(browser, page) {
  const pages = await browser.pages();
  if (pages[pages.length - 1] != page) return pages[pages.length - 1];

  // if page was not created until this moment then listen for creation
  return new Promise((resolve) =>
    browser.once("targetcreated", (target) => resolve(target.page()))
  );
}

async function waitForText(page, selector, text, { timeout = 10000, ignorant = false } = {}) {
  logger.info("waiting for text: " + text + " in: " + selector);
  await page.waitForSelector(selector, { timeout });

  // check later
  let startTime = Date.now();
  while (true) {
    const elementText = await page.$eval(selector, (element) => element.textContent);
    if (elementText == text) break;
    if (Date.now() - startTime >= timeout) {
      logger.info("timeout exceeded for text: " + text + " in: " + selector);
      if (ignorant) return false;
      else throw new Error("waitForText: timeout exceeded");
    }

    await sleep(200);
  }

  return true;
}
