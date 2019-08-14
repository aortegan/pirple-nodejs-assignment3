/*
 * Carts request handlers
 *
 */

// Dependencies
let _data = require('../data');
let helpers = require('../helpers');
let tokens = require('./tokens');

let carts = (data,callback)=>{
  let acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    _carts[data.method](data,callback);
  } else {
    // Method not allowed
    callback(405);
  }
};

// Container for the carts submethods
let _carts = {};

// Carts - POST
// Required data: items
// Optional data: none
// Info: 1 cart per user allowed
_carts.post = (data,callback)=>{
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
_carts.get = (data,callback)=>{
  // Get required fields
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;

  if(id){
    // Lookup the cart
    _data.read('carts',id,(err,cartData)=>{
      if(!err && cartData){
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify the token from the headers belongs to the user who created the cart
        tokens.verifyToken(token,cartData.email,(tokenIsValid)=>{
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
_carts.put = (data,callback)=>{
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
_carts.delete = (data,callback)=>{
  // Get required fields
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    // Lookup the cart
    _data.read('carts',id,(err,cartData)=>{
      if(!err && cartData){
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token from the headers is valid for the email address
        tokens.verifyToken(token,cartData.email,(tokenIsValid)=>{
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
* EXPORT MODULE
*/
module.exports = carts;
