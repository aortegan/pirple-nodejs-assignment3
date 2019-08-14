/*
 * Carts request handlers
 *
 */

// Dependencies
let _data = require('../data');
let helpers = require('../helpers');
let tokens = require('./tokens');

let menu = (data,callback)=>{
  let acceptableMethods = ['get'];
  if(acceptableMethods.indexOf(data.method) > -1){
    _menu[data.method](data,callback);
  } else {
    // Method not allowed
    callback(405);
  }
};

// Container for the menu methods
let _menu = {};

// Menu - GET
// Required data: none
// Optional data: none
_menu.get = (data,callback)=>{

  // Lookup the cart
  _data.read('menu','menu',(err,menuData)=>{
    if(!err && menuData){
      callback(200,menuData);
    } else {
      callback(404);
    }
  });

};

/*
 * EXPORT MODULE
 */
module.exports = menu;
