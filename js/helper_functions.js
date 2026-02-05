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

function hhmm_short(number) {
  let hoursfrac = Math.floor(number.value+1)/3600
  let days=Math.floor(hoursfrac/24); 
  let rest=hoursfrac-(days*24);
  let hours=Math.floor(rest); 
  let ret;
  rest=rest-hours;
  min=Math.floor(rest*60);  
  if(days>0) {
    ret=`${days}d${hours.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})}h${min.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})}m`;
  } else if(hours>0) {
    ret=`${hours}h${min.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})}m`;
  } else {
    ret=`${min}m`;
  }
  // console.log(number.value,(number.value+1)/3600,hoursfrac,days,rest,hours,min,ret)
  return ret;
};


function cell_color(params,column) {
  let color_obj;
  if (column) {
    color_obj = { 'color': params.data[column], 'font-weight': 'bold' }
  } else {
    if ((params.value == "SUCCESSFUL")||(params.value == "COMPLETED")) {
      color_obj = { 'color': '#008000', 'font-weight': 'bold' }
    } else if (params.value == "FAILED") {
      color_obj = { 'color': 'red', 'font-weight': 'bold' }
    } else if (params.value == "RUNNING") {
      color_obj = { 'color': 'blue', 'font-weight': 'bold' }
    } else {
      color_obj = { 'color': '#daa621', 'font-weight': 'bold' }
    }
  }
  return color_obj;
}


function cell_status(params) {
  if (!params.value) return '';

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

  const statusArray = params.value.split('');
  
  // gap: 0px ensures items touch
  let html = '<div style="display: flex; align-items: center; gap: 0px; vertical-align: middle;">';

  statusArray.forEach((char) => {
    if (char === '-') {
      /**
       * We use a div instead of a character dash to eliminate font-spacing.
       * width: 6px makes it a short bridge, height: 2px is the line thickness.
       */
      html += '<div style="width: 6px; height: 2px; background-color: #bfbfbf; flex-shrink: 0; margin: 0;"></div>';
    } else if (colors[char]) {
      const c = colors[char];
      const p = paths[char];
      
      /**
       * width/height 16px. 
       * The path starts at 0 on a 14-unit viewBox, 
       * so it will touch the neighbors perfectly at 0px gap.
       */
      html += `
        <div title="${c.title}" style="display: flex; flex-shrink: 0; width: 16px; height: 16px; margin: 0; padding: 0;">
          <svg width="16" height="16" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <g fill-rule="evenodd">
              <path d="M0 7a7 7 0 1 1 14 0A7 7 0 0 1 0 7z" fill="${c.main}" />
              <path d="M13 7A6 6 0 1 0 1 7a6 6 0 0 0 12 0z" fill="${c.bg}" />
              <path d="${p}" fill="${c.main}" />
            </g>
          </svg>
        </div>`;
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
  } else {
    icon = "fa-file-pdf-o";
    title = "Download job report"
    text = "Download PDF job report"
  }
  if ( (filename) && (filename!='-') ) {
    let url = `data/${((view.navdata.data.demo || view.url_data.demo)?'DEMO/':'')}projects/${projectname}/${username}/${((typeof filename !== 'undefined')?filename:'#')}`;
    result = `<a href="${url}" ><span class="fa ${icon}" title="${title}" aria-label="${text}"/></a>`;
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