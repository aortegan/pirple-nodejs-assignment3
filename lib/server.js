/*
 * Server-related tasks
 *
 */

// Dependencies
let http = require('http');
let https = require('https');
let url = require('url');
let StringDecoder = require('string_decoder').StringDecoder;
let path = require('path');
let util = require('util');
let fs = require('fs');

let config = require('./config');
let handlers = require('./handlers/main');
let helpers = require('./helpers');

let debug = util.debuglog('server');

// Instantiate the server object
let server = {};

// Instantiate the http server
server.httpServer = http.createServer((req,res)=>server.unifiedServer(req,res));

// Instantiate the https server
server.httpsServerOptions = {
	'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
	'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem')),
};
server.httpsServer = https.createServer(server.httpsServerOptions,(req,res)=>server.unifiedServer(req,res));

// Logic behind both http and https server
server.unifiedServer = (req,res)=>{
  // Get the url and parse it
  let parsedUrl = url.parse(req.url,true);

  // Get the path of the url
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g,'');

  // Get the query string as an object
  let queryStringObject = parsedUrl.query;

  // Get the HTTP method
  let method = req.method.toLowerCase();

  // Get the headers as an object
  let headers = req.headers;

  // Get the payload if any
  let decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data',(data)=>{
    buffer += decoder.write(data);
  });

  req.on('end',()=>{
    buffer += decoder.end();

    // Choose the handler this request should go. If none is found, choose the 404 not found handler
    let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handler.notFound;

    // Construct the data object to send to the handler
    let data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method' : method,
      'headers' : headers,
      'payload' : helpers.parseJsonToObject(buffer)
    };

    // Route the request to the handler specified by the router
    chosenHandler(data,(statusCode,payload)=>{
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to a string
      let payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type','application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, print green, otherwhise print red
      if(statusCode == 200){
        debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      } else {
        debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      }
    });

  });
};

// Define a request router
server.router = {
  'users' : handlers.users,
  'tokens' : handlers.tokens,
  'carts' : handlers.carts,
  'orders' : handlers.orders,
  'menu' : handlers.menu
};

// Start server
server.init = ()=>{
  // Start the http server
  server.httpServer.listen(config.httpPort,()=>{
    console.log('\x1b[34m%s\x1b[0m','Server listening on port ' + config.httpPort +', in ' + config.envName + ' mode');
  });

  // Start the https server
  server.httpsServer.listen(config.httpsPort,()=>{
    console.log('\x1b[35m%s\x1b[0m','Server listening on port ' + config.httpsPort +', in ' + config.envName + ' mode');
  });
};

// Test mailgun
//clientName,clientEmail,emailSubject,emailText,callback
// helpers.sendMailgunEmail('namehere','emailhere@gmail.com','mailgun test subject','This is a test',(err)=>{
// 	if(!err){
// 		debug('email sent!');
// 	} else {
// 		debug(err);
// 	}
// });

// Test stripe
// amount,currency,customer,description,callback
helpers.payWithStripe(2700,'usd','toni@aortegan.com','order_id-useremail-date',(err)=>{
		if(!err){
			debug('payment went through!');
		} else {
			debug(err);
		}
});

/*
 * EXPORT MODULE
 */
module.exports = server;
