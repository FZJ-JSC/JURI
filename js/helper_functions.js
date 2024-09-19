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


function cell_color(params,column) {
  return { 'color': params.data[column], 'font-weight': 'bold' };
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


function gen_project_user_link(params,config,project) {
  //    console.log("gen_project_user_link: "+config+" "+params.data[project]+" "+params.value);
  let result = "";
  if (view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
    let url = `index.html?config=${config}&project=${params.data[project]}&user=${params.value}`;
    result = `<a href="${url}">${params.value}</a>`;
  } else {
    result = user;
  }
  return result;
};

function gen_project_link(params,config) {
  //    console.log("gen_project_link: "+config+" "+params.value);
  let result = "";
  if (view.navdata.data.permission && ["observer","support","mentor"].indexOf(view.navdata.data.permission) != -1) {
    let url = `index.html?config=${config}&project=${params.value}`;
    result = `<a href="${url}">${params.value}</a>`;
  } else {
    result = project;
  }
  return result;
};

function gen_mentor_link(params,config) {
  //    console.log("gen_project_link: "+config+" "+params.value);
  let result = "";
  if (view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
    let url = `index.html?config=${config}&mentor=${params.value}`;
    result = `<a href="${url}">${params.value}</a>`;
  } else {
    result = project;
  }
  return result;
};

