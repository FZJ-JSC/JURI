/* 
* Copyright (c) 2023 Forschungszentrum Juelich GmbH.
* This file is part of JURI. 
*
* This is an open source software distributed under the GPLv3 license. More information see the LICENSE file at the top level.
*
* Contributions must follow the Contributor License Agreement. More information see the CONTRIBUTING.md file at the top level.
*
* Contributors:
*    Sebastian Lührs (Forschungszentrum Juelich GmbH) 
*    Filipe Guimarães (Forschungszentrum Juelich GmbH)   
*    Nabil Abubaker (Forschungszentrum Juelich GmbH)   
*/

function round_number_generic(number, ignore_null, dec_places) {
  let places = (dec_places === undefined || typeof dec_places != "number")?2:dec_places;
  if (ignore_null && (number == 0 || number === null)) {
    return "";
  } else {
    return parseFloat(number).toLocaleString('en',{minimumFractionDigits: places, maximumFractionDigits: places});
  }
};

function round_number(number, dec_places) {
  return round_number_generic(number.value, false, dec_places);
};

function round_number_or_null(number,dec_places) {
  return round_number_generic(number.value, true, dec_places);
};

function round_number_or_null_int(number) {
  return round_number_generic(number.value, true, 0);
};

/**
 * Formats raw seconds into a human-readable time string (e.g., 1d02h03m04s).
 * This is used by both the cell formatter and the filter component.
 * 
 * @param {Object} params - The ag-Grid params object, or a mock object {value: seconds}
 * @returns {String} The formatted time string
 */
