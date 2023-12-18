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

Handlebars.registerHelper('gen_project_user_link', function(config,project,user) {
//    console.log("gen_project_user_link: "+config+" "+project+" "+user);
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project+'&user='+user;
  if (view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+user+'</a>';
  } else {
    result = user;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('gen_user_projects_link', function(config,user,projects) {
  let result = "";
  if (!Array.isArray(projects)){
    projects = [projects];
  }
  projects.forEach(function(project) {
//	console.log("gen_user_projects_link: "+config+" "+user+" "+project);
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project+'&user='+user;
  if (view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
    if (result.length > 0) {
      result += ", ";
    }
    result += '<a href="'+url+'">'+project+'</a>';
  } else {
    result += user;
  }
  });
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('gen_projects_link', function(config,projects) {
  let result = "";
  if (!Array.isArray(projects)){
    projects = [projects];
  }
  let count = 0;
  projects.forEach(function(project) {
//	console.log("gen_projects_link: "+config+" "+project);
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project;
  if (view.navdata.data.permission && ["observer","support","project"].indexOf(view.navdata.data.permission) != -1) {
     if (result.length > 0) {
      result += ", ";
    }
    count = count + 1;
     if (count > 10) {
      result += "<br>";
      count = 0;
    }
    result += '<a href="'+url+'">'+project+'</a>';
  } else {
    result += user;
  }
  });
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('gen_project_link', function(config,project) {
//    console.log("gen_project_link: "+config+" "+project);
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project;
  if (view.navdata.data.permission && ["observer","support","mentor"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+project+'</a>';
  } else {
    result = project;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('gen_mentor_link', function(config,mentor) {
//    console.log("gen_mentor_link: "+config+" "+mentor);
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&mentor='+mentor;
  if (view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+mentor+'</a>';
  } else {
    result = mentor;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('gen_search_jobid_link', function(jobid) {
  // console.log("gen_search_jobid_link: ",jobid);
  let result = "";
  if (jobid in view.mapjobid_to_day && view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="javascript:void(0)" onclick="apply_search(\'jobid\','+jobid+',true)">'+jobid+'</a>';
  } else {
    result = jobid;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('gen_jobid_list_link', function(jobidlist) {
  // console.log("gen_jobid_list_link: ",jobidlist);
  let result = "";
  var jobids = jobidlist.split(/[\s]+/); // Splitting jobs and eventual status
  jobids.forEach((jobidstatus) => {
    matches = jobidstatus.match(/(\d+)(\[\w\])?(<br>)?/);
    jobid = matches[1];
    jobstatus = matches[2] ?? "";
    newline = matches[3] ?? "";
    if (matches[1] in view.mapjobid_to_day) {
      result += '<a href="javascript:void(0)" onclick="apply_search(\'jobid\','+jobid+',true)">'+jobid+'</a>'+jobstatus+newline+" ";
    } else {
      result += jobidstatus+" ";
    }
  })
  return new Handlebars.SafeString(result);
});
  

Handlebars.registerHelper('user_link_jobr', function(project,user,config_prefix,system) {
  // console.log("user_link1: "+project+" "+user+" "+system);
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_user';
  config += (!system || typeof system != "string")?"":"_system";
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project+'&user='+user;
  url += (!system || typeof system != "string")?'':'&system='+system;
  if (view.navdata.data.permission && ["observer","support","project","advisor","mentor"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+((!system || typeof system != "string")?user:system)+'</a>';
  } else {
    result = (!system || typeof system != "string")?user:system;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('mentor_link', function(user,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_mentor';
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&user='+user;
  if (view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+ user +'</a>';
  } else {
    result = user;
  }
  return new Handlebars.SafeString(result);
  });

Handlebars.registerHelper('project_link', function(project,config_prefix,system) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_project';
  config += (!system || typeof system != "string")?"":"_system";
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project;
  url += (!system || typeof system != "string")?'':'&system='+system;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor","project"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+((!system || typeof system != "string")?project:system)+'</a>';
  } else {
    result = (!system || typeof system != "string")?project:system;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('projectbudget_link', function(project,budget,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_budget';
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project+'&budget='+budget;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor","project"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+budget+'</a>';
  } else {
    result = budget;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('supportquota_link', function(project,budget,system,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_support_quota';
  if (view.navdata.data.permission && ["observer"].indexOf(view.navdata.data.permission) != -1) {
    config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_observer_quota';
  }
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project+'&budget='+budget+'&system='+system;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor","project","pipa"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+system+'</a>';
  } else {
    result = system;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('projectquota_link', function(project,budget,system,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_quota';
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project+'&budget='+budget+'&system='+system;
  if (view.navdata.data.permission && ["observer","support","mentor","pipa"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+system+'</a>';
  } else {
    result = system;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('useronly_link', function(user,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_user';
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&user='+user;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor","project","user"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+user+'</a>';
  } else {
    result = user;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('pipaonly_link', function(pipa,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_pipa';
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&pi_pa='+pipa;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor","pipa"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+pipa+'</a>';
  } else {
    result = pipa;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('mentoronly_link', function(mentors,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_mentor';
  let result = "";
  if (!Array.isArray(mentors)){
    mentors = [mentors];
  }
  mentors.forEach(function(mentor) {
    let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&mentor='+mentor;
    if (result.length > 0) {
    result += ", ";
    }
    if (view.navdata.data.permission && ["observer","support","advisor","mentor"].indexOf(view.navdata.data.permission) != -1) {
      result += '<a href="'+url+'">'+mentor+'</a>';
    } else {
      result += mentor;
    }
  });
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('tagonly_link', function(tag,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_inspector';
  let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&tag='+tag;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+tag+'</a>';
  } else {
    result = tag;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('user_link', function(project,budget,login,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_user';
  // console.log("user_link2: "+project+" "+budget+" "+login);
   let result = "";
  let url = 'index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&project='+project+'&budget='+budget+'&user='+login;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor","project","user"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+login+'</a>';
  } else {
    result = login;
  }
  return new Handlebars.SafeString(result);
});


Handlebars.registerHelper('dataproject_link', function(project,config_prefix,fs) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.fs:config_prefix)+'_dataproject';
  config += (!fs || typeof fs != "string")?"":"_fs";
  let result = "";
  let url = 'index.html?config='+config+'&project='+project;
  url += (!fs || typeof fs != "string")?'':'&fs='+fs;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor","project","pipa"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+((!fs || typeof fs != "string")?project:fs)+'</a>';
  } else {
    result = (!fs || typeof fs != "string")?project:fs;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('mentorsnapshot_link', function(spec,mentor,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_mentor';
  let result = "";
  let url = './snapshots/'+spec+'/index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"")+'&mentor='+mentor;
  if (view.navdata.data.permission && ["observer","support","advisor","mentor"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+spec+'</a>';
  } else {
    result = spec;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('supportsnapshot_link', function(spec,config_prefix) {
  let config = ((!config_prefix || typeof config_prefix != "string")?view.navdata.data.system:config_prefix)+'_support';
  let result = "";
  let url = './snapshots/'+spec+'/index.html?config='+config+((view.navdata.data.demo || view.url_data.demo)?"&demo":"");
  if (view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="'+url+'">'+spec+'</a>';
  } else {
    result = spec;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('cell_color', function(value,defscale) {
  if (typeof value === "number" && value >= 0 && value <= 1) {
    let colorscale_name;
    let color_wheel;
    // Getting colorscale name
    if (!(typeof defscale === "string")) {
      // from initial_data or default
      colorscale_name = view.inital_data.colors.colorscale ?? view.default_colorscale;
    } else {
      if (value <= 0.01 ) {
        // return white background if value is too small (only for colorscales passed in argument)
        return 'background-color: #fff; color: #000;';
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
      return `background-color: ${color_wheel[ind]}; color: ${dark ? '#fff' : '#000'};`;
    } else {
      return "";
    }
  } else {
    return "";
  }
});

Handlebars.registerHelper('mreporttemplate_link', function(filename,mentor) {
  if (view.navdata.data.permission && ["observer","support","project","advisor","mentor"].indexOf(view.navdata.data.permission) != -1) {
    result = '<a href="data/'+((view.navdata.data.demo || view.url_data.demo)?'DEMO/':'')+'mentor/'+mentor+'/reports/'+filename+'" type="text/plain" download>'+filename+'</a>';
  } else {
    result = 'TXT';
  }
  return new Handlebars.SafeString(result);
  
});

Handlebars.registerHelper('pdf_link', function(grp,user,filename) {
//    console.log("pdf_link: "+grp+" "+user+" "+filename);
  if ( (filename) && (filename!='-') ) {
    let url = 'data/'+((view.navdata.data.demo || view.url_data.demo)?'DEMO/':'')+"projects/"+grp+'/'+user+'/'+((typeof filename !== 'undefined')?filename:'#');
    result = `<a href="${url}" ><span class="fa fa-file-pdf-o" title="Download job report" aria-label="Download PDF job report"/></a>`;
  } else {
    result = `<span style="color: grey;" class="fa fa-file-pdf-o" title="No job report available" aria-label="No job report available"/>`;
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('html_link', function(grp,user,filename) {
  if ( (filename) && (filename!='-') ) {
    let url = 'data/'+((view.navdata.data.demo || view.url_data.demo)?'DEMO/':'')+"projects/"+grp+'/'+user+'/'+((typeof filename !== 'undefined')?filename:'#');
    result = `<a href="${url}" ><span class="fa fa-area-chart" title="Show job report" aria-label="Show HTML job report"/></a>`;
  } else {
    result = `<span style="color: grey;" class="fa fa-area-chart" title="No job report available" aria-label="No job report available"/>`;
  }
  return new Handlebars.SafeString(result);
});


Handlebars.registerHelper('ioi_link', function(objectid) {
  if ( (objectid) && (objectid!='-') && (objectid!='-1') ) {
    let url = `http://dp-ioi/#/dashboard/job-details/${objectid}`;
    result = '<a href="'+url+'" >' +
      '<span class="fa fa-puzzle-piece" title="IOI report (external)"/></a>';
  } else {
    result = '<span style="color: grey;" class="fa fa-puzzle-piece" title="No IOI data available"/>';
  }
  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper('ioi_wf_link', function(objectid) {
  if ( (objectid) && (objectid!='-') && (objectid!='-1') ) {
    let url = `http://dp-ioi/#/dashboard/workflow-details/${objectid}`;
    result = '<a href="'+url+'" >' +
      '<span class="fa fa-puzzle-piece" title="IOI WF report (external)"/></a>';
  } else {
    result = '<span style="color: grey;" class="fa fa-puzzle-piece" title="No IOI data available"/>';
  }
  return new Handlebars.SafeString(result);
});

function round_number_generic(number, ignore_null, dec_places) {
  let places = (dec_places === undefined || typeof dec_places != "number")?2:dec_places;
  if (ignore_null && (number == 0 || number === null)) {
    return "";
  } else {
    return parseFloat(number).toLocaleString('en',{minimumFractionDigits: places, maximumFractionDigits: places});
  }
};

Handlebars.registerHelper('round_number', function(number, dec_places) {
  return round_number_generic(number, false, dec_places);
});

Handlebars.registerHelper('round_number_or_null', function(number,dec_places) {
  return round_number_generic(number, true, dec_places);
});

Handlebars.registerHelper('percent', function(number) {
  let value = parseFloat(number*100.0).toLocaleString('en',{minimumFractionDigits: 2, maximumFractionDigits: 2});
  if (number !== undefined) {
    value += "%";
  }
  return value;
});
Handlebars.registerHelper('Ppercent', function(number) {
  let value = parseFloat(number).toLocaleString('en',{minimumFractionDigits: 2, maximumFractionDigits: 2});
  if (number !== undefined) {
    value += "%";
  }
  return value;
});

Handlebars.registerHelper('round_number_or_null_int', function(number) {
  return round_number_generic(number, true, 0);
});

Handlebars.registerHelper('times', function(n, block) {
  var accum = '';
  for(var i = 0; i < n; ++i)
    accum += block.fn(i);
  return accum;
});
