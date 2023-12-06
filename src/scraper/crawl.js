const {Cluster} = require('puppeteer-cluster');
const {defaultParamValues} = require('./args');
const mkdirp = require('mkdirp');
const path = require('path');
const puppeteer = require('puppeteer');
const URL = require('url').URL;

const puppeteeriPhone11 = puppeteer.devices['iPhone 11'];

// global cluster variable to avoid passing it around
let cluster;

let visitedBaseline = {};
let visitedCurrent = {};
let badUrls = [];

// global variables for args
let {
  screenshotLimit,
  screenshotDelayTime,
  disableDesktopScreenshots,
  disableMobileScreenshots,
  verboseLogMessages,
  scrubHeader
} = defaultParamValues;

/**
 * Setup puppeteer cluster for parallelization and crawl sites.
 */
async function setupClusterAndCrawl({baselineDir, currentDir, urls, ...argValues}) {
  screenshotLimit = argValues.screenshotLimit;
  screenshotDelayTime = argValues.screenshotDelayTime;
  disableDesktopScreenshots = argValues.disableDesktopScreenshots;
  disableMobileScreenshots = argValues.disableMobileScreenshots;
  verboseLogMessages = argValues.verboseLogMessages;
  scrubHeader = argValues.scrubHeader;

  try {
    // puppeteer cluster initialization and configuration
    cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: argValues.clusterMaxConcurrency
    });

    // Event handler to catch and log cluster task errors
    cluster.on('taskerror', (err, data) => {
      console.log(`Error crawling ${data}: ${err.message}`);
    });

    // triggering the screenshot scrapping of the two sites
    if (urls.length === 2 || (urls.length === 1 && argValues.onlyCrawlBaseline)) {
      await walkUrl(urls[0], visitedBaseline, baselineDir);
    }
    if (urls.length === 2) {
      await walkUrl(urls[1], visitedCurrent, currentDir);
    } else if (urls.length === 1 && argValues.onlyCrawlCurrent) {
      await walkUrl(urls[0], visitedCurrent, currentDir);
    }

    // puppetter cluser cleanup, shutdown cluster
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
}

/**
 * Figures out the root URI and recursively walks the site.
 */
