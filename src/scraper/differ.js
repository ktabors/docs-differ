#! /usr/bin/env node

const rimraf = require('rimraf');
const {getUrls, logUsage, processArgs} = require('./args');
const {diffSites} = require('./screenDiff');
const {setupClusterAndCrawl} = require('./crawl');

// setting up the directories
const baselineDir = 'src/docs-differ/baseline';
const currentDir = 'src/docs-differ/current';
const diffDir = 'src/docs-differ/diff';

/**
 * Main execution loop:
 *   - gets the two URLs to diff
 *   - crawls and screenshots the two sites
 *   - runs the diff.
 */
(async () => {
  let exitCode = 0;
  console.time('executionTime');

  let argValues = processArgs();

  // delete previous crawls or exit if invalid commands are used
  if (!argValues.onlyRunDiff) {
    let urls = getUrls();
    if (urls.length === 1) {
      if (argValues.onlyCrawlBaseline && !argValues.skipCrawlDirectoryClean) {
        rimraf.sync(baselineDir);
      } else if (argValues.onlyCrawlCurrent && !argValues.skipCrawlDirectoryClean) {
        rimraf.sync(currentDir);
      } else if (!argValues.skipCrawlDirectoryClean) {
        logUsage();
        process.exit(1);
      }
    } else if (urls.length === 2 && !argValues.skipCrawlDirectoryClean) {
      rimraf.sync(baselineDir);
      rimraf.sync(currentDir);
    } else if (!argValues.skipCrawlDirectoryClean) {
      logUsage();
      process.exit(1);
    }

    // crawling sites
    await setupClusterAndCrawl({baselineDir, currentDir, urls, ...argValues});
  }

  // running the comparison of the screenshots
  if (!argValues.skipCrawlDirectoryClean) {
    rimraf.sync(diffDir);
  }
  await diffSites(baselineDir, currentDir, diffDir, argValues.verboseLogMessages);

  if (argValues.deleteBaselineCurrent) {
    rimraf.sync(baselineDir);
    rimraf.sync(currentDir);
  }

  console.timeEnd('executionTime');
  return exitCode;
})();
