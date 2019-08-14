/*
 * Crteate and export configuration variables
 *
 * NOTE : Duplicate this file and name it config.js
 *
 */

 // Container for all the environments
 let environments = {};

 // Staging (default) environment
 environments.staging = {
   'httpPort' : 3000,
   'httpsPort' : 3001,
   'envName' : 'staging',
   'hashingSecret' : 'thisIsASecret',
   'maxChecks' : 10,
   'stripe' : {
     'apiKey' : 'xxx'
   },
   'mailgun' : {
     'domainName' : 'xxx',
     'apiKey' : 'xxx',
     'sender' : 'xxx'
   }
 };

 // Production environment
 environments.production = {
   'httpPort' : 5000,
   'httpsPort' : 5001,
   'envName' : 'production',
   'hashingSecret' : 'thisIsAlsoASecret',
   'maxChecks' : 10,
   'stripe' : {
     'apiKey' : 'xxx',
     'publicKey' : 'xxx',
   },
   'mailgun' : {
     'domainName' : 'xxx',
     'apiKey' : 'xxx',
     'sender' : 'xxx'
   }
 };

 // Determine which environment was passed as a command-line argument
 let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

 // Check that the current environment is one of the environments above, if not, default to staging
 let environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

 /*
  * EXPORT MODULE
  */
module.exports = environmentToExport;
