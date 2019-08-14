/*
 * Library for storing and editing data
 *
 */

// Dependencies
let fs = require('fs');
let path = require('path');
let helpers = require('./helpers');

// Container for the module
let lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/');

// Create a file
lib.create = (dir,file,data,callback)=>{
  // Open the file for reading
  fs.open(lib.baseDir+dir+'/'+file+'.json','wx',(err,fileDescriptor)=>{
    if(!err && fileDescriptor){
      // Convert data to string
      let stringData = JSON.stringify(data);

      // Write data into the file
      fs.writeFile(fileDescriptor,stringData,(err)=>{
        if(!err){
          // Close the file (save it)
          fs.close(fileDescriptor,(err)=>{
            if(!err){
              callback(false);
            } else {
              callback('Error closing new file');
            }
          });
        } else {
          callback('Error writing into new file');
        }
      });
    } else {
      callback('Could not create the file, it may already exist');
    }
  });
};

// Read data from file
lib.read = (dir,file,callback)=>{
  fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf-8',(err,data)=>{
    if(!err && data){
      var parsedData = helpers.parseJsonToObject(data);
      callback(false,parsedData);
    } else {
      callback(err,data);
    }
  });
};

// Update data from file
lib.update = (dir,file,data,callback)=>{
  // Open the file for writing
  fs.open(lib.baseDir + dir + '/' + file + '.json','r+',(err,fileDescriptor)=>{
    if(!err && fileDescriptor){
      // Convert data to a string
      var stringData = JSON.stringify(data);

      // Truncate the file
      fs.truncate(fileDescriptor,(err)=>{
        if(!err){
          // Write to the file and close it
          fs.writeFile(fileDescriptor,stringData,(err)=>{
            if(!err){
              // Close the file and save it
              fs.close(fileDescriptor,(err)=>{
                if(!err){
                  callback(false);
                } else {
                  callback('Error closing file');
                }
              });
            } else {
              callback('Error writing file');
            }
          });
        } else {
          callback('Error truncating file');
        }
      });
    } else {
      callback('Could not open the file for updating, it might not exist yet');
    }
  });
};

// Delete file
lib.delete = (dir,file,callback)=>{
  // Unlink the file
  fs.unlink(lib.baseDir + dir + '/' + file + '.json',(err)=>{
    if(!err){
      callback(false);
    } else {
      callback('Error deleting the file');
    }
  });
};

// List all items in a directory
lib.list = (dir,callback)=>{
  fs.readdir(lib.baseDir + dir + '/',(err,data)=>{
    if(!err && data && data.length > 0){
      let trimmedFileNames = [];
      data.forEach((fileName)=>{
        trimmedFileNames.push(fileName.replace('.json',''));
      });
      callback(false,trimmedFileNames);
    } else {
      callback(err,data);
    }
  });
};


/*
 * EXPORT MODULE
 */
module.exports = lib;
