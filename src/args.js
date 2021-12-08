// command line options
const baselineCommandParam = '-b';
const currentCommandParam = '-c';
const screenshotMaxCommandParam = '-s';
const disableMobileCommandParam = '-m';
const disableDesktopCommandParam = '-d';
const clusterSizeCommandParam = '-k';
const quietLoggingCommandParam = '-q';
const scrubHeaderCommandParam = '-h';

const defaultValues = {
  screenshotLimit: -1,
  disableDesktopScreenshots: false,
  disableMobileScreenshots: false,
  clusterMaxConcurrency: 10,
  verboseLogMessages: true,
  scrubHeader: false
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
  console.log(`Usage: 'node src/index.js ${baselineCommandParam} <baseline site url> ${currentCommandParam} <current site to diff against baseline url>'`);
  console.log(`Other options include ${disableMobileCommandParam}, ${disableDesktopCommandParam} and ${screenshotMaxCommandParam} <integer>`);
  console.log(`  ${disableMobileCommandParam} disable mobile screenshots, default false`);
  console.log(`  ${disableDesktopCommandParam} disable desktop screenshots, default false`);
  console.log(`  ${screenshotMaxCommandParam} limit screenshots taken for all possible to this number`);
  console.log(`  ${clusterSizeCommandParam} max cluster size for concurrency, default 10`);
  console.log(`  ${quietLoggingCommandParam} quiets some log messages`);
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
    clusterMaxConcurrency,
    disableMobileScreenshots,
    disableDesktopScreenshots,
    verboseLogMessages,
    scrubHeader
  } = defaultValues;

  if (myArgs.includes(screenshotMaxCommandParam)) {
    screenshotLimit = parseInt(myArgs[myArgs.indexOf(screenshotMaxCommandParam) + 1], 10);
    if (isNaN(screenshotLimit)) {
      logUsage();
      process.exit(1);
    } else if (screenshotLimit <= 0) {
      screenshotLimit = -1;
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
  if (myArgs.includes(scrubHeaderCommandParam)) {
    scrubHeader = true;
  }

  return {screenshotLimit, clusterMaxConcurrency, disableMobileScreenshots, disableDesktopScreenshots, verboseLogMessages, scrubHeader};
}

exports.getUrls = getUrls;
exports.logUsage = logUsage;
exports.processArgs = processArgs;
exports.defaultParamValues = defaultValues;
