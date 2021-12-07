const diffScreenshots = require('screenshots-diff').default;

/**
 * Calls the screenshot diff tool on the two directories and creates a json
 * report that is saved and logged.
 */
async function diffSites(baselineDir, currentDir, diffDir) {
  let jsonResult = {};
  console.log('running diffSites');
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

exports.diffSites = diffSites;
