#! /usr/bin/env node

const rimraf = require('rimraf');
const {getUrls, logUsage, processArgs} = require('./args');
const {diffSites} = require('./screenDiff');
const {setupClusterAndCrawl} = require('./crawl');

// setting up the directories
const baselineDir = 'docs-differ/baseline';
const currentDir = 'docs-differ/current';
const diffDir = 'docs-differ/diff';

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

  if (!argValues.rerunDiff) {
    let urls = getUrls();
    if (urls.length !== 2) {
      logUsage();
      process.exit(1);
    }

    // This was part of the setup before, moved after args because new args will keep these directories
    rimraf.sync(baselineDir);
    rimraf.sync(currentDir);
    rimraf.sync(diffDir);

    // crawling sites
    await setupClusterAndCrawl({baselineDir, currentDir, urls, ...argValues});
  } else {
    rimraf.sync(diffDir);
  }

  // running the comparison of the screenshots
  let diffResult = await diffSites(baselineDir, currentDir, diffDir);

  console.timeEnd('executionTime');
  return exitCode;
})();
