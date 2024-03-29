// command line options
const baselineCommandParam = '-b';
const currentCommandParam = '-c';
const screenshotMaxCommandParam = '-s';
const screenshotDelayTimeCommandParam = '-t';
const disableMobileCommandParam = '-m';
const disableDesktopCommandParam = '-d';
const clusterSizeCommandParam = '-k';
const quietLoggingCommandParam = '-q';
const onlyRunDiffCommandParam = '-r';
const scrubHeaderCommandParam = '-h';
const onlyCrawlBaselineCommandParam = '-u';
const onlyCrawlCurrentCommandParam = '-w';
const deleteBaselineCurrentCommandParam = '-f';
const skipCrawlDirectoryCleanCommandParam = '-z';
const helpCommandParam = '--help';

const defaultValues = {
  screenshotLimit: -1,
  screenshotDelayTime: 100,
  disableDesktopScreenshots: false,
  disableMobileScreenshots: false,
  clusterMaxConcurrency: 10,
  verboseLogMessages: true,
  onlyRunDiff: false,
  scrubHeader: false,
  onlyCrawlBaseline: false,
  onlyCrawlCurrent: false,
  deleteBaseline: false,
  skipCrawlDirectoryClean: false
};

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

// used in two places
function logUsage() {
  console.log(`Usage: 'yarn run-differ ${baselineCommandParam} <BASE_URL> ${currentCommandParam} <NEW_URL>'`);
  console.log(`Other options include:`);
  console.log(`  ${disableMobileCommandParam} disable mobile screenshots, default false`);
  console.log(`  ${disableDesktopCommandParam} disable desktop screenshots, default false`);
  console.log(`  ${onlyRunDiffCommandParam} run screen shot comparison without crawling sites, default false`);
  console.log(`  ${screenshotMaxCommandParam} limit screenshots taken for all possible to this number, default all screenshots`);
  console.log(`  ${screenshotDelayTimeCommandParam} time in milliseconds the crawler should wait before doing a screenshot, default 100ms`);
  console.log(`  ${clusterSizeCommandParam} max cluster size for concurrency, default 10`);
  console.log(`  ${quietLoggingCommandParam} quiets some runtime messaging, default false`);
  console.log(`  ${onlyCrawlBaselineCommandParam} crawl a new baseline, use be used in combination with ${baselineCommandParam} <BASE_URL>, does a diff after, default false`);
  console.log(`  ${onlyCrawlCurrentCommandParam} crawl a new current, use be used in combination with ${currentCommandParam} <NEW_URL>, does a diff after, default false`);
  console.log(`  ${deleteBaselineCurrentCommandParam} delete the baseline and current directorys after diffing, default false`);
  console.log(`  ${skipCrawlDirectoryCleanCommandParam} don't delete the screenshots in the crawl directories before running, default false`);
}

/**
 * Set the command line args:
 *   - disable mobile screenshots
 *   - disable desktop screenshots
 *   - max number of screenshots
 */
function processArgs() {
  let myArgs = process.argv.slice(2);
  let {
    screenshotLimit,
    screenshotDelayTime,
    clusterMaxConcurrency,
    disableMobileScreenshots,
    disableDesktopScreenshots,
    verboseLogMessages,
    onlyRunDiff,
    scrubHeader,
    onlyCrawlBaseline,
    onlyCrawlCurrent,
    deleteBaselineCurrent,
    skipCrawlDirectoryClean
  } = defaultValues;

  if (myArgs.includes(helpCommandParam)) {
    logUsage();
    process.exit(0);
  }
  if (myArgs.includes(screenshotMaxCommandParam)) {
    screenshotLimit = parseInt(myArgs[myArgs.indexOf(screenshotMaxCommandParam) + 1], 10);
    if (isNaN(screenshotLimit)) {
      logUsage();
      process.exit(1);
    } else if (screenshotLimit <= 0) {
      screenshotLimit = -1;
    }
  }
  if (myArgs.includes(screenshotDelayTimeCommandParam)) {
    screenshotDelayTime = parseInt(myArgs[myArgs.indexOf(screenshotDelayTimeCommandParam) + 1], 10);
    if (isNaN(screenshotDelayTime)) {
      logUsage();
      process.exit(1);
    } else if (screenshotDelayTime < 0) {
      screenshotDelayTime = 100;
    }
  }
  if (myArgs.includes(clusterSizeCommandParam)) {
    clusterMaxConcurrency = parseInt(myArgs[myArgs.indexOf(clusterSizeCommandParam) + 1], 10);
    if (isNaN(clusterMaxConcurrency)) {
      logUsage();
      process.exit(1);
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
  if (myArgs.includes(onlyRunDiffCommandParam)) {
    onlyRunDiff = true;
  }
  if (myArgs.includes(scrubHeaderCommandParam)) {
    scrubHeader = true;
  }
  if (myArgs.includes(onlyCrawlBaselineCommandParam)) {
    onlyCrawlBaseline = true;
  }
  if (myArgs.includes(onlyCrawlCurrentCommandParam)) {
    onlyCrawlCurrent = true;
  }
  if (myArgs.includes(deleteBaselineCurrentCommandParam)) {
    deleteBaselineCurrent = true;
  }
  if (myArgs.includes(skipCrawlDirectoryCleanCommandParam)) {
    skipCrawlDirectoryClean = true;
  }

  return {
    screenshotLimit,
    screenshotDelayTime,
    clusterMaxConcurrency,
    disableMobileScreenshots,
    disableDesktopScreenshots,
    verboseLogMessages,
    onlyRunDiff,
    scrubHeader,
    onlyCrawlBaseline,
    onlyCrawlCurrent,
    deleteBaselineCurrent,
    skipCrawlDirectoryClean
  };
}

exports.getUrls = getUrls;
exports.logUsage = logUsage;
exports.processArgs = processArgs;
exports.defaultParamValues = defaultValues;
