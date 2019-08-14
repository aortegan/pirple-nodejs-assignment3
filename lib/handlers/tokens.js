/*
 * Tokens request handlers
 *
 */

 // Dependencies
 let _data = require('../data');
 let helpers = require('../helpers');

 let tokens = (data,callback)=>{
   let acceptableMethods = ['post','get','put','delete'];
   if(acceptableMethods.indexOf(data.method) > -1){
     _tokens[data.method](data,callback);
   } else {
     // Method not allowed
     callback(405);
   }
 };

 // Container for all the tokens methods
 let _tokens = {};
 // Tokens - POST
 // Required data: email and password
 // Optional data: none
 _tokens.post = (data,callback)=>{
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
 _tokens.get = (data,callback)=>{
   // Get required data
   let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

   if(id){
     // Send the information to the requestor
     _data.read('tokens',id,(err,tokenData)=>{
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
 _tokens.put = (data,callback)=>{
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
 _tokens.delete = (data,callback)=>{
   // Get required fields
   let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

   if(id){
     // Lookup the token
     _data.read('tokens',id,(err,tokenData)=>{
       if(!err && tokenData){
         _data.delete('tokens',id,(err)=>{
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
 tokens.verifyToken = (id,email,callback)=>{
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
 tokens.getRole = (id,callback)=>{
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
 * EXPORT MODULE
 */
 module.exports = tokens;
