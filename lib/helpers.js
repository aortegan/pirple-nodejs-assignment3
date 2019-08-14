/*
 * Helpers for various tasks
 *
 */

// Dependencies
let crypto = require('crypto');
let https = require('https');
let querystring = require('querystring');

let config = require('./config');

// container for helpers
let helpers = {};

// Create a SHA256 hash (already built in node module)
helpers.hash = (str)=>{
  if (typeof(str) == 'string' && str.length > 0) {
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
}

// parse a JSON string to an Object in all cases without throwing
helpers.parseJsonToObject = function(str) {
  try {
    var obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
}

// Create a string of random  alphanumeric characters, of a given length
helpers.createRandomString = function(strLength) {
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
    // Define all the possible characters that could go into the string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start final string
    var str = '';
    for (i = 1; i <= strLength; i++) {
      // Get a random character from the possibleCharacters string
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      // Append this character to the final string
      str += randomCharacter;
    }

    // Return the string
    return str;

  } else {
    return false;
  }
};

// Stripe payment
helpers.payWithStripe = (amount,currency,customer,description,callback)=>{
  // Validate the parameters
  amount = typeof(amount) == 'number' ? amount : false;
  currency = typeof(currency) == 'string' && currency.trim().length > 0 ? currency.trim() : false;
  customer = typeof(customer) == 'string' && customer.trim().length > 0 ? customer.trim() : false;
  description = typeof(description) == 'string' && description.trim().length > 0 ? description.trim() : false;

  if(amount && currency && description){
    // Configurate the request payload
    let payload = {
      'amount' : amount,
      'currency' : currency,
      'customer' : customer,
      'receipt_email' : customer,
      'source' : 'tok_amex',
      'description' : description
    };

    // Stringify payload
    let stringPayload = querystring.stringify(payload);

    // Configure the request string
    let requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.stripe.com',
      'method' : 'POST',
      'auth' : config.stripe.apiKey,
      'path' : '/v1/charges',
      'headers' : {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    let req = https.request(requestDetails,(res)=>{
      // Grab the status of the sent request
      let status = res.statusCode;

      // Call successfully if the request went through
      if(status == 200 || status == 201){
        callback(false);
      } else {
        callback('Status code returned was ' + status);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', function(e) {
      callback(e);
    });

    // Add the payload to the request
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    callback('Given parameters were missing or invalid');
  }
};

// curl https://api.stripe.com/v1/charges \
//   -u sk_test_x1M4oIEcCA6FpUdh4d1mVzYE: \
//   -d amount=2000 \
//   -d currency=usd \
//   -d source=tok_amex \
//   -d description="Charge for jenny.rosen@example.com"

// Send email with mailgun
helpers.sendMailgunEmail = (clientName,clientEmail,emailSubject,emailText,callback)=>{
  // Validate the parameters
  clientName = typeof(clientName) == 'string' && clientName.trim().length > 0 ? clientName.trim() : false;
  clientEmail = typeof(clientEmail) == 'string' && clientEmail.trim().length > 0 ? clientEmail.trim() : false;
  emailSubject = typeof(emailSubject) == 'string' && emailSubject.trim().length > 0 ? emailSubject.trim() : false;
  emailText = typeof(emailText) == 'string' && emailText.trim().length > 0 ? emailText.trim() : false;

  if(clientName && clientEmail && emailSubject && emailText){
    // Configurate the request payload sent to mailgun
    let payload = {
      'from' : config.mailgun.sender,
      'to' : clientEmail,
      'subject' : emailSubject,
      'text' : emailText
    };

    // Stringify payload
    let stringPayload = querystring.stringify(payload);

    // Configure the request string
    let requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.mailgun.net',
      'method' : 'POST',
      'auth' : 'api:'+config.mailgun.apiKey,
      'path' : '/v3/' + config.mailgun.domainName + '/messages',
      'headers' : {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    let req = https.request(requestDetails,(res)=>{
      // Grab the status of the sent request
      let status = res.statusCode;

      // Callback succesfully if the request went through
      if(status == 200 || status == 201){
        callback(false);
      } else {
        callback('Status code returned was ' + status);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', function(e) {
      callback(e);
    });

    // Add the payload to the request
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    callback('Given parameters were missing or invalid');
  }
};


/*
 * EXPORT MODULE
 */
module.exports = helpers;
