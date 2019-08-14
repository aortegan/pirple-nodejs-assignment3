/*
 * Primary file for the API
 *
 */

// Dependencies
var server = require('./lib/server');
var helpers = require('./lib/helpers');
//var workers = require('./lib/workers');

// Declare the application
let app = {};

// Init function
app.init = ()=>{
	// Start the server
	server.init();

	// Start the workers
	//workers.init();
};

// initialize the app
app.init();

// Export the module app
module.exports = app;
