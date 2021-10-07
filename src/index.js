const diffScreenshots = require('screenshots-diff').default;
const mkdirp = require('mkdirp');
const path = require('path');
const puppeteer = require('puppeteer');
const rimraf = require('rimraf');
const URL = require('url').URL;

const puppeteeriPhone11 = puppeteer.devices['iPhone 11'];

const baselineDir = 'dist/baseline';
const currentDir = 'dist/current';
const diffDir = 'dist/diff';

const baselineCommandParam = '-b';
const currentCommandParam = '-c';

rimraf.sync(baselineDir);
rimraf.sync(currentDir);
rimraf.sync(diffDir);

const visitedBaseline = {};
const visitedCurrent = {};

var limitWalk = 0;

(async () => {
  let exitCode = 0;
  console.time('executionTime');

  let urls = getUrls();
  if (urls.length !== 2) {
    console.log('Usage: \'node src/index.js -b <baseline site url> -c <current site to diff against baseline url>\'');
    return 1;
  }

  try {
    await puppetUrl(urls[0], visitedBaseline, baselineDir);
    limitWalk = 0;
    await puppetUrl(urls[1], visitedCurrent, currentDir);

    let diffResult = await diffSites();
  } catch (e) {
    exitCode = 1;
    throw e;
  }

  console.timeEnd('executionTime');
  return exitCode;
})();

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
    });

  return jsonResult;
}

async function puppetUrl(url, visited, storageDirectory) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  let lastIndex = new URL(url).pathname.lastIndexOf('/');
  await walk(page, url, new URL(url).pathname.substring(0, lastIndex), visited, storageDirectory);

  await browser.close();
}

async function walk(page, href, rootPath, visited, storageDirectory) {
  // this is to limit the runtime for dev
  limitWalk++;
  if (limitWalk >= 10) {
    return;
  }
  // end dev code block
  let url = new URL(href, page.url());
  url.hash = '';
  if (visited[url.pathname]) {
    return;
  }

  let filename = url.pathname.replace(rootPath, '').slice(1).split('.')[0].replace('/', '~~');
  visited[url.pathname] = [`${filename}_desktop.png`, `${filename}_mobile.png`];

  try {
    await page.goto(url.toString());
    await screenshot(page, filename, rootPath, storageDirectory);
  } catch (e) {
    console.log('error with screenshot: ', url.toString());
  }

  let hrefs = await page.$$eval('a[href]', as => as.map(a => a.href));
  console.log('hrefs', hrefs);

  for (let href of hrefs) {
    let u = new URL(href, page.url());
    if (u.host === url.host) {
      await walk(page, href, rootPath, visited, storageDirectory);
    }
  }
}

async function screenshot(page, filename, rootPath, storageDirectory) {
  mkdirp.sync(storageDirectory);

  await page.setViewport({
    width: 1366,
    height: 784
  });
  await page.waitForTimeout(100);

  await page.screenshot({
    path: `${storageDirectory}/${filename}_desktop.png`,
    fullPage: true
  });

  await page.emulate(puppeteeriPhone11);

  await page.screenshot({
    path: `${storageDirectory}/${filename}_mobile.png`,
    fullPage: true
  });
}
