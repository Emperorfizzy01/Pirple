/*
* Request handlers
*
*/



// Dependencies

const config  = require("./config");
const _data = require("./data");
const helpers = require("./helpers");

//Define the handler
var handlers = {};

// Users
handlers.users = function(data, callback) {
    var acceptableMethods = ["post", "get", "put", "delete"];
    if (acceptableMethods.indexOf(data.method > -1)) {
        // console.log(handlers._users);
        handlers._users[data.method](data, callback);
    } else {
        callback(405)
    };
};

// Container for the user submethods
handlers._users = {};

// Users post
// Required data:firstname, lastname, phone no, password, toAgreement
// Optional data: none
handlers._users.post = function(data, callback) {
   // Check that all required fields are filled out

   var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
   var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
   var phoneNumber = typeof(data.payload.phoneNumber) == 'string' && data.payload.phoneNumber.trim().length == 11 ? data.payload.phoneNumber.trim() : false;
   var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
   var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

   if (firstName && lastName && phoneNumber && password && tosAgreement) {
       // Make sure the user doesnt exist
     _data.read('users', phoneNumber, function(err,data) {
       if (err) {
          // Hash the password
          var hashedPassword = helpers.hash(password);
           // Create user object
       if(hashedPassword) {     
         var userObject = {
            'firstName': firstName,
            'lastName': lastName,
            'phoneNumber': phoneNumber,
            'hashedPassword': hashedPassword,
            'tosAgreement': true
        };

        // Store the user
        _data.create('users',phoneNumber,userObject,function(err) {
            if (!err) {
                callback(200);
            } else {
                console.log(err);
                callback(500, {'Error': 'Could not create the new user'});
            }
        });
       } else {
           callback(500, {'Error': 'Could not hash user\'s password'});
       }
       } else {
           callback(404, {'Error': 'A user with that phone number already exist'});
       }
     });
   } else {
       callback(400, {'Error': 'You are missing required fields'});
   }
};

// Users get
// Required data: phoneNumber
// Optional data: none
// Dont let unauthorised user access other peoples data
handlers._users.get = function(data, callback) {
// Check that the phone number is valid
    var phoneNumber = typeof(data.queryStringObject.phoneNumber) == 'string' && data.queryStringObject.phoneNumber.trim().length == 11 ? data.queryStringObject.phoneNumber.trim() : false;
    if(phoneNumber) {

        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the specified user
        handlers._tokens.verifyToken(token,phoneNumber,function(tokenIsValid){
           if(tokenIsValid) {
                // Lookup users
        _data.read('users', phoneNumber, function(err, data) {
            if(!err && data) {
             // Remove the hashed password before sending it to the requester
             delete data.hashedPassword;
             callback(200, data);
            } else {
                callback(404);
            }
        })
           } else {
               callback(403, {'Error': 'Missing required token in header or token is invalid'});
           }
        });
      
    } else {
        callback(400, {'Error': 'Missing required field'});
    };
};

