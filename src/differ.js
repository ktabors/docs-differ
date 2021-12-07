#! /usr/bin/env node

const {Cluster} = require('puppeteer-cluster');
const diffScreenshots = require('screenshots-diff').default;
const mkdirp = require('mkdirp');
const path = require('path');
const puppeteer = require('puppeteer');
const rimraf = require('rimraf');
const URL = require('url').URL;

const puppeteeriPhone11 = puppeteer.devices['iPhone 11'];

// setting up the directories
const baselineDir = './docs-differ/baseline';
const currentDir = './docs-differ/current';
const diffDir = './docs-differ/diff';

rimraf.sync(baselineDir);
rimraf.sync(currentDir);
rimraf.sync(diffDir);

// command line options
const baselineCommandParam = '-b';
const currentCommandParam = '-c';
const screenshotMaxCommandParam = '-s';
const disableMobileCommandParam = '-m';
const disableDesktopCommandParam = '-d';
const clusterSizeCommandParam = '-k';
const quietLoggingCommandParam = '-q';

let visitedBaseline = {};
let visitedCurrent = {};
let badUrls = [];

// global variables for args
let screenshotLimit = -1;
let disableDesktopScreenshots = false;
let disableMobileScreenshots = false;
let clusterMaxConcurrency = 10;
let verboseLogMessages = true;

// global cluster variable to avoid passing it around
let cluster;

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
    cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: clusterMaxConcurrency
    });

    // Event handler to catch and log cluster task errors
    cluster.on('taskerror', (err, data) => {
      console.log(`Error crawling ${data}: ${err.message}`);
    });

    // triggering the screenshot scrapping of the two sites
    await puppetUrl(urls[0], visitedBaseline, baselineDir);
    await puppetUrl(urls[1], visitedCurrent, currentDir);

    await cluster.idle();
    await cluster.close();
    console.log('queue empty and cluster closed');
    console.timeLog('executionTime');

    // running the comparison of the screenshots
    let diffResult = await diffSites();

    // URLs that might be bad
    if (badUrls.length > 0) {
      console.log('Are these URLs bad?', badUrls);
    }
  } catch (e) {
    exitCode = 1;
    throw e;
  } finally {
    // cluster cleanup in case there is an exception
    await cluster.idle();
    await cluster.close();
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
  console.log('  -k max cluster size for concurrency, default 10');
  console.log('  -q quiets some log messages');
}

/**
 * Set the command line args:
 *   - disable mobile screenshots
 *   - disable desktop screenshots
 *   - max number of screenshots
 */
function processArgs() {
  let myArgs = process.argv.slice(2);

  if (myArgs.includes(screenshotMaxCommandParam)) {
    screenshotLimit = parseInt(myArgs[myArgs.indexOf(screenshotMaxCommandParam) + 1], 10);
    if (isNaN(screenshotLimit)) {
      logUsage();
      process.exit(1)
    } else if (screenshotLimit <= 0) {
      screenshotLimit = -1;
    }
  }
  if (myArgs.includes(clusterSizeCommandParam)) {
    clusterMaxConcurrency = parseInt(myArgs[myArgs.indexOf(clusterSizeCommandParam) + 1], 10);
    if (isNaN(clusterMaxConcurrency)) {
      logUsage();
      process.exit(1)
    } else if (clusterMaxConcurrency <= 0) {
      clusterMaxConcurrency = 10;
    }
  }
  if (myArgs.includes(disableMobileCommandParam)) {
    disableMobileScreenshots = true;
  }
  if (myArgs.includes(disableDesktopCommandParam)) {
    disableDesktopScreenshots = true;
  }
  if (myArgs.includes(quietLoggingCommandParam)) {
    verboseLogMessages = false;
  }
}

/**
 * Gets the urls to compare from the command line args.
 */
function getUrls() {
  let myArgs = process.argv.slice(2);

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

  // last index is to create the root bath for CI urls
  let lastIndex = new URL(url).pathname.lastIndexOf('/');
  await walk(url, new URL(url).pathname.substring(0, lastIndex), visited, storageDirectory);
}

/**
 * Checks is a URL has been visited, if it hasn't it visits it and takes a
 * screenshot. Visiting also means getting all of its links and calling this
 * function, walk, on all the links that are within this site. It ignores
 * external links.
 */
async function walk(href, rootPath, visited, storageDirectory) {
  let url = new URL(href);
  url.hash = '';
  if (visited[url.pathname]) {
    return;
  }

  if (screenshotLimit !== -1 && Object.keys(visited).length >= screenshotLimit) {
    return;
  }

  /* two things
   * - for the CI builds we have extra pathname, this removes that
   * - the screenshot tool doesn't handle subdirectories so we include those in
   *   the file names with ~~ indicating where a directory slash was
   */
  let filename = url.pathname.replace(rootPath, '').slice(1).split('.')[0].replace('/', '~~');
  visited[url.pathname] = [`${filename}_desktop.png`, `${filename}_mobile.png`];

  await cluster.task(async ({ page, data: url }) => {
    await crawlPage(page, url);
  });

  // passing an object instead of a url string for all the params like storage
  // location, already visited and filename
  cluster.queue({
    filename: filename,
    rootPath: rootPath,
    storageDirectory: storageDirectory,
    url: url.toString(),
    visited: visited
  });
}

/**
 * moved the logic of page.goto, screenshot, and href walking out of walk()
 * because this was is the claster.task() logic and walk is cluster management
 * and checking if things are visited.
 */
async function crawlPage(page, {filename, rootPath, storageDirectory, url, visited}) {
  let hrefs = [];
  let i = 0;

  try {
    if (verboseLogMessages) {
      console.log('visiting: ', url);
    }
    let response = await page.goto(url);
    while (!response.ok() && i < 5) {
      if (verboseLogMessages) {
        console.log('trying again', url, filename, rootPath, storageDirectory);
      }
      let response = await page.goto(url);
      i++;
    }

    await screenshot(page, `${storageDirectory}/${filename}`);
  } catch (e) {
    console.log('error with screenshot: ', url.toString(), e);
  }

  hrefs = await page.$$eval('a[href]', as => as.map(a => a.href));

  let parentUrl = new URL(url).host;
  for (let href of hrefs) {
    let u = new URL(href, page.url());
    if (u.host === parentUrl) {
      // skip walking patterns of URLs that cause issues
      if ((rootPath.length > 0 && href.indexOf(rootPath) === -1) || u.pathname.indexOf('.html') === -1) {
        badUrls.push({
          parentUrl: url,
          badUrl: href
        })
      } else {
        await walk(href, rootPath, visited, storageDirectory);
      }
    }
  }
}

/**
 * Talks a full page screenshot of the current most common browser viewport and
 * a simulated iPhone 11 for the mobile rendering.
 */
async function screenshot(page, filename) {
  if (!disableDesktopScreenshots) {
    await page.setViewport({
      width: 1366,
      height: 784
    });
    // this seems to handle screenshot issues, might need to increase as we use this
    await page.waitForTimeout(100);

    await page.screenshot({
      path: `${filename}_desktop.png`,
      fullPage: true
    });
  }

  if (!disableMobileScreenshots) {
    await page.emulate(puppeteeriPhone11);

    await page.screenshot({
      path: `${filename}_mobile.png`,
      fullPage: true
    });
  }
}
