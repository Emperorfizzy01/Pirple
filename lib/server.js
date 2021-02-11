/*
*Server related task
*
*/
// Dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");
const handlers = require("./handlers");
const helpers = require("./helpers");
var path = require('path');var util = require('util');
var debug = util.debuglog('server');



// GET RID OF THIS
//helpers.sendTwilioSms('41512345678', 'Hello!', function(err) {
//   console.log('this was the error', err);
//});

// Instantiate the  server module object
var server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function(req, res) {
    server.unifiedServer(req, res)   
});

//Instantiate the HTTPS server
server.httpsServerOptions = {
   "key": fs.readFileSync(path.join(__dirname,"/../https/key.pem")),
   "cert": fs.readFileSync(path.join(__dirname,"/../https/cert.pem"))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
    server.unifiedServer(req, res)   
});

//All the server logic for both http and https server
server.unifiedServer = function(req, res) {
     // Get the url and parse it
     var parsedUrl = url.parse(req.url, true);

     // Get the path
     var path = parsedUrl.pathname;
     var trimmedPath = path.replace(/^\/+|\/+$/g,"");
 
     // Get the Query string as an object
     var queryStringObject = parsedUrl.query;
     //Get the HTTP Method
     var method = req.method.toLowerCase();
 
     // Get Header
     var headers = req.headers;
 
     //Get the payload,if any
     var decoder = new StringDecoder('utf-8');
     var buffer = "";
     req.on("data", function(data) {
         buffer += decoder.write(data);
     });
 
     req.on("end", function(){
         buffer += decoder.end();
 
    //Chose the handler the req shud go to.If none go to notFound handler
    var chosenHandler = typeof(server.router[trimmedPath]) !== "undefined" ? server.router[trimmedPath] :handlers.notFound
 
    //construct the data object to send the data
    var data = {
     "trimmedPath" : trimmedPath,
     "queryStringObject" : queryStringObject,
     "method" : method,
     "headers": headers,
     "payload" : helpers.parseJsonToObject(buffer)
    };
 
    //Route the request to the handle specified in the router
    chosenHandler(data, function(statusCode, payload) {
     statusCode = typeof(statusCode) == "number" ? statusCode : 200

 
     payload = typeof(payload) == "object" ? payload : {}
 
     //Convert the payload to string
     var payloadString = JSON.stringify(payload);

     
 
      // Return response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      // if the request is 200 print green otherwise print red
    //console.log("Request received on path " + trimmedPath + " with the method " + method + " with this query string param",queryStringObject);
    if(statusCode == 200) {
        debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+'/'+trimmedPath+' '+statusCode);
    } else {
        debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+'/'+trimmedPath+' '+statusCode);
    }
});
});
}



//Define a request router
server.router = {
    'ping' : handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
};

// Init Script
server.init = function() {
    // Start the HTTP server
    server.httpServer.listen(config.httpPort, function() {
       console.log('\x1b[36m%s\x1b[0m',"Server is listening on port " +config.httpPort);
});
    //Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, function() {
        console.log('\x1b[35m%s\x1b[0m',"Server is listening on port " +config.httpsPort);
});
}

module.exports = server;