function hhmm_short(params) {
  // Catch nulls or undefined values gracefully
  if (params == null || params.value == null || params.value === '') return "";
  
  // Use Math.round to fix any floating point inaccuracies from the backend (e.g. 59.9999 -> 60)
  let total_seconds = Math.round(Number(params.value)); 
  
  let days = Math.floor(total_seconds / 86400);
  let hours = Math.floor((total_seconds % 86400) / 3600);
  let mins = Math.floor((total_seconds % 3600) / 60);
  let secs = total_seconds % 60;
  
  // Helper to pad with leading zeros (e.g., 5 -> 05)
  const pad = (num) => num.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});

  if (days > 0) {
    return `${days}d${pad(hours)}h${pad(mins)}m${pad(secs)}s`;
  } else if (hours > 0) {
    return `${hours}h${pad(mins)}m${pad(secs)}s`;
  } else if (mins > 0) {
    return `${mins}m${pad(secs)}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Parses a human-readable time string ("1d 2h", "1h30m", or "300") back into raw seconds.
 * 
 * @param {String} textStr - The text inputted by the user
 * @returns {Number|null} The total time in seconds, or null if invalid
 */
function parseTimeToSeconds(textStr) {
  if (!textStr) return null;
  let text = textStr.trim().toLowerCase();
  
  // If it's a pure number, assume it's seconds
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  
  let total = 0;
  let d = text.match(/(\d+)d/);
  let h = text.match(/(\d+)h/);
  let m = text.match(/(\d+)m/);
  let s = text.match(/(\d+)s/);
  
  if (d) total += parseInt(d[1], 10) * 86400;
  if (h) total += parseInt(h[1], 10) * 3600;
  if (m) total += parseInt(m[1], 10) * 60;
  if (s) total += parseInt(s[1], 10);
  
  // Return null if parsing failed, unless the user explicitly typed '0'
  return total === 0 && !text.includes('0') ? null : total;
}

function cell_color(params,column) {
  let color_obj;
  if (column) {
    color_obj = { 'color': params.data[column], 'font-weight': 'bold' }
  } else {
    if ((params.value == "SUCCESSFUL")||(params.value == "COMPLETED")) {
      color_obj = { 'color': '#008000', 'font-weight': 'bold' }
    } else if (params.value == "FAILED") {
      color_obj = { 'color': 'red', 'font-weight': 'bold' }
    } else if (params.value.toLowerCase().startsWith("run")) {
      color_obj = { 'color': 'blue', 'font-weight': 'bold' }
    } else {
      color_obj = { 'color': '#daa621', 'font-weight': 'bold' }
    }
  }
  return color_obj;
}


/**
 * The status cell is rendered as a flexbox container of SVG icons representing historical health.
 * Encoded metadata strings (e.g., 'F:1776895200:3:2:0:1') are parsed to generate detailed tooltips
 * displaying the execution date and a breakdown of run statuses.
 * 
 * @param {object} params - AG Grid parameters object containing the cell value.
 * @returns {string} HTML string containing the rendered SVGs and tooltips.
 */
function cell_status(params) {
  if (!params || !params.value) return '';

  let val = params.value.toString();

  const colors = {
    'S': { main: '#108548', bg: '#ecf3ec', title: 'Passed' },
    'F': { main: '#dd2b0e', bg: '#fdf2f0', title: 'Failed' },
    'W': { main: '#c05600', bg: '#fff8eb', title: 'Warning' }
  };

  const paths = {
    'S': 'M6.278 7.697L5.045 6.464a.296.296 0 0 0-.42-.002l-.613.614a.298.298 0 0 0 .002.42l1.91 1.909a.5.5 0 0 0 .703.005l.265-.265L9.997 6.04a.291.291 0 0 0-.009-.408l-.614-.614a.29.29 0 0 0-.408-.009L6.278 7.697z',
    'F': 'M7 8.025L4.841 10.183a.35.35 0 0 1-.495 0l-.53-.53a.35.35 0 0 1 0-.495L5.975 7 3.817 4.841a.35.35 0 0 1 0-.495l.53-.53a.35.35 0 0 1 .495 0L7 5.975 9.159 3.817a.35.35 0 0 1 .495 0l.53.53a.35.35 0 0 1 0 .495L8.025 7l2.158 2.159a.35.35 0 0 1 0 .495l-.53.53a.35.35 0 0 1-.495 0L7 8.025z',
    'W': 'M7.002 9.45a.75.75 0 1 1-.004 1.5.75.75 0 0 1 .004-1.5zM7 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z'
  };

  let html = '<div style="display: flex; align-items: center; gap: 0px; vertical-align: middle;">';

  if (val.startsWith('-')) {
    html += '<div style="width: 6px; height: 2px; background-color: #bfbfbf; flex-shrink: 0; margin: 0;"></div>';
    val = val.substring(1);
  }

  let chunks = val.split('-');

  chunks.forEach((chunk, index) => {
    let parts = chunk.split(':');
    let status = parts[0];
    let tooltip = '';

    if (colors[status]) {
      const c = colors[status];
      const p = paths[status];

      if (parts.length === 6) {
        let ts = parseInt(parts[1], 10);
        let total = parts[2];
        let s_cnt = parts[3];
        let w_cnt = parts[4];
        let f_cnt = parts[5];

        let dateStr = new Date(ts * 1000).toLocaleString();
        
        // Standard HTML break tags are utilized for multiline Bootstrap rendering
        tooltip = `Date: ${dateStr}<br>Total Runs: ${total}<br>✔️ Success: ${s_cnt}<br>⚠️ Warning: ${w_cnt}<br>❌ Failed: ${f_cnt}`;
      } else {
        tooltip = `Status: ${c.title}`;
      }

      // onmouseenter dynamically initializes Bootstrap tooltips for elements rendered asynchronously by AG Grid
      html += `
        <div title="${tooltip}" data-toggle="tooltip" data-html="true" data-placement="top" 
             onmouseenter="if(typeof $ !== 'undefined' && !$(this).data('bs.tooltip')) { $(this).tooltip({html: true, boundary: 'viewport'}).tooltip('show'); }"
             style="display: flex; flex-shrink: 0; width: 16px; height: 16px; margin: 0; padding: 0; cursor: pointer;">
          <svg width="16" height="16" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <g fill-rule="evenodd">
              <path d="M0 7a7 7 0 1 1 14 0A7 7 0 0 1 0 7z" fill="${c.main}" />
              <path d="M13 7A6 6 0 1 0 1 7a6 6 0 0 0 12 0z" fill="${c.bg}" />
              <path d="${p}" fill="${c.main}" />
            </g>
          </svg>
        </div>`;
    }

    if (index < chunks.length - 1) {
      html += '<div style="width: 6px; height: 2px; background-color: #bfbfbf; flex-shrink: 0; margin: 0;"></div>';
    }
  });

  html += '</div>';
  return html;
}
  
function cell_background_color(params,colorcol,defscale) {
  let value = params.data[colorcol]
  if (typeof value === "number" && value >= 0 && value <= 1) {
    let colorscale_name;
    let color_wheel;
    // Getting colorscale name
    if (!(typeof defscale === "string")) {
      // from initial_data or default
      colorscale_name = view.initial_data.colors.colorscale ?? view.default_colorscale;
    } else {
      if (value <= 0.00005 ) {
        // return white background if value is too small (only for colorscales passed in argument)
        return {backgroundColor: '#fff', color: '#000'};
      }
      // From argument passed in the column config
      colorscale_name = defscale;
    }
    // If colorscale was already created, use it. Otherwise, create it and save in view object
    if(colorscale_name in view.used_colorscales) {
      color_wheel = view.used_colorscales[colorscale_name];
    } else {
      function ramp(name,n) {
        /* Function to return a colorscale with a given number of elements 'n'
        Adapted from https://observablehq.com/@d3/color-schemes
        */
        let colors;
        if (d3[`scheme${name}`] && d3[`scheme${name}`][n]) {
          colors = d3[`scheme${name}`][n];
        } else {
          const interpolate = d3[`interpolate${name}`];
          colors = [];
          for (let i = 0; i < n; ++i) {
            colors.push(d3.rgb(interpolate(i / (n - 1))).hex());
          }
        }
        return colors
      }
      let n = 11; // Number of colors in the colorscale
      let [colorscale,reverse] = colorscale_name.split('_');
      color_wheel = ramp(colorscale,n);
      if (reverse) {
        color_wheel = color_wheel.reverse();
      }
      view.used_colorscales[colorscale_name] = color_wheel;
    }
    let ind = Math.round((value) * (color_wheel.length-1)); 
    // Add colorscale controls
    if (color_wheel) {
      // Add colorscale controls if colorscale was not defined in argument
      if (!(typeof defscale === "string")) {
        view.add_colorscale_controls()
      }
      let dark = d3.lab(color_wheel[ind]).l < 50;
      return {backgroundColor: color_wheel[ind], color: dark ? '#fff' : '#000'};
    } else {
      return null;
    }
  } else {
    return null;
  }
};

function create_report_link(params,type,project,user) {
  const projectname = params.data[project]; 
  const username = params.data[user];
  const filename = params.value;
  //    console.log("pdf_link: "+projectname+" "+username+" "+filename);
  var icon;
  var title;
  var text;
  var result;
  if (type == "html") {
    icon = "fa-area-chart";
    title = "Show job report"
    text = "Show HTML job report"

  }
  else if (type == "aireport") { 
    icon = "fa-lightbulb-o";
    title = "Generate AI report"
    text = "Generate AI report"
  }
  else {
    icon = "fa-file-pdf-o";
    title = "Download job report"
    text = "Download PDF job report"
  }
  if ( (filename) && (filename!='-') ) {
    let url = `data/${((view.navdata.data.demo || view.url_data.demo)?'DEMO/':'')}projects/${projectname}/${username}/${((typeof filename !== 'undefined')?filename:'#')}`;
    if (type == "aireport") {
      //result = `<a href="#" onclick="generate_ai_report('${url}'); return false;"><span class="fa ${icon}" title="${title}" aria-label="${text}"/></a>`;
      if(view.uiConfig?.llviewai?.enableAIReports){
        result = `<a href="#" onclick="showAiReportDialog('${url}'); return false;"><span class="fa ${icon}" title="${title}" aria-label="${text}"/></a>`;
      }
      else{
        result = `<span style="color: grey;" class="fa ${icon}" title="AI reports are not enabled" aria-label="AI reports are not enabled"/>`;
      }
    }
    else{
      result = `<a href="${url}" ><span class="fa ${icon}" title="${title}" aria-label="${text}"/></a>`;
    }
    
  } else {
    result = `<span style="color: grey;" class="fa ${icon}" title="No job report available" aria-label="No job report available"/>`;
  }
  // console.log(result)
  return result;
};


function gen_project_user_link(params, config, project) {
  //    console.log("gen_project_user_link: "+config+" "+params.data[project]+" "+params.value);
  // Check permission
  if (view.navdata.data.permission && ["observer", "support"].indexOf(view.navdata.data.permission) != -1) {
    
    // Start fresh with the base URL (no query, no hash)
    let newUrl = new URL(window.location.origin + window.location.pathname);

    // Set only the parameters we explicitly want
    newUrl.searchParams.set('config', config);
    newUrl.searchParams.set('project', params.data[project]);
    newUrl.searchParams.set('user', params.value);

    // Copy the hash (fragment) from the current window to preserve page/view state
    newUrl.hash = window.location.hash;

    return `<a href="${newUrl.href}">${params.value}</a>`;
  } else {
    return params.value;
  }
};

function gen_project_link(params, config) {
  //    console.log("gen_project_link: "+config+" "+params.value);
  // Check permission
  if (view.navdata.data.permission && ["observer", "support", "mentor"].indexOf(view.navdata.data.permission) != -1) {
    
    // Start fresh
    let newUrl = new URL(window.location.origin + window.location.pathname);

    // Set specific params
    newUrl.searchParams.set('config', config);
    newUrl.searchParams.set('project', params.value);

    // Copy hash
    newUrl.hash = window.location.hash;
    
    return `<a href="${newUrl.href}">${params.value}</a>`;
  } else {
    return params.value;
  }
};


/**
 * Generate a list of project links (independent of Handlebars)
 * @param {object} params - object containing .value (the project(s))
 * @param {string} config - config name for the link
 * @returns {string} HTML string with links
 */
function gen_projects_link(params, config) {
  let val = params.value;
  let projects = [];

  // Robust input handling:
  // 1. If it's already an array, use it.
  // 2. If it's a string, split by comma (handling potential spaces).
  // 3. Otherwise, wrap it in an array.
  if (Array.isArray(val)) {
    projects = val;
  } else if (typeof val === 'string') {
    // Remove brackets if they exist (e.g. "[user1, user2]") and split
    projects = val.replace(/[\[\]]/g, '').split(',').map(item => item.trim());
  } else if (val) {
    projects = [val];
  }

  let result = "";
  let count = 0;
  
  projects.forEach(function(project) {
    // Check permission using global view object
    if (view.navdata.data.permission && ["observer", "support", "project"].indexOf(view.navdata.data.permission) != -1) {
      
      // Construct URL
      let newUrl = new URL(window.location.origin + window.location.pathname);
      newUrl.searchParams.set('config', config);
      newUrl.searchParams.set('project', project);
      
      // If demo mode is active, preserve it
      if (view.url_data && view.url_data.demo) {
         newUrl.searchParams.set('demo', '');
      }

      // Preserve Hash
      newUrl.hash = window.location.hash;

      if (result.length > 0) result += ", ";
      
      count++;
      if (count > 10) {
        result += "<br>";
        count = 0;
      }
      result += `<a href="${newUrl.href}">${project}</a>`;
    } else {
      if (result.length > 0) result += ", ";
      result += project;
    }
  });
  
  return result;
};


function gen_mentor_link(params, config) {
  //    console.log("gen_mentor_link: "+config+" "+params.value);
  // Check permission
  if (view.navdata.data.permission && ["observer", "support"].indexOf(view.navdata.data.permission) != -1) {
    
    // Start fresh
    let newUrl = new URL(window.location.origin + window.location.pathname);

    // Set specific params
    newUrl.searchParams.set('config', config);
    newUrl.searchParams.set('mentor', params.value);

    // Copy hash
    newUrl.hash = window.location.hash;

    return `<a href="${newUrl.href}">${params.value}</a>`;
  } else {
    return params.value;
  }
};

function gen_benchmark_link(params) {
  // console.log("gen_benchmark_link: "+config+" "+params.value);

  let targetId = 'cb_' + params.value.replace(/ /g, "_");

  // Start with the current window's location to preserve base path and query params
  let currentUrl = new URL(window.location.href);
  
  let hashParams = new URLSearchParams(currentUrl.hash.substring(1)); // Remove leading '#'
  hashParams.set('page', targetId); // Set or Update 'page'
  currentUrl.hash = hashParams.toString(); 

  let finalUrl = currentUrl.href;
  return `<a href="${finalUrl}" onclick="if (event.metaKey || event.ctrlKey || event.shiftKey) return; view.selectPage('${targetId}'); return false;">${params.value}</a>`;
};

function gen_search_jobid_link(params) {
  let jobid = params.value;
  let result = "";

  if (jobid in view.mapjobid_to_day && view.navdata.data.permission && ["observer", "support"].indexOf(view.navdata.data.permission) != -1) {
    // Start with current URL to preserve config, demo flags, and hash
    let newUrl = new URL(window.location.href);
    
    newUrl.searchParams.set('search_field', 'JobID');
    newUrl.searchParams.set('search_value', jobid);

    // Decode %2F back to / for cleaner looking URLs
    let href = newUrl.href.replace(/%2F/g, '/');

    // Add modifier key check to the onclick string.
    // If Ctrl/Cmd/Middle-click is used, it returns true (allows default browser new tab).
    // Otherwise, it runs apply_search and returns false (stays on page).
    result = `<a href="${href}" onclick="if(event.ctrlKey || event.metaKey || event.button === 1) return true; apply_search('JobID', '${jobid}', true); return false;">${jobid}</a>`;
  } else {
    result = jobid;
  }

  return result;
}

function gen_jobid_list_link(params) {
  let jobidlist = params.value;
  if (!jobidlist) return "";

  let result = "";
  // If it's already an array, use it. If it's a string, split by spaces or commas.
  let jobids = Array.isArray(jobidlist) ? jobidlist : String(jobidlist).split(/[\s,]+/);

  jobids.forEach((item) => {
    let jobidstatus = String(item).trim();
    if (!jobidstatus) return;

    let matches = jobidstatus.match(/(\d+)(\[\w\])?(<br>)?/);
    if (!matches) return;

    let jobid = matches[1];
    let jobstatus = matches[2] ?? "";
    let newline = matches[3] ?? "";

    if (jobid in view.mapjobid_to_day) {
      let newUrl = new URL(window.location.href);
      
      newUrl.searchParams.set('search_field', 'JobID');
      newUrl.searchParams.set('search_value', jobid);

      let href = newUrl.href.replace(/%2F/g, '/');

      result += `<a href="${href}" onclick="if(event.ctrlKey || event.metaKey || event.button === 1) return true; apply_search('JobID', '${jobid}', true); return false;">${jobid}</a>${jobstatus}${newline} `;
    } else {
      result += jobidstatus + " ";
    }
  });

  return result.trim();
}