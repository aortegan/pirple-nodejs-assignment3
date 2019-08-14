/*
 * Orders request handlers
 *
 */

// Dependencies
let _data = require('../data');
let helpers = require('../helpers');
let tokens = require('./tokens');

/*
 * ORDERS
 */
let orders = (data,callback)=>{
 let acceptableMethods = ['post','get','put','delete'];
 if(acceptableMethods.indexOf(data.method) > -1){
   _orders[data.method](data,callback);
 } else {
   // Method not allowed
   callback(405);
 }
};

// Container for the carts submethods
let _orders = {};

// Orders - POST
// Required data: cartId,stripeId
// Optional data: deliveryTime
// TODO: add stripe transaction id
// TODO: notify user by email from yourpizza@sandbox123.mailgun.org
// TODO: create transaction log

_orders.post = (data,callback) =>{
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
            tokens.verifyToken(token,userData.email,(tokenIsValid)=>{
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
_orders.get = (data,callback)=>{
  // Get required data
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    _data.read('orders',id,(err,orderData)=>{
      // Get token from headers
      let token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

      // Check if the token is valid and the order belongs to the user
      tokens.verifyToken(token,orderData.email,(tokenIsValid)=>{
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
_orders.put = (data,callback)=>{
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
_orders.delete = (data,callback)=>{
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
* EXPORT MODULE
*/
module.exports = orders;
