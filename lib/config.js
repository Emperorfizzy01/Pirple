/*
*Create and export configuration variables
*
*/

//Container for all the environment
var environments = {};

//Staging (default) environment
environments.staging = {
    "httpPort": 3000,
    "httpsPort": 3001,
    "envName": "staging",
    "hashingSecret": "thisIsASecret",
    "maxChecks": 5,
    "twilio": {
        'accountSid': 'AC52e9c1a5d26a90c3e39c2af975264541',
        'authToken': '6cee9eb420d5a9c8ee8397b0942f07c2',
        'fromPhone': '+12058523371'
    },
    "templateGlobals" : {
        "appName": "UptimeChecker",
        "companyName": "EmperorFizzy, Inc",
        "yearCreated": "2021",
        "baseUrl": "http://localhost:3000/"
    }
};

//Production environment
environments.production = {
    "httpPort" : 5000,
    "httpsPort": 5001,
    "envName": "production",
    "hashingSecret": "thisIsAlsoASecret",
    "maxChecks": 5,
    "twilio": {
        'accountSid': '',
        'authToken': '',
        'fromPhone': ''
    },
    "templateGlobals" : {
        "appName": "UptimeChecker",
        "companyName": "EmperorFizzy, Inc",
        "yearCreated": "2021",
        "baseUrl": "http://localhost:5000/"
    }
};


//Determine which environment was passed as command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == "string" ? process.env.NODE_ENV.toLowerCase() : ""

//Check that the current environment is one of the environments above,if not,default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == "object" ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;