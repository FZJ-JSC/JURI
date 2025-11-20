/**
 * This file contains all the generic functions not belonging to the View class
 */


/**
 * Function to safely evaluate code stored in string
 * @param {*} expression Expression to be evaluated
 * @param {*} contexts contexts that are safe to be evaluated
 * @returns 
 */
function safeEval(expression, contexts = {}) {
  // Create a new function that evaluates the expression in the provided context
  return new Function(...Object.keys(contexts), `return ${expression};`)(...Object.values(contexts));
}

// Example contexts that includes today's date, and other available global functions or variables
const safecontexts = {
  Date: Date,
  Math: Math
  // Can be extended with other values/functions if needed
};
// Recursive function to parse JSON and evaluate dynamic fields
function parseOptions(object) {
  // Handle objects recursively
  if (typeof object === 'object' && object !== null) {
    const parsedOptions = Array.isArray(object) ? [] : {};
    
    for (const key in object) {
      const value = object[key];
      parsedOptions[key] = parseOptions(value); // Recursive call for nested objects/arrays
    }

    return parsedOptions;
  }
  
  // Handle strings that represent expressions (e.g., "new Date()", "Math.random()")
  if (typeof object === 'string' && object.match(/[\(\)\{\}\?\.\+\-\*\/]/)) {
    try {
      return safeEval(object, safecontexts);  // Safely evaluate expressions
    } catch (error) {
      console.warn(`Could not evaluate the expression "${object}":`, error);
      return object;  // Return raw string if evaluation fails
    }
  }

  // Return primitive values (numbers, booleans, etc.) as they are
  return object;
}


// Sorting function that sorts key-value pairs based on a key order array
const sortByKeyOrder = (keyA, keyB, keyOrderArray) => {
  const indexA = keyOrderArray.indexOf(keyA); // Get position of keyA in keyOrderArray
  const indexB = keyOrderArray.indexOf(keyB); // Get position of keyB in keyOrderArray
  
  // If neither key is in the array, sort alphabetically by key
  if (indexA === -1 && indexB === -1) {
    return keyA.localeCompare(keyB); // Default alphabetical sort
  }
  
  // If keyA is not in the array, place it after keyB
  if (indexA === -1) return 1;
  
  // If keyB is not in the array, place it after keyA
  if (indexB === -1) return -1;

  // If both keys are in the array, sort based on their position in keyOrderArray
  return indexA - indexB;
};


/**
 * Convert csv stored in a string variable into an array of objects
 * Adapted from https://hasnode.byrayray.dev/convert-a-csv-to-a-javascript-array-of-objects-the-practical-guide
 * @param {string} text Contents of csv file
 * @param {string} delimiter delimiter used to split the lines
 * @returns {Array} Array of objects
 */
function csvToArr(text, delimiter) {
  let re = new RegExp(String.raw`(?<!\\)${delimiter}`, "g");
  const [keys, ...rest] = text
    .trim()
    .split("\n")
    .map((item) => item.split(re));

  const formedArr = rest.map((item) => {
    const object = {};
    keys.forEach((key, index) => (object[key] = item.at(index).match(/^[+-]?\d+(\.\d+)?$/) ? parseFloat(item.at(index)) : item.at(index)));
    return object;
  });
  return formedArr;
}

/**
 * Check if given path starts with /, in this case the path is seen relative to the root of the webserver
 *   Otherwise it is handled relative to the json subfolder 
 * @param {string} filepath filename including extension
 * @param {string} folder Folder where the file is located
 * @returns {string} modified filepath that includes the folder relative to the json subfolder or to the root
 */
 function process_path(filepath,folder) {
  if (filepath.charAt(0) == "/") {
    filepath = filepath.substring(1);
  } else {
    filepath = folder + filepath;
  }
  return filepath
}


/**
 * Resize main_content and add positions to table headers
 */
