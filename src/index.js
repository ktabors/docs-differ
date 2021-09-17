var http = require("http");
const Pageres = require("pageres");

(async () => {
  await new Pageres({ delay: 2 })
    .src(
      "https://github.com/adobe/react-spectrum",
      ["480x320", "1024x768", "iphone 5s"],
      { crop: true }
    )
    .src("https://https://react-spectrum.adobe.com", ["1280x1024", "1920x1080"])
    .src("data:text/html,<h1>Awesome!</h1>", ["1024x768"])
    .dest(__dirname)
    .run();

  console.log("Finished generating screenshots!");
})();

//create a server object:
http
  .createServer(function (req, res) {
    res.write("Hello Candidate!!"); //write a response to the client
    res.end(); //end the response
  })
  .listen(8080); //the server object listens on port 8080
