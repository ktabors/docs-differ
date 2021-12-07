#! /usr/bin/env node

const {Cluster} = require('puppeteer-cluster');
const mkdirp = require('mkdirp');
const path = require('path');
const puppeteer = require('puppeteer');
const rimraf = require('rimraf');
const URL = require('url').URL;
const {defaultParamValues, getUrls, logUsage, processArgs} = require('./args');
const {diffSites} = require('./screenDiff');

const puppeteeriPhone11 = puppeteer.devices['iPhone 11'];

// setting up the directories
const baselineDir = 'docs-differ/baseline';
const currentDir = 'docs-differ/current';
const diffDir = 'docs-differ/diff';

let visitedBaseline = {};
let visitedCurrent = {};
let badUrls = [];

// global variables for args
let {
  screenshotLimit,
  disableDesktopScreenshots,
  disableMobileScreenshots,
  verboseLogMessages
} = defaultParamValues;

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

  let {...values} = processArgs();
  screenshotLimit = values.screenshotLimit;
  disableMobileScreenshots = values.disableMobileScreenshots;
  disableDesktopScreenshots = values.disableDesktopScreenshots;
  verboseLogMessages = values.verboseLogMessages;

  let urls = getUrls();
  if (urls.length !== 2) {
    logUsage();
    process.exit(1);
  }

  // This was part of the setup before, moved after args because new args will keep these directories
  rimraf.sync(baselineDir);
  rimraf.sync(currentDir);
  rimraf.sync(diffDir);

  try {
    cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: values.clusterMaxConcurrency
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

    // URLs that might be bad
    if (badUrls.length > 0) {
      console.log('Are these URLs bad?', badUrls);
    }
  } catch (e) {
    exitCode = 1;
    throw e;
  } finally {
    // cluster cleanup in case there is an exception
    (await cluster).idle();
    (await cluster).close();
  }

  // running the comparison of the screenshots
  let diffResult = await diffSites(baselineDir, currentDir, diffDir);

  console.timeEnd('executionTime');
  return exitCode;
})();


/**
 * Figures out the root URI and recursively walks the site.
 */
async function puppetUrl(url, visited, storageDirectory) {
  mkdirp.sync(storageDirectory);

  // last index is to create the root path for CI urls
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