async function walkUrl(url, visited, storageDirectory) {
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

  // check if we've already screenshot the page
  //   and check if we've looked for it with ot without an index.html as part of the path
  if (visited[url.pathname] || visited[url.pathname+'index.html'] || visited[url.pathname.replace('index.html', '')]) {
    return;
  }

  // stop visiting pages if the screenshot limit was reached
  if (screenshotLimit !== -1 && Object.keys(visited).length >= screenshotLimit) {
    return;
  }

  /* two things
   * - for the CI builds we have extra pathname, this removes that
   * - the screenshot tool doesn't handle subdirectories so we include those in
   *   the file names with ~~ indicating where a directory slash was
   */
  let filename;
  if (url.searchParams && url.searchParams.get('id')) {
    // filename for storybook crawls
    filename = url.searchParams.get('id');
  } else {
    // filename for react spectrum docs // adjusted to replaceAll because paths were more than two deep
    filename = url.pathname.replace(rootPath, '').slice(1).split('.')[0].replaceAll('/', '~~');
  }
  visited[url.pathname] = [`${filename}_desktop.png`, `${filename}_mobile.png`];

  // have the puppeteer cluster crawl the site
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
    // let response = await page.goto(url);
    await page.goto(url);

    // this is an attempt at revisiting bad urls
    // Note: this appears to not be needed or is called on bad urls, not failed attempts
    // while (!response.ok() && i < 5) {
    //   if (verboseLogMessages) {
    //     console.log('trying again', url, filename, rootPath, storageDirectory);
    //   }
    //   response = await page.goto(url);
    //   i++;
    // }

    // take mobile and/or desktop screenshot of the visited page
    await screenshot(page, `${storageDirectory}/${filename}`);
  } catch (e) {
    console.log('error with screenshot: ', url.toString(), e);
  }

  // gets links to crawl by collecting anchor tags
  hrefs = await page.$$eval('a[href]', as => as.map(a => a.href));

  // check all urls of a page to see if they are within the site and crawl/walk them
  let parentUrl = new URL(url).host;
  for (let href of hrefs) {
    let u = new URL(href, page.url());
    // only grab links for the site being scrapped
    if (u.host === parentUrl) {
      // skip walking patterns of URLs that cause issues
      if (rootPath.length > 0 && href.indexOf(rootPath) === -1) {
        badUrls.push({
          parentUrl: url,
          badUrl: href
        })
      } else /*if (u.pathname.indexOf('.html') === -1) {
        ////// trying to have the visited URLs check if the none index.html has already been visited
        // add index.html to the URL and let walk check if it has been visited already
        console.log('new code, is valid?', href + 'index.html');
        await walk(href + 'index.html', rootPath, visited, storageDirectory);
      } else*/ {

        // if (href.includes('ActionButton')) {
        //   console.log('figure out this URL: page url', url);
        //   console.log('figure out this URL: href', href);
        //   console.log('figure out this URL: rootPath', rootPath);
        //   //console.log('figure out this URL: visited', visited);
        //   console.log('figure out this URL: storageDirectory', storageDirectory);
        //   console.log('figure out this URL: u.host', u.host);
        //   console.log('figure out this URL: parentUrl', parentUrl);
        // }
        // if (href === `http://localhost:1234/react-spectrum`) {
        //   console.log('figure out this URL: page url', url);
        //   console.log('figure out this URL: href', href);
        //   console.log('figure out this URL: rootPath', rootPath);
        //   //console.log('figure out this URL: visited', visited);
        //   console.log('figure out this URL: storageDirectory', storageDirectory);
        //   console.log('figure out this URL: u.host', u.host);
        //   console.log('figure out this URL: parentUrl', parentUrl);
        // }

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
    await scrubInstallAndVersion(page);

    await page.setViewport({
      width: 1366,
      height: 784
    });

    // this seems to handle screenshot issues, might need to increase as we use this
    await page.waitForTimeout(screenshotDelayTime);

    await page.screenshot({
      path: `${filename}_desktop.png`,
      fullPage: true
    });
  }

  if (!disableMobileScreenshots) {
    // await page.emulate(puppeteeriPhone11);
    // trying values from Chrome emulation for iphone 14 pro max
    await page.setViewport({
      width: 430,
      height: 932
    });

    // This has to be called after the emulate to iPhone to work
    await scrubInstallAndVersion(page);

    await page.screenshot({
      path: `${filename}_mobile.png`,
      fullPage: true
    });
  }
}

/**
 * The version, install, and usage can be different between the baseline and current
 * so this will normalize to prevent false positives.
 */
async function scrubInstallAndVersion(page) {
  if (scrubHeader) {
    await page.evaluate(() => {
      // removing the install package name
      let install = document.body.querySelector('td code');
      if (install && install.innerHTML && install.innerHTML.includes && install.innerHTML.includes('yarn add') && install.parentElement.parentElement.firstChild.innerHTML.includes('install')) {
        install.innerHTML = 'yarn add';
        // end remove the install package name

        // removing the release version number
        let version = install.parentElement.parentElement.nextElementSibling;
        if (version && version.firstChild && version.firstChild.innerHTML && version.firstChild.innerHTML.includes('version')) {
          version.lastChild.innerHTML = '';
        }

        // removing the usage package name
        let usage = install.parentElement.parentElement.parentElement.lastChild;
        if (usage && usage.firstChild && usage.firstChild.innerHTML && usage.firstChild.innerHTML.includes('usage')) {
          usage.lastChild.innerHTML = usage.lastChild.innerHTML.substring(0, usage.lastChild.innerHTML.indexOf('\'')) + usage.lastChild.innerHTML.substring(usage.lastChild.innerHTML.lastIndexOf('\'') + 1);
        }
      }
    });
  }
}

exports.setupClusterAndCrawl = setupClusterAndCrawl;
