import puppeteer from "puppeteer";
import { logger } from "./logger.js";

const HEADLESS = true;

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

export async function getAccessToken(microsoftUsername, microsoftPassword) {
  const browser = await puppeteer.launch({ headless: HEADLESS, userDataDir: ".browser" });

  const page = await browser.newPage();

  await page.setViewport({ width: 1400, height: 800 });

  await page.goto("https://developer.microsoft.com/en-us/graph/graph-explorer");

  // accept cookies
  await safeClick(page, "#msccBannerV2 button:first-child", { timeout: 5000, ignorant: true });

  // in case user is already logged in
  const isLoggedIn = await waitForText(page, "div > .ms-Label:nth-child(2)", "Personal", {
    ignorant: true,
  });

  if (!isLoggedIn) {
    // click sign in button
    await safeClick(page, "button[aria-label='Sign in']");

    // capturing sing in popup
    const popup = await getPopup(browser, page);

    // typing in email
    await safeType(popup, "input[type=email]", microsoftUsername);

    // submiting email
    await safeClick(popup, "input[type=submit]");

    // typing in password
    await safeType(popup, "input[type=password]", microsoftPassword);

    // submiting password
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

  const token = await page.$eval(
    "#access-token-tab label:last-child",
    (element) => element.textContent
  );

  if (!HEADLESS) await sleep(30000);

  browser.close();
  return token;
}
