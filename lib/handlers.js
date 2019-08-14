/*
 * Request handlers
 *
 */

// Dependencies
let _data = require('./data');
let helpers = require('./helpers');
let config = require('./config');

var util = require('util');
var debug = util.debuglog('server');

// Define handlers object
let handlers = {};

/*
 * USERS
 */
handlers.users = (data,callback)=>{
  let acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._users[data.method](data,callback);
  } else {
    // Method not allowed
    callback(405);
  }
}

// Container for the users submethods
handlers._users = {};

// Users - POST
// Required data: firstName, lastName, email, password, address, tosAgreement
// Optional data: role
handlers._users.post = (data,callback)=>{
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
handlers._users.get = (data,callback)=>{
  let email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;

  if(email){

    // Get the token from the headers
    let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

    // Verify the given token from the headers is valid for the email address
    handlers._tokens.verifyToken(token,email,(tokenIsValid)=>{
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
handlers._users.put = (data,callback)=>{
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
  handlers._tokens.verifyToken(token,email,(tokenIsValid)=>{
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
handlers._users.delete = (data,callback)=>{
  // Get required field
  let email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;

  // Get the token from the headers
  let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

  // Verify the given token from the headers is valid for the email address
  handlers._tokens.verifyToken(token,email,(tokenIsValid)=>{
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
 * TOKENS
 */
handlers.tokens = (data,callback)=>{
  let acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._tokens[data.method](data,callback);
  } else {
    // Method not allowed
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - POST
// Required data: email and password
// Optional data: none
handlers._tokens.post = (data,callback)=>{
  // Get required data
  let email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email : false;
  let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password : false;

  if(email && password){
    // Hash the sent password and compare it to the user's one
    _data.read('users',email,(err,userData)=>{
      if(!err && userData){
        let hashedPassword = helpers.hash(password);

        if(hashedPassword == userData.hashedPassword){
          // If valid email and password, proceed to create a token
          let tokenId = helpers.createRandomString(20);
          // Token expires in 24h
          let expires = Date.now() + 1000 * 60 * 60 * 24;
          // Object to be stored
          let tokenObject = {
            'email' : email,
            'id' : tokenId,
            'expires' : expires
          };
          // Persist object to disk
          _data.create('tokens',tokenId,tokenObject,(err)=>{
            if(!err){
              callback(200);
            } else {
              callback(400,{'Error' : 'Could not create the new token'});
            }
          });
        } else {
            callback(400,{'Error' : 'Password did not match the user\'s stored password'});
        }
      } else {
        callback(400,{'Error': 'Could not find the specified user'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }
};

// Tokens - GET
// Required data: id
// Optional data: none
handlers._tokens.get = (data,callback)=>{
  // Get required data
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    // Send the information to the requestor
    _data.read('tokens',id,(err,data)=>{
      if(!err && tokenData){
        callback(200,tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Tokens - PUT
// Required data: id and extend
// Optional data:
handlers._tokens.put = (data,callback)=>{
  // Get required data
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id : false;
  let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

  // Lookup for the token
  if(id && extend){
    _data.read('tokens',id,(err,tokenData)=>{
      if(!err && tokenData){
        if(tokenData.expires > Date.now()){
          // Set the expiration 24h from now
          tokenData.expires = Date.now() + 1000 * 60 * 60 * 24;
          // Store the new update
          _data.update('tokens',id,tokenData,(err)=>{
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not update the token expiration'});
            }
          });
        } else {
          callback(400,{'Error' : 'The token has already expired and cannot be extended'})
        }
      } else {
        callback(404,{'Error' : 'The specified token does not exist'});
      }
    });
  } else {
    callback(400,{"Error" : "Missing required field(s) or field(s) are invalid"});
  }
};

// Tokens - DELETE
// Required data: id
// Optional data: none
handlers._tokens.delete = (data,callback)=>{
  // Get required fields
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    // Lookup the token
    _data.read('tokens',id,(err,data)=>{
      if(!err && data){
        _data.delete('users',id,(err)=>{
          if(!err){
            callback(200);
          } else {
            callback(500,{'Error' : 'Could not delete the specified token'});
          }
        });
      } else {
        callback(400,{'Error' : 'Could not find the specified token'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }
};

// Verify if a given token is valid for an email address
handlers._tokens.verifyToken = (id,email,callback)=>{
  // Lookup the token
  _data.read('tokens',id,(err,tokenData)=>{
    if(!err && tokenData){
      // Token is valid for the given user and is not expired
      if(tokenData.email == email && tokenData.expires > Date.now()){
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Get the role of a user for a given token
handlers._tokens.getRole = (id,callback)=>{
  // Lookup the token
  _data.read('tokens',id,(err,tokenData)=>{
    if(!err && tokenData){
      // Lookup the user
      _data.read('users',tokenData.email,(err,userData)=>{
        if(!err && userData){
          callback(userData.role);
        } else {
          callback(false);
        }
      });
    } else {
      callback(false);
    }
  });
};

/*
 * CARTS
 */
handlers.carts = (data,callback)=>{
  let acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._carts[data.method](data,callback);
  } else {
    // Method not allowed
    callback(405);
  }
};

// Container for the carts submethods
handlers._carts = {};

// Carts - POST
// Required data: items
// Optional data: none
// Info: 1 cart per user allowed
handlers._carts.post = (data,callback)=>{
  // Get required data
  let items = typeof(data.payload.items) == 'object' && data.payload.items.length > 0 ? data.payload.items : false;

  // Get the token from the headers
  let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;


  _data.read('tokens',token,(err,tokenData)=>{
    if(!err && tokenData){
      let userEmail = tokenData.email;

      // Lookup the user
      _data.read('users',userEmail,(err,userData)=>{
        if(!err && userData){
          let userCart = typeof(userData.cart) == 'string' && userData.cart.trim().length == 20 ? userData.cart.trim() : false;
          // If user has not a cart, create one and associate it to the user
          if(!userCart){
            // Create a cart to be stored
            let cartid = helpers.createRandomString(20);

            // Create the cart
            let cartObject = {};
            cartObject.id = cartid;
            cartObject.email = userData.email;
            cartObject.items = items;

            // Create a cart with the items in the payload
            _data.create('carts',cartid,cartObject,(err)=>{
              if(!err){
                // Add cartid to user object and persist

                userData.cart = cartid;

                // Update user
                _data.update('users',userData.email,userData,(err)=>{
                  if(!err){
                    callback(200);
                  } else {
                    callback(500,{'Error' : 'Could not update the user with the new cart'});
                  }
                });
              } else {
                callback(500,{'Error' : 'Could not create the cart'});
              }
            });
          } else {
            callback(400,{'Error' : 'This user has already a cart'});
          }
        } else {
          callback(403);
        }
      });
    } else {
      callback(403);
    }
  });
};

// Carts - GET
// Required data: id
// Optional data: none
handlers._carts.get = (data,callback)=>{
  // Get required fields
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;

  if(id){
    // Lookup the cart
    _data.read('carts',id,(err,cartData)=>{
      if(!err && cartData){
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify the token from the headers belongs to the user who created the cart
        handlers._tokens.verifyToken(token,cartData.email,(tokenIsValid)=>{
          if(tokenIsValid){
            callback(200,cartData.items);
          } else {
            callback(403);
          }
        });

      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Carts - PUT
// Required data: id and item
// Optional data: none
handlers._carts.put = (data,callback)=>{
  // Get required fields
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  let item = typeof(data.payload.item) == 'object' ? data.payload.item : false;

  if(id && item){

    // Get the token from the headers
    let token = typeof(data.headers.token) == 'string' ? data.headers.token.trim() : false;

    _data.read('tokens',token,(err,tokenData)=>{
      if(!err && tokenData){
        let userEmail = tokenData.email;

        // Lookup the user
        _data.read('users',userEmail,(err,userData)=>{
          if(!err && userData){
            // Get user's cart
            let userCart = typeof(userData.cart) == 'string' && userData.cart.trim().length == 20 ? userData.cart.trim() : false;

            // If user has a cart, continue
            if(userCart){
              // Lookup for the cart
              _data.read('carts',id,(err,cartData)=>{
                if(!err && cartData){
                  // Lookup for the item to be updated
                  let itemId = item.id;
                  let itemToUpdateIndex = cartData.items.findIndex(item => item.id == itemId);

                  if(itemToUpdateIndex > -1){
                    // If item is found, replace it with the new one
                    cartData.items[itemToUpdateIndex] = item;
                  } else {
                    // If item not found, means it doesn't exist in the cart, so we can add it
                    cartData.items.push(item);
                  }
                  // Update the cart
                  _data.update('carts',id,cartData,(err)=>{
                    if(!err){
                      callback(200);
                    } else {
                      callback(400,{'Error' : 'Could not update the cart'});
                    }
                  });
                } else {
                  callback(400,{'Error' : 'Could not find the specified cart'});
                }
              });

              // Check if the cart to be modified belongs the user
              if(id == userCart){

              } else {
                callback(400,{'Error' : 'The cart to be modified does not belong to this user'},);
              }
            } else {
              callback(400,{'Error' : 'This user does not have a cart'});
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Carts - DELETE
// Required data: id
// Optional data: none
handlers._carts.delete = (data,callback)=>{
  // Get required fields
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    // Lookup the cart
    _data.read('carts',id,(err,cartData)=>{
      if(!err && cartData){
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token from the headers is valid for the email address
        handlers._tokens.verifyToken(token,cartData.email,(tokenIsValid)=>{
          if(tokenIsValid){
            // Delete the cart data
            _data.delete('carts',id,(err)=>{
              if(!err){
                // Lookup the user
                _data.read('users',cartData.email,(err,userData)=>{
                  if(!err && userData){
                    // Remove cart id from user object and update the user
                    userData.cart = "";
                    _data.update('users',userData.email,userData,(err)=>{
                      if(!err){
                        callback(200);
                      } else {
                        callback(500,{'Error' : 'Could not update the user'});
                      }
                    });
                  } else {
                    callback(500,{'Error' : 'Could not find the user who created the cart, could not delete the cart from the user object'});
                  }
                });
              } else {
                callback(500,{'Error' : 'Could not delete the cart data'});
              }
            });
          } else {
            callback(403,{'Error' : 'Missing required token in headers or token is invalid'});
          }
        });
      } else {
        callback(400,{'Error' : 'The specified cart does not exist'})
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

/*
 * ORDERS
 */
handlers.orders = (data,callback)=>{
 let acceptableMethods = ['post','get','put','delete'];
 if(acceptableMethods.indexOf(data.method) > -1){
   handlers._orders[data.method](data,callback);
 } else {
   // Method not allowed
   callback(405);
 }
};

 // Container for the carts submethods
 handlers._orders = {};

// Orders - POST
// Required data: cartId,stripeId
// Optional data: deliveryTime
// TODO: add stripe transaction id
// TODO: notify user by email from yourpizza@sandbox123.mailgun.org
handlers._orders.post = (data,callback) =>{
  // Get required fields
  let cartId = typeof(data.payload.cartId) == 'string' && data.payload.cartId.trim().length == 20 ? data.payload.cartId.trim() : false;
  //let transactionId = typeof(data.payload.transactionId) == 'string' && data.payload.transactionId.trim().length > 0 ? data.payload.transactionId.trim() : false;
  let transactionId = helpers.createRandomString(20);

  if(cartId && transactionId){

    // Lookup the cart
    _data.read('carts',cartId,(err,cartData)=>{
      if(!err && cartData){
        // Lookup the user
        _data.read('users',cartData.email,(err,userData)=>{
          if(!err && userData){
            // Get user previous orders if any
            let userOrders = typeof(userData.orders) == 'object' && userData.orders instanceof Array ? userData.orders : [];
            // Verify the token from the headers
            let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

            // Verify the given token from the headers is valid for the email address
            handlers._tokens.verifyToken(token,userData.email,(tokenIsValid)=>{
              if(tokenIsValid){
                // Built the order object
                let orderObject = {};

                orderObject.id = helpers.createRandomString(20);
                orderObject.firstName = userData.firstName;
                orderObject.lastName = userData.lastName;
                orderObject.email = userData.email;
                orderObject.address = userData.address;
                orderObject.items = cartData.items;

                // Calculate total amout of the orderObject
                orderObject.total = 0;

                // Get transaction id from stripe
                orderObject.stripeTransactionId = transactionId;

                orderObject.date = Date.now();
                orderObject.status = 'preparing';

                // Persist data to disk
                _data.create('orders',orderObject.id,orderObject,(err)=>{
                  if(!err){
                    // Update user object with new order
                    userData.orders = userOrders;
                    userData.orders.push(orderObject.id);

                    // Send email notification to user
                    let emailSubject = 'PizzaPizza : Your order ' + orderObject.id + ' is being prepared!'
                    let emailText = 'Hi ' + userData.firstName + ',\nYour order is being prepared. You will be notified again when your food will be on the way!\nThe PizzaPizza Team';
                    // helpers.sendMailgunEmail = (firstName,email,subject,text,callback)
                    helpers.sendMailgunEmail(userData.firstName,userData.email,emailSubject,emailText,(err)=>{
                      if(!err){
                        debug('Email has been sent to ' + userData.email);
                      } else {
                        debug(err);
                      }
                    });


                    // Save the new user data
                    _data.update('users',userData.email,userData,(err)=>{
                      if(!err){
                        callback(200,orderObject);
                      } else {
                        callback(500,{'Error' : 'Could not update the user with the new order'})
                      }
                    });
                  } else {
                    callback(500,{'Error' : 'Could not create the order'});
                  }
                });

              } else {
                callback(403)
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the user associated to this cart'});
          }
        });
      } else {
        callback(400,{'Error' : 'Could not find the specified cart'});
      }
    });

  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }

};

// Orders - GET
// Required data: id
// Optional data: none
handlers._orders.get = (data,callback)=>{
  // Get required data
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    _data.read('orders',id,(err,orderData)=>{
      // Get token from headers
      let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

      // Check if the token is valid and the order belongs to the user
      handlers._tokens.verifyToken(token,orderData.email,(tokenIsValid)=>{
        if(tokenIsValid){
          callback(200,orderData);
        } else {
          callback(403);
        }
      });
    });
  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }
};

// Orders - PUT
// Required data: id and orderStatus
// Optional data: none
// Order status can only be modified by an admin or employee
// TODO: modify items. This means refund and new payment, or refund difference, or payment of difference
// TODO: Notify user on order status change
// TODO: Add the employee who delivered the order to the orderData
handlers._orders.put = (data,callback)=>{
  // Get required fields
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  let orderStatus = typeof(data.payload.status) == 'string' && data.payload.status.trim().length > 0 ? data.payload.status.trim() : false;
  // ['admin','employee'].indexOf(data.payload.whatever) > -1

  if(id && orderStatus){
    // Get token from headers
    let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;
    _data.read('tokens',token,(err,tokenData)=>{
      if(!err && tokenData){
        // Verify user role
        _data.read('users',tokenData.email,(err,userData)=>{
          if(!err && userData){
            // If user is admin or employee, continue
            if(['admin','employee'].indexOf(userData.role) > -1){
              // Lookup the order
              _data.read('orders',id,(err,orderData)=>{
                if(!err && orderData){
                  let status = orderData.status;
                  orderData.status = orderStatus;
                  // Update order object
                  _data.update('orders',id,orderData,(err)=>{
                    if(!err){
                      // TODO: Owner of the specified order should be notified now

                      callback(200,orderData);
                    } else {
                      callback(500,{'Error' : 'Could not update the order status'});
                    }
                  });
                } else {
                  callback(400,{'Error' : 'Could not find the specified order'});
                }
              });
            } else {
              callback(403);
            }
          } else {
            callback(400,{'Error' : 'Could not find the user associated with the token'});
          }
        });
      } else {
        callback(400,{'Error' : 'Could not find the token'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }
};

// Orders - DELETE
// Required data: id
// Optional data: none
// Orders can only be deleted by an admin
handlers._orders.delete = (data,callback)=>{
  // Get required data
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    // Lookup for the user by using the token
    let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

    _data.read('tokens',token,(err,tokenData)=>{
      if(!err && tokenData){
        // Lookup the user
        _data.read('users',tokenData.email,(err,userData)=>{
          if(!err && userData){
            // If user is admin, delete the order
            if(['admin'].indexOf(userData.role) > -1){
              // Lookup the order and get the user object associated to it
              _data.read('orders',id,(err,orderData)=>{
                if(!err && orderData){
                  let orderUserEmail = orderData.email;

                  // Delete the order
                  _data.delete('orders',id,(err)=>{
                    if(!err){
                      // Delete the order from the user object associated to it
                      _data.read('users',orderUserEmail,(err,orderUser)=>{
                        if(!err && orderUser){
                          // Update the user
                          let userOrders = orderUser.orders;
                          let orderPosition = userOrders.indexOf(id);
                          userOrders.splice(orderPosition,1);
                          orderUser.orders = userOrders;
                          _data.update('users',orderUserEmail,orderUser,(err)=>{
                            if(!err){
                              callback(200);
                            } else {
                              callback(500,{'Error' : 'Could not update the user associated to the specified order'});
                            }
                          });
                        } else {
                          callback(400,{'Error' : 'Could not find the user associated to the specified order'});
                        }
                      });
                    } else {
                      callback(500,{'Error' : 'Could not delete the specified order'});
                    }
                  });
                } else {
                  callback(400,{'Error' : 'Could not find the specified order'});
                }
              });
            } else {
              callback(403);
            }
          } else {
            callback(400,{'Error' : 'Could not find the user associated to the specified token'});
          }
        });
      } else {
        callback(400,{'Error' : 'Could not find the specified token'});
      }
    });

  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }
};

/*
 * 404 handler
 */
handlers.notFound = (data,callback)=>{
	callback(404);
};

/*
 * EXPORT MODULE
 */
module.exports = handlers;
