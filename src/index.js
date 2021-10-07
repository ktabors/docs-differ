#! /usr/bin/env node

const diffScreenshots = require('screenshots-diff').default;
const mkdirp = require('mkdirp');
const path = require('path');
const puppeteer = require('puppeteer');
const rimraf = require('rimraf');
const URL = require('url').URL;

const puppeteeriPhone11 = puppeteer.devices['iPhone 11'];

// setting up the directories
const baselineDir = 'docs-differ/baseline';
const currentDir = 'docs-differ/current';
const diffDir = 'docs-differ/diff';

rimraf.sync(baselineDir);
rimraf.sync(currentDir);
rimraf.sync(diffDir);

// command line options
const baselineCommandParam = '-b';
const currentCommandParam = '-c';
const screenshotMaxCommandParam = '-s';
const disableMobileCommandParam = '-m';
const disableDesktopCommandParam = '-d';

let visitedBaseline = {};
let visitedCurrent = {};

// global variables for args
let screenshotLimit = -1;
let screenshotsTaken = 0;
let disableDesktopScreenshots = false;
let disableMobileScreenshots = false;

/**
 * Main execution loop:
 *   - gets the two URLs to diff
 *   - crawls and screenshots them
 *   - runs the diff.
 */
(async () => {
  let exitCode = 0;
  console.time('executionTime');

  processArgs();

  let urls = getUrls();
  if (urls.length !== 2) {
    logUsage();
    return 1;
  }

  try {
    await puppetUrl(urls[0], visitedBaseline, baselineDir);
    console.timeLog('executionTime');
    screenshotsTaken = 0
    await puppetUrl(urls[1], visitedCurrent, currentDir);
    console.timeLog('executionTime');

    let diffResult = await diffSites();
  } catch (e) {
    exitCode = 1;
    throw e;
  }

  console.timeEnd('executionTime');
  return exitCode;
})();

// used in two places
function logUsage() {
  console.log('Usage: \'node src/index.js -b <baseline site url> -c <current site to diff against baseline url>\'');
  console.log('Other options include -m, -d and -s <integer>');
  console.log('  -m disable mobile screenshots, default false');
  console.log('  -d disable desktop screenshots, default false');
  console.log('  -s limit screenshots taken for all possible to this number');
}

/**
 * Set the command line args:
 *   - disable mobile screenshots
 *   - disable desktop screenshots
 *   - max number of screenshots
 */
function processArgs() {
  var myArgs = process.argv.slice(2);

  if (myArgs.includes(screenshotMaxCommandParam)) {
    screenshotLimit = parseInt(myArgs[myArgs.indexOf(screenshotMaxCommandParam) + 1], 10);
    if (isNaN(screenshotLimit)) {
      logUsage();
      process.exit(1)
    }
  }
  if (myArgs.includes(disableMobileCommandParam)) {
    disableMobileScreenshots = true;
  }
  if (myArgs.includes(disableDesktopCommandParam)) {
    disableDesktopScreenshots = true;
  }
}

/**
 * Gets the urls to compare from the command line args.
 */
function getUrls() {
  var myArgs = process.argv.slice(2);

  let urls = [];
  if (myArgs.includes(baselineCommandParam)) {
    urls.push(myArgs[myArgs.indexOf(baselineCommandParam) + 1]);
  }
  if (myArgs.includes(currentCommandParam)) {
    urls.push(myArgs[myArgs.indexOf(currentCommandParam) + 1]);
  }

  return urls;
}

/**
 * Calls the screenshot diff tool on the two directories and creates a json
 * report that is saved and logged.
 */
async function diffSites() {
  let jsonResult = {};
  await diffScreenshots(baselineDir, currentDir, diffDir, 0.03)
    .then(result => {
      if (result) {
        jsonResult = result;
        console.log("diff results", JSON.stringify(result, null, 1));
      }
    })
    .catch(err => {
      console.error(`** ERROR ** ${err}`);
    })

  return jsonResult;
}

/**
 * Sets up puppeteer and call walk which recursively walks the site.
 */
async function puppetUrl(url, visited, storageDirectory) {
  mkdirp.sync(storageDirectory);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  let lastIndex = new URL(url).pathname.lastIndexOf('/');
  await walk(page, url, new URL(url).pathname.substring(0, lastIndex), visited, storageDirectory);

  await browser.close();
}

/**
 * Checks is a URL has been visited, if it hasn't it visits it and takes a
 * screenshot. Visiting also means getting all of its links and calling this
 * function, walk, on all the links that are within this site. It ignores
 * external links.
 */
async function walk(page, href, rootPath, visited, storageDirectory) {
  let url = new URL(href, page.url());
  url.hash = '';
  if (visited[url.pathname]) {
    return;
  }

  if (screenshotLimit !== -1 && screenshotsTaken >= screenshotLimit) {
    return;
  }

  /* two things
   * - for the CI builds we have extra pathname, this removes that
   * - the screenshot tool doesn't handle subdirectories so we include those in
   *   the file names with ~~ indicating where a directory slash was
   */
  let filename = url.pathname.replace(rootPath, '').slice(1).split('.')[0].replace('/', '~~');
  visited[url.pathname] = [`${filename}_desktop.png`, `${filename}_mobile.png`];

  try {
    console.log('visiting', url.toString())
    await page.goto(url.toString());
    await screenshot(page, filename, storageDirectory);
    screenshotsTaken++;
  } catch (e) {
    console.log('error with screenshot: ', url.toString());
  }

  let hrefs = await page.$$eval('a[href]', as => as.map(a => a.href));
  // console.log('hrefs', hrefs);

  for (let href of hrefs) {
    let u = new URL(href, page.url());
    if (u.host === url.host) {
      await walk(page, href, rootPath, visited, storageDirectory);
    }
  }
}

/**
 * Talks a full page screenshot of the current most common browser viewport and
 * a simulated iPhone 11 for the mobile rendering.
 */
async function screenshot(page, filename, storageDirectory) {
  if (!disableDesktopScreenshots) {
    await page.setViewport({
      width: 1366,
      height: 784
    });
    // this seems to handle screenshot issues, might need to increase as we use this
    await page.waitForTimeout(100);

    await page.screenshot({
      path: `${storageDirectory}/${filename}_desktop.png`,
      fullPage: true
    });
  }

  if (!disableMobileScreenshots) {
    await page.emulate(puppeteeriPhone11);

    await page.screenshot({
      path: `${storageDirectory}/${filename}_mobile.png`,
      fullPage: true
    });
  }
}
