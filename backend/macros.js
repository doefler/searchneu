import path from 'path';
import URI from 'urijs';
import mkdirp from 'mkdirp-promise';
import fs from 'fs-promise';
import rollbar from 'rollbar';
import Amplitude from 'amplitude';

import commonMacros from '../common/macros';

// Collection of small functions that are used in many different places in the backend. 
// This includes things related to saving and loading the dev data, parsing specific fields from pages and more. 
// Would be ok with splitting up this file into separate files (eg, one for stuff related to scraping and another one for other stuff) if this file gets too big. 
// Stuff in this file can be specific to the backend and will only be ran in the backend. 
// If it needs to be ran in both the backend and the frontend, move it to the common macros file :P

// TODO: improve getBaseHost by using a list of top level domains. (public on the internet)

// Change the current working directory to the directory with package.json and .git folder.
while (1) {
  try {
    fs.statSync('.git');
  } catch (e) {
    //cd .. until in the same dir as package.json, the root of the project
    process.chdir('..');
    continue;
  }
  break;
}




// This is the JSON object saved in /etc/searchneu/config.json
// opened once getEnvVariable is called once. 
let envVariablesPromise = null;

class Macros extends commonMacros {


  static parseNameWithSpaces(name) {
    // Standardize spaces.
    name = name.replace(/\s+/gi, ' ');

    // Generate first name and last name
    const spaceCount = Macros.occurrences(name, ' ', false);
    const splitName = name.split(' ');


    if (spaceCount === 0) {
      Macros.critical('0 spaces found in name', name);
      return null;
    }

    // Handles firstName, lastName and firstName, middleName, lastName

    if (spaceCount > 2) {
      Macros.log(name, 'has more than 1 space in their name. Using first and last word.');
    }

    const obj = {};

    obj.firstName = splitName[0];
    obj.lastName = splitName[splitName.length - 1];

    return obj;
  };

  // Standardizes email addresses found across different pages
  // Removes a 'mailto:' from the beginning
  // Ensures the email contains a @
  static standardizeEmail(email) {
    if (email.startsWith('mailto:')) {
      email = email.slice('mailto:'.length);
    }

    if (!email.includes('@') || email.includes(' ')) {
      return null;
    }

    if (email.endsWith('@neu.edu')) {
      email = `${email.split('@')[0]}@northeastern.edu`;
    }

    return email.toLowerCase();
  };


  static standardizePhone(phone) {
    phone = phone.trim();

    if (phone.startsWith('tel:')) {
      phone = phone.slice('tel:'.length).trim();
    }

    let digitsOnly = phone.replace(/[^0-9]/gi, '');


    if (phone.startsWith('+1') && digitsOnly.length === 11) {
      digitsOnly = digitsOnly.slice(1);
    }

    if (digitsOnly.length !== 10) {
      return null;
    }

    return digitsOnly;
  };

  // Parses the google scholar id from a link that should contain a google scholar link.
  // Get the Google Scholar ID with this: https://scholar.google.com/citations?user=[id here]
  static parseGoogleScolarLink(link) {
    if (!link) {
      return null;
    }

    const userId = new URI(link).query(true).user;
    if (!userId && link) {
      Macros.log('Error parsing google url', link);
      return null;
    }
    return userId;
  };


  // Gets the base hostname from a url.
  // fafjl.google.com -> google.com
  // subdomain.bob.co -> bob.co
  // bob.co -> bob.co
  // This could be improved by using public lists of top-level domains. 
  static getBaseHost(url) {
    const homepage = new URI(url).hostname();
    if (!homepage || homepage === '') {
      Macros.error('could not find homepage of', url);
      return null;
    }

    const match = homepage.match(/[^.]+\.[^.]+$/i);
    if (!match) {
      Macros.error('homepage match failed...', homepage);
      return null;
    }
    return match[0];
  }



  // http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
  static occurrences(string, subString, allowOverlapping) {
    string += '';
    subString += '';
    if (subString.length <= 0) {
      return (string.length + 1);
    }

    let n = 0;
    let pos = 0;
    const step = allowOverlapping ? 1 : subString.length;

    while (true) {
      pos = string.indexOf(subString, pos);
      if (pos >= 0) {
        ++n;
        pos += step;
      } else {
        break;
      }
    }
    return n;
  }
  
  static async getAllEnvVariables() {
    const configFileName = '/etc/searchneu/config.json';
      
    let exists = await fs.exists(configFileName);
    
    if (!exists) {
      return null;
    }
    
    let body = await fs.readFile(configFileName)
    
    return JSON.parse(body)
  }
  
  static async getEnvVariable(name) {
    if (!envVariablesPromise) {
      envVariablesPromise = this.getAllEnvVariables();
    }
    
    return (await envVariablesPromise)[name]
  }
  


  // This is for programming errors. This will cause the program to exit anywhere.
  // This *should* never be called.
  static critical(...args) {
    Macros.error.apply(Macros.error, args);
    process.exit(1);
  }

  // Use this for stuff that should never happen, but does not mean the program cannot continue.
  // This will continue running in dev, but will exit on CI
  // Will log stack trace
  // and cause CI to fail
  // so CI will send an email
  static error(...args) {
    super.error(...args);
   
    // So I get an email about it
    if (process.env.CI) {
      process.exit(1);
    }
  }

  // Use console.warn to log stuff during testing

  static verbose(...args) {
    if (!process.env.VERBOSE) {
      return;
    }

    console.log.apply(console.log, args);
  }
}


Macros.PUBLIC_DIR = path.join('public', 'data');
Macros.DEV_DATA_DIR = path.join('cache', 'dev_data');

// For iterating over every letter in a couple different places in the code.
Macros.ALPHABET = 'maqwertyuiopsdfghjklzxcvbn';


Macros.verbose('Starting in verbose mode.');


async function handleUncaught(err) {
  console.log('Error: An unhandledRejection occurred.');
  console.log(`Rejected Promise: ${p}`);
  console.log(`Rejection Stack Trace: ${err.stack}`);
  if (Macros.PROD) {
    
    // If running on Travis, just exit 1 and travis will send off an email.
    if (process.env.CI) {
      process.exit(1);
    
    // If running on AWS, tell rollbar about the error so rollbar sends off an email.
    } else {
      const rollbarKey = await macros.getEnvVariable('rollbarPostServerItemToken');
      rollbar.init(rollbarKey);
      
      // If needed, we can also pass in a data object between the err and the callback. 
      rollbar.handleError(err, function() {
        process.exit(1);
      });
    }
  }
}


// Sometimes it helps debugging to enable this test mode too. 
if ((Macros.PROD || Macros.DEV || 1) && !global.addedRejectionHandler) {
  global.addedRejectionHandler = true;
  process.on('unhandledRejection', handleUncaught);
  process.on('uncaughtException', handleUncaught);
}



export default Macros;