function resize() {
  // Add margin-bottom to footer content to avoid it to be hidden behind footer_footer
  $("#footer_graphs").css("margin-bottom",$("#footer_footer").height())
  // Set height of the footer (that can be dragged with the mouse)
  $("footer").css("min-height",$("#footer_infoline").height() + $("#footer_footer").height())
  // Height of main content is window size - the height of the header - height of the footer - optionsdiv - infotext - 10 for padding(?)
  $("#main_content").height($(window).height() - $("#header").height() - ($("#tabs_scroll").height()??0) - $("footer").height() - 10);
  $("#main_content thead tr.filter th").css("top", $("#main_content thead tr:first").height());
  $("#main_content thead tr.aggregate th").css("top", $("#main_content thead tr:first").height() +
                        $("#main_content thead tr.filter").height() - 4);
  if ($("#myGrid")) {
    $("#myGrid").height($("#main_content").height()-($('#optionsdiv').outerHeight()?$('#optionsdiv').outerHeight()+4:0) - ($('#infotext').outerHeight()?$('#infotext').outerHeight()+4:0));
    if (view.gridApi) resizeGrid()
  }
  for (let i = 0; i < view.resize_function.length; ++i) {
    view.resize_function[i]();
  }
}

/** Function to split long tasks
 * Source: https://web.dev/articles/optimize-long-tasks?utm_source=devtools&utm_campaign=stable#cross-browser_support
 */
function yieldToMain () {
  if (globalThis.scheduler?.yield) {
    return scheduler.yield();
  }

  // Fall back to yielding with setTimeout.
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}


/**
 * Parse the URL address to get configuration and parameters
 * @returns {object} Object containing parameters given in URL
 */
function getHash() {
  data_str = {
    "config": "",
    "inital": ""
  };
  data_str.config = window.location.search.substring(1).split('&');
  // If the key is empty, return
  if (!data_str.config[0]) {
    return;
  }
  data_str.inital = window.location.hash.substring(1).split('&');
  params = {
    "config": {},
    "inital": {
      "filter": {},
      "sort": {},
      "colors": {},
      "refresh": {},
      "presentation": {},
      "description": {},
      "options": {},
    }
  };
  for (let key in params) {
    for (let i = 0; i < data_str[key].length; ++i) {
      let p = data_str[key][i].split('=', 2);
      let content = "";
      if (p.length > 1)
        content = decodeURIComponent(p[1].replace(/\+/g, " "));
      let entry = decodeURIComponent(p[0]);
      let target = params[key];
      if (entry == "demo") {
        if (content.length == 0)
          content = true;
        else {
          content = content === "true";
        }
      }
      if (key == "inital") {
        if (entry == "page") {
          target = params[key];
        } else if (entry == "colId" || entry == "sort") {
          target = params[key].sort;
        } else if (entry == "colorscale") {
          target = params[key].colors;
        } else if (entry == "disablerefresh") {
          target = params[key].refresh;
        } else if (entry == "present") {
          target = params[key].presentation;
        } else if (entry == "showinfo") {
          target = params[key].description;
        } else if (entry == "showoptions") {
          target = params[key].options;
        } else if (entry == "quickfilter") {
          target = params[key];
        } else {
          target = params[key].filter;
          entry = entry;
        }
      }
      target[entry] = content;
    }
  }
  return params;
}


/**
 * Substitutes "value" from url_data[key]=value or navdata.data[key]=value 
 * (and optionally additional_parameter[key]=value)
 * into placeholder #key# in string 'text'
 * @param {string} text 
 * @param {object} additional_parameter 
 * @returns {string} modified string with placeholders substituted
 */
function replaceDataPlaceholder(text, additional_parameter) {
  if (text) {
    if (additional_parameter) {
      for (let key in additional_parameter) {
        text = text.replace("#" + key + "#", additional_parameter[key]);
      }
    }
    if (typeof view !== 'undefined') {
      for (let key in view.url_data) {
        if (key.toLowerCase() == "demo") {
          text = text.replace("#demo#", (view.url_data[key]) ? "DEMO/" : "");
        } else {
          text = text.replace("#" + key + "#", Handlebars.escapeExpression(view.url_data[key]));
        }
      }
      if (view.navdata.data) {
        for (let key in view.navdata.data) {
          if (key.toLowerCase() == "demo") {
            text = text.replace("#demo#", (view.navdata.data[key]) ? "DEMO/" : "");
          } else {
            text = text.replace("#" + key + "#", view.navdata.data[key]);
          }
        }
      }
    }
    // Clean up any remaining "#demo#" as it might not be set at all
    text = text.replace("#demo#", "");
  }
  return text;
}