// Users put
// Required data: phone number
// Optional data: firstname, lastname, password (at least one must be specified)
// Dont let unauthorised user update other peoples data 
handlers._users.put = function(data, callback) {
    // Check for the required field
    var phoneNumber = typeof(data.payload.phoneNumber) == 'string' && data.payload.phoneNumber.trim().length == 11 ? data.payload.phoneNumber.trim() : false;
    // Check for the optional field
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    // Error if the phone is invalid
    if(phoneNumber) {
        if(firstName || lastName || password) {

             // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the specified user
        handlers._tokens.verifyToken(token,phoneNumber,function(tokenIsValid){
           if(tokenIsValid) {
          // Lookup users
          _data.read('users', phoneNumber, function(err, userData) {
            if(!err && userData) {
            // Update the field where necessary
            if(firstName) {
                userData.firstName = firstName;
            }
            if(lastName) {
               userData.lastName = lastName;
            }
            if(password) {
               userData.hashedPassword = helpers.hash(password);
            }
           
            // Store the new data
        _data.update('users', phoneNumber, userData,function(err){
            if(!err) {
             callback(200);
            } else {
                callback(500, {'Error': 'Could not update the user'});
            }
        })
           } else {
            callback(403, {'Error': 'Missing required token in header or token is invalid'});
           }
        });
         
            } else {
                callback(400, {'Error': 'The specified user does not exist'}); 
            }
          });
        } else { 
            callback(400, {'Error': 'Missing fields to update'})
        }
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Users delete
// Required field: phoneNumber
// Only let an authnticated user delete
// Delete any data files associated with the user
handlers._users.delete = function(data, callback) {
// Check to see if the phone number is valid
var phoneNumber = typeof(data.queryStringObject.phoneNumber) == 'string' && data.queryStringObject.phoneNumber.trim().length == 11 ? data.queryStringObject.phoneNumber.trim() : false;
if(phoneNumber) {

     // Get the token from the headers
     var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

     // Verify that the given token is valid for the specified user
     handlers._tokens.verifyToken(token,phoneNumber,function(tokenIsValid){
        if(tokenIsValid) {
          // Lookup users
    _data.read('users', phoneNumber, function(err, userData) {
        if(!err && userData) {
        _data.delete('users', phoneNumber, function(err) {
            if(!err) {
               // Delete each of the check associated with the user
               var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []; 
               var checksToDelete = userChecks.length;

               if (checksToDelete > 0) {
                   var checksDeleted = 0;
                   var deletionError = false;
                   // Loop through the checks
                   userChecks.forEach(function(checkId) {
                       // Delete the check
                       _data.delete('checks',checkId,function(err) {
                           if (err) {
                               deletionError = true;
                           }
                           checksDeleted++;
                           if(checksDeleted == checksToDelete) {
                               if(!deletionError) {
                                   callback(200);
                               } else {
                                   callback(500, {'Error': 'Errors encountered while attempting to delete all of the user\'s check.All checks may not have been deleted from the system sucessfully'});
                               }
                           }
                       })
                   })
               } else {
                   callback(200);
               }
           } else {
                callback(500, {'Error': 'Could not delete specified user'});
            }
        });
        } else {
            callback(403, {'Error': 'Missing required token in header or token is invalid'});
        }
    });
        } else {
            callback(400, {'Error': 'Could not find the specified user'});
        };
    });
} else {
    callback(400, {'Error': 'Missing required field'});
};
};

// Tokens
handlers.tokens = function(data, callback) {
    var acceptableMethods = ["post", "get", "put", "delete"];
    if (acceptableMethods.indexOf(data.method > -1)) {
        // console.log(handlers._users);
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405)
    };
};

// Container for the token method
handlers._tokens = {};

// Token post
// Required data: phoneNumber, password
// Optional data: none
handlers._tokens.post = function(data, callback) {
    var phoneNumber = typeof(data.payload.phoneNumber) == 'string' && data.payload.phoneNumber.trim().length == 11 ? data.payload.phoneNumber.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    if(phoneNumber && password) {
     // Lookup the user that matches the phone number
     _data.read('users', phoneNumber, function(err, userData) {
         if(!err && userData) {
          // Hash the sent password,and compare it to the password stored in the users
          var hashedPassword = helpers.hash(password);
          if (hashedPassword == userData.hashedPassword) {
           // If valid, create a new token with a random name. Set expiration date 1 hour in the future
           var tokenId = helpers.createRandomString(20);
           var expires = Date.now() + 1000 * 60 * 60;
           var tokenObject = {
             'phoneNumber': phoneNumber,
             'id' : tokenId,
             'expires': expires
           };

           // Store the token
           _data.create('tokens', tokenId, tokenObject, function(err) {
             if(!err) {
                 callback(200, tokenObject);
             } else {
                 callback(500, {'Error': 'Could not create a new token'});
             }
           });

          } else {
              callback(400, {'Error' : 'Password does not match specified user\'s stored password' });
          }
         } else {
             callback(400, {'Error': 'Could not find specified user'})
         }
     })
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Token get
// Required data: id
// Optional: none
handlers._tokens.get = function(data, callback) {
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id) {
        // Lookup tokens
        _data.read('tokens', id, function(err, tokenData) {
            if(!err && tokenData) {
             callback(200, tokenData);
            } else {
                callback(404);
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'});
    };
};

// Token put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback) {
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

    if(id && extend) {
     // Lookup the tokens
     _data.read('tokens',id,function(err,tokenData) {
         if(!err && tokenData) {
             // Check to make sure the token isnt already expired
            if(tokenData.expires > Date.now()) {
                // Set the expiration an hour from now
                tokenData.expires = Date.now() + 1000 * 60 * 60;

                // Store the new updates
                _data.update('token', id, tokenData, function(err) {
                    if(err) {
                        callback(200);
                    } else {
                        callback(500, {'Error': 'Could not update token\'s expiration'});
                    }
                })
            } else {
                callback(400, {'Error': 'The token has already expired and cannot be extended'});
            }
         } else {
           callback(400, {'Error': 'Specified token does not exist'})
         }
     })
    } else {
        callback(400, {'Error': 'Missing required field(s) or field(s) are invalid'});
    }
};

// Token delete
// Required data: id
// Optional data: delete 
handlers._tokens.delete = function(data, callback) {
// Check that the id is valid
var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
if(id) {
    // Lookup token
    _data.read('tokens', id, function(err, data) {
        if(!err && data) {
        _data.delete('tokens', id, function(err) {
            if(!err) {
                callback(200)
            } else {
                callback(500, {'Error': 'Could not delete specified token'});
            }
        });
        } else {
            callback(400, {'Error': 'Could not find the specified token'});
        };
    });
} else {
    callback(400, {'Error': 'Missing required field'});
};
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,phoneNumber,callback) {
  // Lookup the token
  _data.read('tokens',id,function(err,tokenData) {
      if (!err && tokenData) {
          // Check that the token is for the given user and has not expired
         if (tokenData.phoneNumber == phoneNumber && tokenData.expires >= Date.now()) {
             callback(true);
         } else {
             callback(false);
         }
      } else {
        callback(false);
      };
  });
};

// Checks
handlers.checks = function(data, callback) {
    var acceptableMethods = ["post", "get", "put", "delete"];
    if (acceptableMethods.indexOf(data.method > -1)) {
        // console.log(handlers._users);
        handlers._checks[data.method](data, callback);
    } else {
        callback(405)
    };
};

// Container for the check method
handlers._checks = {};

// Checks -post
// Required data: protocol, url, method, successCode, timeoutSeconds
// Optional data: none
handlers._checks.post = function(data, callback) {
    console.log(config.maxChecks);
    // Validate input
    var protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length  > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

     if(protocol && url && method && successCodes && timeoutSeconds) {
     // Get the tokens from the headers
     var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

     // Lookup the user by reading token
     _data.read('tokens',token,function(err,tokenData) {
         if(!err && tokenData) {
               var userPhone = tokenData.phoneNumber
         // Lookup the user
            _data.read('users',userPhone,function(err,userData) {
                if(!err && userData) {
                  var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
      
                  // Verify that the user has less than the number of max-checks-per user
                  if(userChecks.length < config.maxChecks) {
                       // Creata a random check for user
                       var checkId = helpers.createRandomString(20);

                       // Create the check object and include the user's phone
                       var checkObject = {
                            'id' : checkId,
                            'userPhone': userPhone,
                            'protocol': protocol,
                            'url': url,
                            'method': method,
                            'successCodes': successCodes,
                            'timeoutSeconds': timeoutSeconds
                       };

                     // Save the object
                     _data.create('checks',checkId,checkObject,function(err) {
                         if(!err) {
                            // Add the check id to the user object
                            userData.checks = userChecks;
                            userData.checks.push(checkId);

                            // Save the new user data
                            _data.update('users',userPhone,userData,function(err) {
                                if(!err) {
                               // Return the data about the new checks
                               callback(200,checkObject);
                                } else {
                                    callback(500, {'Error' : 'Could not update the user with the new checks'});
                                }
                            })
                         } else {
                             callback(500, {'Error': 'Could not create the new check'});
                         }
                     })
                  } else {
                    callback(400, {'Error': 'The user already has the maximum number of checks ['+ config.maxChecks +']'});
                  };
                } else {
                    callback(403);
                }
            })    
         } else {
             callback(403);
         }
     });
        } else {
         callback(400, {'Error': 'Missing required inputs or inputs are invalid'})
     }
};


// Checks -get
// Required data - id
// Optional - none 
handlers._checks.get= function(data, callback) {
     // Check that the phone number is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id) {
        // Lookup the check
        _data.read('checks',id,function(err,checkData) {
           
            if(!err && checkData) {
                // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
           if(tokenIsValid) {
                //Return the check dat
            callback(200, checkData)
           } else {
               callback(403);
           }
        });
            } else {
                callback(404);
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'});
    };
};

// Required data: id
// Optional data: protocol,url,method,successCodes,timeOutSeconds
handlers._checks.put = function(data, callback) {
    // Check for the required field
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
    // Check for optional data
    var protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length  > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    // Check if id is valid
    if(id) {
     // Check to see if one or more optional data has been sent
     if(protocol || url || method || successCodes || timeoutSeconds) {
       // Lookup the check
       _data.read('checks', id, function(err, checkData) {
           if(!err && checkData) {
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Verify that the given token is valid and belongs to the user who created the check
            handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
               if(tokenIsValid) {
                    // Update the check where necessry
                    if(protocol) {
                        checkData.protocol = protocol
                    }
                    if(url) {
                        checkData.url = url
                    }
                    if(method) {
                        checkData.method = method
                    }
                    if(successCodes) {
                        checkData.successCodes = successCodes
                    }
                    if(timeoutSeconds) {
                        checkData.timeoutSeconds = timeoutSeconds
                    }

                    // Store the new check
                    _data.update('checks',id,checkData,function(err) {
                        if(!err) {
                            callback(200);
                        } else {
                            callback(500, {'Error': 'Could not update check'});
                        }
                    })
               } else {
                   callback(403);
               }
            })
           } else {
               callback(400, {'Error' : 'Check ID did not exist'});
           }
       })
     } else {
         callback(400, {'Error': 'Missing field to update'});
     }
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Check -delete
// Required data = id
// Optional data = none
handlers._checks.delete = function(data, callback) {
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20? data.queryStringObject.id.trim() : false;
    if(id) {

        // Lookup the checks
        _data.read('checks',id,function(err,checkData) {
            if(!err && checkData) {

         // Get the token from the headers
         var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    
         // Verify that the given token is valid for the specified user
         handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
            if(tokenIsValid) {
              // Delete the check data
            _data.delete('checks',id,function(err) {
               if(!err) {
                 // Lookup users
                 _data.read('users', checkData.userPhone, function(err, userData) {
                      if(!err && userData) {
                         var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

             // Remove the delete check from the list of checks
             var checkPosition = userChecks.indexOf(id);
             if(checkPosition > -1) {
                userChecks.splice(checkPosition,1);
                // Re-save the users data
                _data.update('users', checkData.userPhone,userData, function(err) {
                    if(!err) {
                   callback(200)
                } else {
                   callback(500, {'Error': 'Could not update specified user'});
               }
             });
             } else {
                 callback(500, {'Error' : 'Could not find the check on the user\'s object, so could not delete it'});
             }
            } else {
                callback(500, {'Error': 'Could not find the user who created the check, so could not remove the check from the list of user object'});
            };
            });
         } else {
                   callback(500, {'Error': 'Could not delete the check data'});
               }
            });
            } else {
                callback(403);
            }
        }); 
            } else {
                callback(400, {'Error': 'The specified check Id does not  exist'});
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'});
    };
    };




// Sample handlers
handlers.ping = function(data, callback) {
    //Callback statuscode and payload object
    callback(200);
};

// Not found handlers
handlers.notFound= function(data, callback) {
    callback(404);
};

//Export the module
module.exports = handlers;