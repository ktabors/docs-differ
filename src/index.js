var http = require("http");
const Pageres = require("pageres");
const diffScreenshots = require("screenshots-diff").default;
var fs = require("fs");

console.log('diffScreenshots', diffScreenshots);

var oldWebsite = __dirname + '/old';
var newWebsite = __dirname + '/new';
var diff = __dirname + '/diff';

if (!fs.existsSync(oldWebsite)){
    fs.mkdirSync(oldWebsite);
}
if (!fs.existsSync(newWebsite)){
    fs.mkdirSync(newWebsite);
}
if (!fs.existsSync(diff)){
    fs.mkdirSync(diff);
}


(async () => {
  let oldImageBuffer = await new Pageres({ delay: 2, filename: 'apple' })
    .src("https://react-spectrum.adobe.com", ["1280x3024"])
    .dest(oldWebsite)
    .run();

  let newImageBuffer = await new Pageres({ delay: 2, filename: 'apple' })
    .src("https://reactspectrum.blob.core.windows.net/reactspectrum/0d525b64b5f85f375c5477ee78a7287ff9b264f4/docs/architecture.html", ["1280x3024"])
    .dest(newWebsite)
    .run();

  console.log('__dirname', __dirname);
  console.log("Finished generating screenshots!", oldImageBuffer, newImageBuffer);

  await diffScreenshots(oldWebsite, newWebsite, diff, 0.03)
    .then(result => {
      if (result) {
        console.log("diff results", JSON.stringify(result, null, 1));
      }
    })
    .catch(err => {
      logError(`** ERROR ** ${err}`);
    });
})();
