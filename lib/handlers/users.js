/*
 * Users request handlers
 *
 */

// Dependencies
let _data = require('../data');
let helpers = require('../helpers');
let tokens = require('./tokens');

let users = (data,callback)=>{
  let acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    _users[data.method](data,callback);
  } else {
    // Method not allowed
    callback(405);
  }
}

// Container for the users submethods
let _users = {};

// Users - POST
// Required data: firstName, lastName, email, password, address, tosAgreement
// Optional data: role
_users.post = (data,callback)=>{
  // Check that all the required fields are filled out
  let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
  let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  let address = typeof(data.payload.address) == 'object' ? data.payload.address : false;
  let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  let role = typeof(data.payload.role) == 'string' && ['admin','user'].indexOf(data.payload.role) > -1 ? data.payload.role.trim() : 'user';

  // Check if email is valid
  // TODO: Verify email with Mailgun API, default to true for now
  let validEmail = true;

  if(validEmail){
    // Check if email is already registered
    _data.list('users',(err,emailsList)=>{
      if(!err && emailsList && emailsList.indexOf(email) == -1){
        if(firstName && lastName && email && password && address && tosAgreement){
          // Hash the password
          let hashedPassword = helpers.hash(password);

          if(hashedPassword){
            // Create the user object
            let userObject = {
              'firstName' : firstName,
              'lastName' : lastName,
              'email' : email,
              'hashedPassword' : hashedPassword,
              'address' : address,
              'role' : role,
              'tosAgreement' : tosAgreement
            };

            // Persist the user to the disk
            _data.create('users',email,userObject,(err)=>{
              if(!err){
                callback(200,userObject);
              } else {
                callback(500,{'Error' : 'Could not create the new user'});
              }
            });
          } else {
            callback(500,{'Error' : 'Could not hash the user\'s password'});
          }
        } else {
          callback(400,{'Error' : 'Missing required fields'});
        }
      } else {
        callback(400,{'Error': 'This email is already registered'});
      }
    });
  } else {
    callback(400,{'Error' : 'Email is not valid'});
  }
};

// Users - GET
// Required data: email
// Optional data: none
_users.get = (data,callback)=>{
  let email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;

  if(email){

    // Get the token from the headers
    let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

    // Verify the given token from the headers is valid for the email address
    tokens.verifyToken(token,email,(tokenIsValid)=>{
      if(tokenIsValid){
        _data.read('users',email,(err,data)=>{
          if(!err && data){
            // No need to send hashed password to the user. Delete it before sending the object
            delete data.hashedPassword;
            callback(200,data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in headers or token is invalid'});
      }
    });
  } else {
    callback(403,{'Error' : 'Missing email or required token in headers, or token is invalid'});
  }
};

// Users - PUT
// Required data: email
// Optional data: firstName, lastName, password, address, role (at least one must be specified)
_users.put = (data,callback)=>{
  // Check the required field
  let email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;

  // Check for the optional data
  let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  let address = typeof(data.payload.address) == 'object' ? data.payload.address : false;
  let role = typeof(data.payload.role) == 'string' && ['admin','user'].indexOf(data.payload.role) > -1 ? data.payload.role.trim() : 'user';

  // Get the token from the headers
  let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

  // Verify the given token from the headers is valid for the email address
  tokens.verifyToken(token,email,(tokenIsValid)=>{
    if(tokenIsValid){
      // Error if the email is invalid
      if(email){
        // Error if missing fields to update
        if(firstName || lastName || password || address || role){
          // Verify token

          // Lookup the user
          _data.read('users',email,(err,userData)=>{
            if(!err && userData){
              // Update the necessary fields
              if(firstName){
                userData.firstName = firstName;
              }
              if(lastName){
                userData.lastName = lastName;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
              if(address){
                userData.address = address;
              }
              if(role){
                userData.role = role;
              }
              // Store the new updates
              _data.update('users',email,userData,(err)=>{
                if(!err){
                  callback(200);
                } else {
                  console.log(err);
                  callback(500,{'Error' : 'Could not update the user'});
                }
              });
            } else {
              callback(400,{'Error' : 'The specified user does not exist'});
            }
          });
        } else {
          callback(400,{'Error' : 'Missing fields to update'});
        }
      } else {
        callback(400,{'Error' : 'Missing required field'});
      }
    } else {
      callback(403,{'Error' : 'Missing required token in headers or token is invalid'});
    }
  });
};

// Users - DELETE
// Required data: email
// Optional data: none
// TODO: delete all user related data (not orders)
_users.delete = (data,callback)=>{
  // Get required field
  let email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;

  // Get the token from the headers
  let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

  // Verify the given token from the headers is valid for the email address
  tokens.verifyToken(token,email,(tokenIsValid)=>{
    if(tokenIsValid){
      // Lookup the user
      _data.read('users',email,(err,userData)=>{
        if(!err && userData){
          // Delete the user
          _data.delete('users',email,(err)=>{
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not delete the specified user'});
            }
          })
        } else {
          callback(400,{'Error' : 'Could not find the specified user'});
        }
      });
    } else {
      callback(403,{'Error' : 'Missing required token in headers or token is invalid'});
    }
  });
};

/*
* EXPORT MODULE
*/
module.exports = users;
