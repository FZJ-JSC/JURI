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

// Global variable to store the view of the page
var view;

/** 
 * View object constituting most of the website: configuration, URL, filepaths
 * @param {object} parameters Parameters from URL that is parsed via getURLParameter()
 *                            It includes config elements after ? and initial parameters after #
 **/
function View(parameters) {
  // Getting config filename
  this.config = (parameters.config.config) ? parameters.config.config.toLowerCase() : "empty";
  // Getting full config for eventual Handlebars
  this.url_data = parameters.config;
  // Setting initial parameters (page, filters, colors, sort)
  this.initial_data = parameters.inital;
  // Store all the scripts and styles required for the pages
  this.addons = { 
                  scripts: new Set(),
                  styles: new Set(),
                }
  // Deferrer array to store items to be waited
  this.deferrer = [];
  // Deferrer counter
  this.counter = 0;
  // Store selected page and subpage
  this.clicked_page = null;     // Page to be shown (after clicking)
  this.selected_page = null;    // Shown page (before clicking)
  this.selected_subpage = null;
  this.page_data = null;
  this.page_template = null;
  this.page_context = null;
  this.page_functions = null;
  // Store all pages
  this.all_page_sections = [];
  // Store default section (if more than one is selected, keeps the last one)
  this.default_section = null;
  // Store all column groups and their mapping
  this.column_groups = {};
  // Store timers
  this.runningTimer = [];
  // Store intervals
  this.refreshinterval = null;
  this.presentationjobinterval = null; // Interval between jobs in presentation mode
  this.presentationtabinterval = null; // Interval between tabs in presentation mode
  // Store resize functions that are used in Live/Client view
  this.resize_function = [];
  // Store footer size for this section
  this.footersize = null;
  // Flag to store empty pages
  this.empty = true;
  // Available colorscales on dropdown
  this.colorscale = ['RdYlGn','Spectral','RdYlBu','RdGy','RdBu','PiYG','PRGn','BrBG','PuOr_r'];
  this.default_colorscale = 'RdYlGn';
  this.used_colorscales = {}; // Object to store generated colorscales
  // Headers on main table of the current page
  this.headers = {};      // Headers per page
  this.headerToName = {}; // Mapping of header title to headerName, per page
  this.nameToHeader = {}; // Mapping of headerName to header title, per page
  // map of jobID to day
  this.mapjobid_to_day = {};
  // Store contexts (contents of tables) to be used for applying the data to the grid
  this.contexts = {};
  // Store the Grid (table)
  this.gridApi = null;
  this.gridState = {};
  // Store column definitions for grid
  this.columnDefs = null;
}

/**
 * Main method of the view object, which parses the configuration and creates/applies the selected page (from the URL)
 */
View.prototype.show = function () {
  let self = this;

  // Add loading screen
  self.loading(true);

  // Parsing reference data from json
  self.deferrer.push($.getJSON("json/ref.json", function (json_data) {
    self.refdata = json_data;
    return;
  }));

  // Parsing configuration data from json
  let config_path = process_path(self.config + ".json", "json/");
  self.deferrer.push($.getJSON(config_path, function (json_data) {
    self.navdata = json_data;
    // console.log('self.navdata from config',self.navdata)
    return;
  }));

  // When ref and config json files have been loaded, proceed with the loading/configuration
  $.when.apply($, self.deferrer).done(function () {
    // Restarting deferrer as the current ones are done
    self.deferrer.length = 0;

    // info_str to be written on the "footer_infoline" (above the bottom graphs, when they are present)
    // (such as project / user name from URL)
    let info_str = "";
    // console.log('self.url_data',self.url_data)
    for (let key in self.url_data) {
      if (key != "config") {
        // Escape expressions to be safe to add to HTML
        info_str += Handlebars.escapeExpression(key.capitalize()) + ": <strong>" + Handlebars.escapeExpression(self.url_data[key]) + "</strong>; ";
      }
    }
    // Remove last 2 characters "; "
    $("#view_data_info").html(info_str.substring(0, info_str.length - 2));

    // Processing configuration
    if (self.navdata.pages) {
      self.navdata.pages.forEach(function (elem) {
        // Adding d3 script to use colorscales on 'cell_color' helper function
        // self.addons.scripts = new Set([...self.addons.scripts])

        // If there are (sub-)pages inside
        if (elem.pages) {
          elem.pages.forEach(function (inner_elem) {
            self.getPagesInfo(inner_elem);
          });
        } else {
          self.getPagesInfo(elem);
        }
      });
    }
    // Adding scripts and styles to the page deferring them
    for (let type in self.addons) {
      if (self.addons[type]) {
        self.addons[type].forEach((entry) => {
          self.deferrer.push($.Deferred(function () { self[`add${type.charAt(0).toUpperCase()+type.slice(1, -1)}`](entry, this); return; }));
        });
        // Adding counter to skip scripts
        self.counter += self.addons[type].size;
      }
    }
    // console.log("self.addons.scripts",self.addons.scripts)
    // console.log("self.addons.styles",self.addons.styles)
    // console.log("self.all_page_sections",self.all_page_sections)

    // Applying initial template for navigation
    // The deferrer for the scripts is also synchronised at this point
    self.applyTemplates(
      {
        "element": "#navbarSupportedContent",
        "template": "navigation",
        // "element": "#header",
        // "template": "header",
        "context": self.navdata
      }, 
      // Post-processing function after the navigation is ready
      function () {
        if (false) {
          // ****** Close button on alert ******
          $("body").prepend("<div class='alert'><span class='closebtn'>&times;</span> Unfortunately, after the power outage on 08.03.2023, we lost one of our hard drives that contained monitoring information of JUSUF and DEEP. We are setting up a new server to restart monitoring, which will be ready on the next days. Sorry for the inconvenience.</div>");
          var close = document.getElementsByClassName("closebtn");
          var i;
          
          for (i = 0; i < close.length; i++) {
            close[i].onclick = function(){
              var div = this.parentElement;
              div.style.opacity = "0";
              setTimeout(function(){ div.style.display = "none"; }, 600);
            }
          }
          // ***********************************
        }

        // Title from configuration (including eventual logo)

        // System name or list
        let systemname_menu = self.build_system_menu(self.navdata)
        $("#title").append(systemname_menu)

        // Adding view
        $("#title").append($('<div>').text(`${self.navdata.data.permission.capitalize()} view`));
        // Adding document title
        $(document).attr("title", `${self.navdata.data.system.replace('_', ' ')}: ${self.navdata.data.permission.capitalize()} view`);

        // Add Home button to go to login page
        let button = $('<button>',{type: "button", class: 'inner-circle', title: 'Go to login page'}).attr("aria-label",'Go to login page').addClass("fa").addClass("fa-home");
        $('#home').prepend(button)
        button.on('mousedown', (e) => {
          let handlerin,handlerout, doc = $(document);
          e.preventDefault();
          button.addClass('active');
          button.on('mouseenter', handlerin = () => {button.addClass('active');})
                .on('mouseleave', handlerout = () => {button.removeClass('active');})
          doc.on('mouseup', (e) => {
            button.removeClass('active');
            button.off('mouseenter', handlerin)
            button.off('mouseleave', handlerout)
          })
        })
        button.on('click',(e) => {
          e.preventDefault();
          // Clicking with control or metakey opens a new tab/window
          if (e.ctrlKey || e.metaKey) {
            window.open(self.navdata.home,'_blank')
          } else {
            window.location.href = self.navdata.home;  
          }
          return;
        });
        // Clicking with middle mouse button opens a new tab/window
        button.on('auxclick',(e) => {
          if (e.button == 1) {
            window.open(self.navdata.home,'_blank')
          }
          return;
        });

        // Add system image to go to login page
        // if (self.navdata.image) {
        //   $('#system_picture').prepend($('<img>',{src: self.navdata.image.toLowerCase(), alt:"System picture", height: $("#header").height()-5, width: 50, css: {"object-fit": "contain"}}))
        //   if (self.navdata.home) {
        //     $("#system_picture").click(function () {
        //       window.location.href = self.navdata.home;
        //       return;
        //     });
        //     $("#system_picture").addClass("clickable");
        //   }
        // }

        // If logo is set on configuration (currently only on LLview and not on KontView)
        if (self.navdata.logo) {
          // Change favicon
          $("#favicon").attr("href","data:image/svg+xml,%3Csvg height='100%25' stroke-miterlimit='10' style='fill-rule:nonzero;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;' version='1.1' viewBox='0 0 32 32' width='100%25' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cpath d='M8.02154 13.6133L8.03331 23.6475L10.2411 23.6597L12.4489 23.6718L12.4489 25.7506L12.4489 27.8294L18.7334 27.8294L25.018 27.8294L25.018 26.6379L25.018 25.4464L20.0885 25.4464L15.1589 25.4464L15.1589 24.5587L15.1589 23.6709L17.869 23.6709L20.5791 23.6709L20.5791 22.456L20.5791 21.2412L17.869 21.2412L15.1589 21.2412L15.1589 14.4894L15.1589 7.73754L13.8039 7.73754L12.4489 7.73754L12.4489 14.4894L12.4489 21.2412L11.5844 21.2412L10.72 21.2412L10.72 12.4101L10.72 3.57898L9.36489 3.57898L8.00972 3.57898L8.02154 13.6133' fill='%23023d6b' fill-rule='evenodd' opacity='1' stroke='none'/%3E%3Cpath d='M15.0868 0.0309399C9.2877 0.347224 4.09586 3.83135 1.56139 9.10753C-0.520462 13.4413-0.520462 18.5745 1.56139 22.9083C5.1584 30.3963 13.8239 33.894 21.607 30.9994C25.9088 29.3995 29.3916 25.9168 30.9915 21.615C32.5077 17.538 32.307 12.997 30.4386 9.10753C28.097 4.233 23.5169 0.89078 18.1603 0.147847C17.6781 0.080936 16.1368-0.0254576 15.8598-0.0109727C15.7956-0.0076085 15.4477 0.0112218 15.0868 0.0309399M8.02154 13.6133L8.03331 23.6475L10.2411 23.6597L12.4489 23.6718L12.4489 25.7506L12.4489 27.8294L18.7334 27.8294L25.018 27.8294L25.018 26.6379L25.018 25.4464L20.0885 25.4464L15.1589 25.4464L15.1589 24.5587L15.1589 23.6709L17.869 23.6709L20.5791 23.6709L20.5791 22.456L20.5791 21.2412L17.869 21.2412L15.1589 21.2412L15.1589 14.4894L15.1589 7.73754L13.8039 7.73754L12.4489 7.73754L12.4489 14.4894L12.4489 21.2412L11.5844 21.2412L10.72 21.2412L10.72 12.4101L10.72 3.57898L9.36489 3.57898L8.00972 3.57898L8.02154 13.6133' fill='%23ffffff' fill-rule='evenodd' opacity='1' stroke='none'/%3E%3C/svg%3E");

          // Add auto-refresh button when logo is present
          self.add_autorefresh();

          // Add presentation mode button when logo is present
          if (self.navdata.data.permission == "support") {
            self.add_presentation();
          }

          // Add logo
          $('#logo').prepend($('<img>',{src: self.navdata.logo, alt:"LLview logo", height: $("#header").height()-5, width: 72}))
          $("#logo").click(function () {
            window.location.href = "https://llview.fz-juelich.de/";
            return;
          });
          $("#logo").addClass("clickable");
        }

        let inital_page = ""
        let inital_subpage = ""
        if (typeof (Storage) !== "undefined") {
          // If browser support local storage, get the 'last_page' to set as initial page
          inital_page = sessionStorage.getItem("last_page")
          if (inital_page) {
            [inital_page,inital_subpage] = inital_page.split('-');
          }
        }
        if (self.initial_data.page) {
          // If initial_data is set, set initial_date (overwrite previous condition above)
          [inital_page,inital_subpage] = self.initial_data.page.split('-');
        }
        if (inital_page && self.all_page_sections.indexOf(inital_page) != -1) {
          // If initial_data is set and that page is present on the sections of the page, select it
          self.selectPage([inital_page,inital_subpage], false);
        } else if (self.default_section) {
          // Otherwise, select default_section
          self.selectPage(self.default_section);
        }
        return;
      }
    );
    return;
  });
}

/**
 * 
 */
View.prototype.get_system_status = async function (statusfile,systemname) {
  // Getting system status
  if (!statusfile) { return; }
  let lastMod = null;
  let systemmap = {
    'SYSTEM': 'JURECA DC',
    'JURECA-DC': 'JURECA DC',
    'JUWELS BOOSTER': 'JUWELS Booster',
    'JUWELS': 'JUWELS Cluster',
    'JEDI': 'JEDI',
    'DEEP': 'DEEP',
    'JUSUF': 'JUSUF HPC',
  };
  let health = null;
  let id = null;
  await fetch(statusfile).then(r => {
      lastMod = new Date(r.headers.get('Last-Modified'));
      now = new Date();
      return (now-lastMod)/1000 > 600 ? "" : r.json();
  }).then((data) => {
    if (!data.length) { return; }
    if (typeof data === 'object') {
      data.forEach((service) => {
        if (systemmap[systemname] == service['name']) {
          health = service['health'].toString();
          id = service['id'];
        }
      })
    }
  })
  return [health,id]
}

/**
 * Creates system menu (when navdata.systems is present)
 * 
 * @param {Obj} navdata 
 * @returns DOM element with system menu or ust system name
 */
View.prototype.build_system_menu = function (navdata) {
  // Obtained icons and function from system-status-page:
  function getStatusForHealth(health) {
    switch (health) {
      case '0':
        toReturn = "Healthy"
        break
      case '10':
        toReturn = "Annotation"
        break
      case '20':
        toReturn = "Minor"
        break
      case '30':
        toReturn = "Medium"
        break
      case '40':
        toReturn = "Major"
        break
      case '50':
        toReturn = "Critical"
        break
    }
    return toReturn
  }
  function getVerboseHealth(health) {
    switch (health) {
      case '0':
      case '10':
        return "healthy"
      case '20':
        return "minorly degraded"
      case '30':
        return "degraded"
      case '40':
        return "majorly degraded"
      case '50':
        return "unavailable"
      default:
        return "unknown"
    }
  }

  let self = this;
  const current_system_name = navdata.data.system.replace('_', ' ').toUpperCase()
  var systemname_menu = $('<div>').attr("id","system")
  // When there navdata.systems is given, create a dropdown-menu with the systems
  if (navdata.systems && Object.keys(navdata.systems).length > 0) {
    // Preparing the link at the title bar
    var systemname_dropdown = $("<div>")
    systemname_dropdown.addClass("dropdown-menu")
                       .attr("aria-labelledby","systemname_dropdown_button")
    var systemname_link = $('<a>').text(current_system_name+(navdata.demo ? " DEMO" : ""))
                                  .addClass('dropdown-toggle')
                                  .attr("data-toggle","dropdown")
                                  .attr("aria-haspopup","true")
                                  .attr("aria-expanded","false")
    // For each system on the list navdata.systems
    Object.entries(navdata.systems).sort().forEach(([system, folder]) => {
      let this_system_name = system.toUpperCase()
      // Creating link for the current system
      let current_link = $("<a>").addClass("dropdown-item")
                                 .attr("onclick",`view.changeSystem('${folder}')`)
                                 .append($('<span>').text(this_system_name))
      // Get current system status (if present) and then add to dropdown menu
      self.get_system_status(navdata.status?navdata.status.file:null,this_system_name.replace(" DEMO","")).then((health_id) => {
        // If health was obtained, add image to menu
        if (health_id.length) {
          let health = health_id[0];
          let status = getStatusForHealth(health);
          let status_verbose = getVerboseHealth(health);
          let text = `${this_system_name.replace(" DEMO","")} is currently ${status_verbose}`;
          let status_img = $('<img>').attr('src', `img/Maintenance-Server-JSC-v3_${status}.svg`)
                                     .attr('alt', text)
                                     .attr("title",text)
                                     .attr('data-toggle', "tooltip")
                                     .on( "mouseover", function(event) {
                                          systemname_menu.tooltip('hide')
                                          event.stopPropagation() // Prevent tooltip on parent from showing
                                        });
          current_link.prepend(status_img)
        }
      });
      
      // Checking current system name to select it
      if (this_system_name == current_system_name+(navdata.demo ? " DEMO" : "")) {
        current_link.addClass("selected");
      }
      // Append to the menu
      systemname_dropdown.append(current_link)

      return;
    });
    systemname_dropdown.on( "mouseover", function(event) {
                              systemname_menu.tooltip('hide')
                              event.stopPropagation() // Prevent tooltip on parent from showing
                            });
    systemname_menu.append(systemname_link)
                   .append(systemname_dropdown)
    systemname_menu.attr("title","Click to open system list")
                   .attr('data-toggle', "tooltip")
                   .attr('data-html', "true")
                   .attr('data-placement', "bottom")
  } else {
    // When the menu is not added, add system status directly on title

    // Get system status (if present)
    self.get_system_status(navdata.status?navdata.status.file:null,current_system_name).then((health_id) => {
      // If health was obtained, add image to menu
      if (health_id) {
        let health = health_id[0];
        let id = health_id[1];
        let status = getStatusForHealth(health);
        let status_verbose = getVerboseHealth(health);
        let text = `${current_system_name} is currently ${status_verbose}${navdata.status.link?'. Click to see more details.':''}`;
        let status_img = $('<img>').attr('src', `img/Maintenance-Server-JSC-v3_${status}.svg`)
                                   .attr('alt', text)
        let status_page = navdata.status.link?navdata.status.link.replace('@@id@@',id):"javascript:void(0);";
        let status_link = $('<a>').attr('href', status_page)
                                  // .attr('target', "_blank")
                                  .attr('aria-label', text)
                                  .attr('title', text)
                                  .attr('data-toggle', "tooltip")
                                  .attr('data-html', "true")
                                  .attr('data-placement', "bottom")
                                  .html(current_system_name+(navdata.demo ? " DEMO" : ""))
                                  .prepend(status_img);
        let status_button = $("<button>").attr('type','button')
                                         .prepend(status_link)
        systemname_menu.prepend(navdata.status.link?status_button:status_link);
      } else {
        // If health was not obtained, add only the name
        systemname_menu.text(current_system_name)
      }

    });
  }
  return systemname_menu;
}


/**
 * Function to change between the systems when clicking on the system selector
 * This considers that the address is of the form: (...)/system_name/(...)
 * @param {string} system system name to be redirected to
 */
View.prototype.changeSystem = function (system) { 
  const current = new URL(window.location); 
  current.pathname = current.pathname.replace(/^\/(.*?)\//, `/${system}/`); 
  window.location.href = current.href ; 
  return; 
}

/**
 * Select a page (outer or inner element)
 * @param {object} page Object containing information on the page to be loaded
 * @param {boolean} reset_initial_params Option to reset all parameters
 */
 View.prototype.selectPage = async function (page, reset_initial_params, reload = true, postprocess) {
  let self = this;
  let subpage = null;
  let page_data = {};

  // Updating map between jobid to day (can be used to check if job exists)
  self.mapjobid_to_day = await update_mapjobid_to_day();

  if (Array.isArray(page)) {
    /* Adding the possibility of changing to a subpage when selectPage is called */
    subpage = parseInt(page[1]);
    page = page[0];
  }

  // Updating clicked page
  self.clicked_page = page

  if ( !reload && (self.selected_page == page) && (!subpage || (self.selected_subpage == subpage))) {
    // Same page and subpage, nothing to do
    return;
  }

  // Remove keydown events
  $(document).off("keydown");

  // If the page has changed
  if (self.selected_page != page) {
    // Adding or updating loading screen
    self.loading(true)

    // Automatically close navbar on small devices
    $(".navbar-collapse").collapse('hide');
    reset_initial_params = (typeof (reset_initial_params) !== "undefined") ? reset_initial_params : false;

    // Stop all view specific timer
    while (self.runningTimer.length > 0) {
      clearInterval(self.runningTimer.pop());
    }

    // Remove old page data
    self.page_data = null;
    self.footer_graph = null;
    self.resize_function = [];
    self.graph = null;

    // Clean old content, footer, infoline and filter elements
    $("#main_content").empty();
    $("#main_content").empty();
    $("#filter").empty();
    $("#options").empty()
    $("#footer_graphs").empty();
    $("#footer_infoline_page_options").empty();
    $('#footer_infoline > #dragger').remove();
    $("footer").height($("#footer_infoline").height() + $("#footer_footer").height());
    self.gridApi = null;

    // Search for page entry
    // Toggle navigation entry
    $("nav li").removeClass("active");
    self.navdata.pages.forEach(function (elem) {
      if (elem.pages) {
        elem.pages.forEach(function (inner_elem) {
          if (inner_elem.section == page) {
            Object.assign(page_data, inner_elem);
            $("#" + elem.section + "_dropdown_button").addClass("active");
          }
        });
      } else if (elem.section == page) {
        Object.assign(page_data, elem);
        $("#" + page + "_button").addClass("active");
      }
    });

    // Add reference data, that is added from the "ref" keyword on yaml
    self.add_refdata(page_data)
    // TODO: Should we enforce this or do we leave for the scripts in the configuration only (either scripts or ref)?
    // If we enforce, this should be before adding the scripts to the page
    // with a check if any page has (data.footer_graph_config || data.graph_page_config)
    // Add scripts and layout for graphs (footer_graph and graph_page)
    // But here the call to init_footer_graphs or init_graphs_page should remain
    self.add_graph_data(page_data)

    // Store current data, template, context and functions to reuse when needed
    self.page_data = (page_data.data) ? page_data.data : null;
    self.page_description = (page_data.description) ? page_data.description : null;
    self.page_template = (page_data.template) ? page_data.template : null;
    self.page_context = (page_data.context) ? page_data.context : null;
    self.page_functions = (page_data.functions) ? page_data.functions : null;
  }
  // Updating page_context depending on subpage
  self.page_context = ((typeof subpage === 'number')&&(!isNaN(subpage))) ? self.get_history_context(subpage) : replaceDataPlaceholder(self.page_context);

  self.applyTemplates([
    {
      "element": "#main_content",
      "template": self.page_template,
      "context_location": self.page_context,
      // "scripts": page_data.scripts,
      // "styles": page_data.styles
    },
    {
      "element": "#footer_content",
      "template": page_data.footer_template
    }], 
    function () {
      if (self.page_functions) {
        // Call functions for the given page or reference
        self.page_functions.forEach(function (function_name) {
          if (window[function_name]) {
            window[function_name]();
          }
        });
      }

      if ((typeof subpage === 'number')&&(!isNaN(subpage))) {
        // Calling subpage with given number
        self.initDates(subpage);
        // set_filter();
      }
      if ((self.selected_page == page) && (self.footer_graph)) {
        // Adding handler (only if on the same page, as footer already exists and handler will not be added)
        self.footer_graph.add_event_handler();
      }
      // Add colorscale controls
      // self.add_colorscale_controls();

      // Resize view and reset autoresize
      resize();
      // Remove loading element
      if (self.gridApi) {
        self.gridApi.setGridOption('onGridReady', () => self.loading(false));
      } else if (page != 'live') {
        self.loading(false);
      }

      // Add button that shows more information about current page (when a description is given)
      if (self.page_description) {
        self.add_infobutton(self.page_description);
      } else {
        $("#information").empty()
      }

      // Set title overlay/tooltip handling
      self.apply_tooltip($('[title]'));
      // Show menus on mouse hover
      self.add_dropmenu_hover();
      // Set focus on main content to allow direct scrolling
      $("#main_content").focus();

      // Remove previous page as selected and mark new one as selected
      $(`#${self.selected_page}_dropdown_item`).removeClass("selected");
      $(`#${page}_dropdown_item`).addClass("selected");

      // Getting table headers (when present)
      self.getHeaders();

      // Change selected page and subpage to the new input page
      self.selected_page = page;
      self.selected_subpage = subpage;

      // Post-process function after selecting page
      if (postprocess) {
        postprocess()
      }
      return;
    });
  // Store page
  if (typeof (Storage) !== "undefined") {
    sessionStorage.setItem("last_page", subpage ? `${page}-${subpage}` : page);
  }

  if (reset_initial_params) {
    self.initial_data = {};
  }
  self.initial_data.page = subpage ? `${page}-${subpage}` : page;
  
  // Setting Hash on URL
  self.setHash(true);
  // Update info in footer_footer
  self.update_status_info()
  return;
}

/**
 * Updates the status info text on the footer_footer bar
 */
View.prototype.update_status_info = function () {
  let self = this;
  // If there is no info on the navdata.info object, return
  if (! self.navdata.info) return

  // Transform to Array if it's not one already (to be able to loop)
  self.navdata.info = Array.isArray(self.navdata.info) ? self.navdata.info : [self.navdata.info];

  // Getting required data
  let deferrer = Array();
  let info = {};
  for (let i = 0; i < self.navdata.info.length; ++i) {
    filepath = replaceDataPlaceholder(self.navdata.info[i])
    deferrer.push($.getJSON(filepath, (data) => {
      info[filepath] = data;
      return;
    }));
  }
  // When all data is downloaded, apply to the status info
  $.when.apply($, deferrer).then(function () {
    // Cleans the current status info
    $("#view_status_info").empty();
    // Looping over info
    for (let text of Object.values(info)) {
      let info_str = "";
      // Transforming to Array when it is not, to make sure it is interable
      texts = Array.isArray(text) ? text : [text];
      for (let i = 0; i < texts.length; ++i) {
        for (let key in texts[i]) {
          info_str += key.capitalize().replace(/[_]/g," ") + ": " + texts[i][key];
        }
      }
      // Add information to bottom of the page (existing + "; " + new)
      $("#view_status_info").text($("#view_status_info").text() +
        (($("#view_status_info").text().length > 0) ? "; " : "") +
        info_str);
      // Checking if update was long ago (>10min), and if so, mark as red
      result = info_str.match(/\d{2}\/\d{2}\/\d{2}-\d{2}:\d{2}:\d{2}/);
      if (result) {
        // Fixing date format
        result = new Date(`20${result[0]}`.replace(/-/g,"T").replace(/\//g,"-"));
        now = new Date();
        if ((now-result)/60000 > 10.0) {
          $("#view_status_info").css("color",'red')
        } else {
          $("#view_status_info").css("color",'')
        }
      }
    }
  }).fail(function () {
    console.error("Something wrong updating status info!");
  });

  return;
}

/**
 *  Create colorscale selector with the colors defined in 
 *  view.colorscale and add it to the infoline
 * */
View.prototype.add_colorscale_controls = function () {
  let self = this;
  // Add colorscale selector when it's not already there
  if (! $("#colorscale_selection").length) {
    // Create selector id colorscale_selection
    let colorscale_selection = $("<div>").addClass("dropup clickable")
                                          .attr("id","colorscale_selection")
                                          .attr("title","Select colorscale")
                                          .attr("data-placement","left")
    let dropup_menu = $("<div>").addClass("dropdown-menu");
    let svg = null;
    let selected = null;
    let selected_svg = null;
    let current_div = null;
    // Get current selected from initial_data or default (TODO: add storage?)
    if (self.initial_data.colors.colorscale) {
      selected = self.initial_data.colors.colorscale
    } else {
      selected = self.default_colorscale;
    }
    // Define colorscale sizes
    let width = "50px";
    let height = "10px";
    // Create dropdown menu
    dropup_menu.append($("<span>").append($("<strong>").text("Colorscale:")));
    if (self.colorscale.length > 1) {
      // For the colorscales defined in view.colorscale
      self.colorscale.forEach(function(colorscale) {
        // Create the definition of this given colorscale
        let lineargradient = $("<linearGradient>").attr("id",`gradient-${colorscale}`)
                              .attr("x1", "0%").attr("y1", "0%")
                              .attr("x2", "100%").attr("y2", "0%")
        // And the svg rectangle where it is used
        let rect = $("<rect>").css("fill",`url("#gradient-${colorscale}")`)
                    .attr("width", width)
                    .attr("height", height)

        let color_wheel;
        // Getting colors (and if reversed or not)
        let [cs,reverse] = colorscale.split('_');
        if (reverse) {
          color_wheel = [...d3[`scheme${cs}`][11]];
        } else {
          color_wheel = [...d3[`scheme${cs}`][11]].reverse();
        }
        // Create the color gradient
        color_wheel.forEach( (d,i) => {
          lineargradient.append($("<stop>").attr("offset", i/(color_wheel.length-1)).attr("stop-color",d))
        });
        // Defining the SVG DOM element
        // NOTE: SVG must be added as text, otherwise it is not loaded correctly
        svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs>${lineargradient.prop('outerHTML')}</defs><g>${rect.prop('outerHTML')}</g></svg>`
        // Creating div for this given colorscale
        current_div = $("<div>")
            .addClass("dropdown-item")
            .addClass("colorscale")
            .attr("title", colorscale) // Turns on tooltip for each colorscale name
            .attr("data-placement", "left") // Position tooltip to the left, otherwise it is incompatible with mouse hover
            .append(svg)
            .on("click",function(){
              self.initial_data.colors = { 'colorscale': colorscale };
              self.setHash();
              self.reloadPage();
              $(".colorscale").removeClass("selected");
              $(this).addClass("selected");
              $("#colorscale_selection > a").children("svg").replaceWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs>${lineargradient.prop('outerHTML')}</defs><g>${rect.prop('outerHTML')}</g></svg>`);
              // $("#colorscale_selection > a").children("svg").replaceWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs>${lineargradient.prop('outerHTML')}</defs><g>${rect.prop('outerHTML')}</g></svg>`);
              return;
              })
        // Saving selected svg to add to colorscale_selection
        // and adding selected class
        if (colorscale == selected) {
          selected_svg = svg;
          current_div.addClass("selected");
        }
        // Append to the menu
        dropup_menu.append(current_div)
        return;
      });
      // Append the selected SVG to the colorscale_selector
      colorscale_selection.append($("<a>")
                .attr("aria-label","Select colorscale")
                .addClass("dropdown-toggle")
                .attr("data-toggle","dropdown")    
                .append(selected_svg));
      // Appending menu
      colorscale_selection.append(dropup_menu);
      // Adding to footer infoline
      self.add_to_footer_infoline(colorscale_selection[0], 1);
    }
  }
}


View.prototype.add_filter = function (new_filter) {
  let self = this;
  
  let full_filter = {...self.initial_data.filter, ...new_filter};
  // console.log('full_filter',full_filter)
  apply_filter(full_filter);
}


/**
 * Add button with options to apply to the table
 * @param {obj} opt Object containing the filters to be applied, in the form:
 *                  { 
 *                    'Field Name1' : { 
 *                                      'Option1': {'Header1': 'Value1','Header2': 'Value2',...},
 *                                      'Option2': {'Header1': 'Value1','Header3': 'Value3',...},
 *                                      ...
 *                                    },
 *                    'Field Name2' : { 
 *                                       ...
 *                                    },
 *                  }
 * @param {*} filter Filter element, where the button for more options will be added. If not present, nothing is done
 * @returns 
 */
View.prototype.add_filter_options = function (filter) {
  let self = this;

  if(!filter.length){
    return;
  }
  // Define preselected options
  let options = {
    'End Date': {
      'Today': {'End Date (est)': new Date().toISOString().slice(0, 10)},
      'Yesterday': {'End Date (est)': new Date(Date.now() - 1000*60*60*24).toISOString().slice(0, 10)}
    },
    'State': {
      'RUNNING': {'State': 'RUNNING'},
      'COMPLETED': {'State': 'COMPLETED'},
      'FAILED': {'State': 'FAILED'},
    },
  }
  let text = `Click to ${self.initial_data.options?.showoptions ? "hide" : "show"} pre-selected filter options`;
  let filteroptions = $('#filteroptions')
  if (!filteroptions.length) {
    filteroptions = $('<div>').attr('id','filteroptions')
                              .attr("title",text)
                              .attr("aria-label",text)
                              .attr('data-toggle', "tooltip")
                              .attr('data-html', "true")
                              .attr('data-placement', "bottom")
    filter.append(filteroptions)
  }

  // Creating table with filter options
  $('#optionsdiv').remove() // Removing previous before adding new one
  let desc = 'Options to filter table:'
  let optionsdiv = $('<div>',{id: "optionsdiv"}).hide()
  let optionstable = $('<table>',{id: "optionstable"}).append($('<tr>').append($('<th>',{colspan:2*Object.keys(options).length,"aria-label":desc})
                                                                       .text(desc)));
  let optionsrow = $('<tr>')
  // Looping over the different options
  for (let [key, values] of Object.entries(options)) {
    let id = key.replace(/(\s)/g, '_');
    // Adding current option 'title' in a cell
    optionsrow.append($('<td>',{id: id,text: `${key}: `}))
    let this_option = $('<td>')
    // Looping over the different options for this given field, and creating the radio filteroptions
    for (let [optname, filter] of Object.entries(values)) {
      let option_input = $('<input>',{type: 'radio',id: optname, name: id, value: optname})
      let option_label = $('<label>',{for: optname}).text(optname)
                                                    .prepend(option_input)
      this_option.append(option_label)
                 .append(`<br>`);
      // Adding filter when input radio is clicked
      option_input.on('click', () => {
        self.add_filter(filter);
      })
          
    }
    optionsrow.append(this_option)
  }
  optionstable.append(optionsrow)
  optionsdiv.append(optionstable)
  
  // If show info is active (from URL), activate it
  if (self.initial_data.options?.showoptions) {
    filteroptions.addClass('active');
    filteroptions.attr("data-original-title","Click to hide the options to filter the table")
                 .attr("aria-label","Click to hide the options to filter the table")
    $('main').prepend(optionsdiv);
    optionsdiv.slideDown();
  }
  
  // On show-info filteroptions click:
  filteroptions.off('click'); // Turning off first, to avoid adding multiple events
  filteroptions.on('click',() => {
    filteroptions.toggleClass('active');
    // Turns on and off filter options
    if (self.initial_data.options?.showoptions) {
      // If "aria-label"is already showing up when clicking the filteroptions, then turn it off
      filteroptions.attr("data-original-title","Click to show the options to filter the table")
                   .attr("aria-label","Click to show the options to filter the table")
      delete self.initial_data.options.showoptions;
      $('#optionsdiv').slideUp(function() {
        $(this).remove();
      });
      self.setHash();
    } else {
      // If "aria-label" does not exist when clicking the filteroptions, then turn it on
      filteroptions.attr("data-original-title","Click to hide the options to filter the table")
                   .attr("aria-label","Click to hide the options to filter the table")
      self.initial_data.options = { 'showoptions': 'true' };
      self.setHash();
      $('#main_content').prepend(optionsdiv);
      optionsdiv.slideDown();
    }
    return;
  });
  return;
}


/**
 * Add show-info button
 */
View.prototype.add_infobutton = function (description) {
  let self = this;
  let text = `Click to ${self.initial_data.description?.showinfo ? "hide" : "show"} description of page`;
  let button = $('#information > button')
  if (!button.length) {
    button = $('<button>',{type: "button", class: 'inner-circle', title: text}).attr("aria-label",text)
                                                                               .attr('data-toggle', "tooltip")
                                                                               .attr('data-html', "true")
                                                                               .attr('data-placement', "bottom")
                                                                               .addClass("fa")
                                                                               .addClass("fa-info");
    $('#information').append(button)
  }
  let infotext = $('<div>',{id: "infotext"}).attr("aria-label",description)
                                            .text(description)
                                            .hide();

  // If show info is active (from URL), activate it
  if (self.initial_data.description?.showinfo) {
    button.addClass('active');
    button.attr("data-original-title","Click to hide description of page")
          .attr("aria-label","Click to hide description of page")
    // Removing previous text before adding new one
    $('#infotext').remove();
    $('main').prepend(infotext);
    infotext.slideDown();
  }
  
  // On show-info button click:
  button.off('click'); // Turning off first, to avoid adding multiple events
  button.on('click',() => {
    // Toggle class 'active' on button to change its colors
    button.toggleClass('active');
    // Turns on and off show information
    if (self.initial_data.description?.showinfo) {
      // If it show-info exists when clicking the button, then turn it off
      button.attr("data-original-title","Click to show description of page")
            .attr("aria-label","Click to show description of page");
      delete self.initial_data.description.showinfo;
      $('#infotext').slideUp(function() {
        $(this).remove();
      });
      self.setHash();
    } else {
      // If it presentation mode does not exist when clicking the button, then turn it on
      button.attr("data-original-title","Click to hide description of page")
            .attr("aria-label","Click to hide description of page");
      self.initial_data.description = { 'showinfo': 'true' };
      self.setHash();
      $('#main_content').prepend(infotext);
      infotext.slideDown();
    }
    return;
  });
  return;
}

/**
 * Add auto-refresh button
 */
View.prototype.add_autorefresh = function () {
  let self = this;
  let text = `Auto-refresh is ${self.initial_data.refresh.disablerefresh ? "OFF" : "ON"}`;
  let button = $('<button>',{type: "button", class: 'inner-circle', title: text}).attr("aria-label",text).addClass("fa").addClass("fa-refresh");
  // If disable refresh is not active (from URL), activate it
  if (! self.initial_data.refresh.disablerefresh) {
    button.addClass('active');
    button.attr("data-original-title","Auto-refresh is ON")
          .attr("aria-label","Auto-refresh is ON")
          .removeClass("fa")
          .removeClass("fa-refresh");
    let seconds = 60;
    self.refreshinterval = setInterval(function () {
      button.text(seconds).attr("aria-label",`Auto-refresh in ${seconds} seconds`);
      seconds = seconds - 1;
      if (seconds === 0) {
        seconds = 60;
        self.reloadPage();
      }
    }, 1000);
  }
  $('#refresh').append(button)
  // On auto-refresh button click:
  button.on('click',() => {
    // Toggle class 'active' on button to change its colors
    button.toggleClass('active');
    // Turns off and on auto-refresh
    if (! self.initial_data.refresh.disablerefresh) {
      // If it exists when clicking the button, then turn it off
      button.text('');
      button.attr("data-original-title","Auto-refresh is OFF")
            .attr("aria-label","Auto-refresh is OFF")
            .addClass("fa")
            .addClass("fa-refresh");
      self.initial_data.refresh = { 'disablerefresh': 'true' };
      self.setHash();
      // Remove Intervals
      clearInterval(self.refreshinterval);
    } else {
      delete self.initial_data.refresh.disablerefresh;
      button.attr("data-original-title","Auto-refresh is ON")
            .attr("aria-label","Auto-refresh is ON")
            .removeClass("fa")
            .removeClass("fa-refresh");
      self.setHash();
      let seconds = 60;
      self.refreshinterval = setInterval(function () {
        button.text(seconds).attr("aria-label",`Auto-refresh in ${seconds} seconds`);
        seconds = seconds - 1;
        if (seconds === 0) {
          seconds = 60;
          self.reloadPage();
        }
      }, 1000);
    }
    return;
  });
  return;
}
/**
 * Add auto-refresh button (old version with animation that used too much CPU on Firefox)
 */
// View.prototype.add_autorefresh = function () {
//   let self = this;
//   let counter = $("<div>").attr('id', 'counter').append( $("<div>").addClass('outer-circle') )
//                           .append( $("<div>").addClass('hold left').append($("<div>").addClass('fill')) )
//                           .append( $("<div>").addClass('hold right').append($("<div>").addClass('fill')) );
//   let refresh_span = $("<div>").addClass("fa").addClass("fa-refresh");
//   let button = $('<button>',{type: "button", class: 'inner-circle', title: `Auto-refresh is ${self.initial_data.refresh.disablerefresh ? "OFF" : "ON"}`}).prepend(refresh_span);
//   // If disable refresh is not active (from URL), activate it
//   if (! self.initial_data.refresh.disablerefresh) {
//     button.addClass('active');
//     refresh_span.addClass('slow-spin');
//     $('#refresh').prepend(counter);
//     button.attr("data-original-title","Auto-refresh is ON");
//     self.refreshinterval = setInterval(function () {
//       self.reloadPage();
//       return;
//     }, 60000);
//   }
//   $('#refresh').append(button)
//   // On auto-refresh button click:
//   button.on('click',() => {
//     // Toggle class 'active' on button to change its colors
//     button.toggleClass('active');
//     refresh_span.toggleClass('slow-spin');
//     // Turns off and on auto-refresh
//     if (! self.initial_data.refresh.disablerefresh) {
//       // If it exists when clicking the button, then turn it off
//       button.attr("data-original-title","Auto-refresh is OFF");
//       self.initial_data.refresh = { 'disablerefresh': 'true' };
//       self.setHash();
//       counter.remove();
//       // Remove Intervals
//       clearInterval(self.refreshinterval);
//     } else {
//       $('#refresh').prepend(counter);
//       delete self.initial_data.refresh.disablerefresh;
//       button.attr("data-original-title","Auto-refresh is ON");
//       self.setHash();
//       // Adding interval to reload page every 60s
//       self.refreshinterval = setInterval(function () {
//         self.reloadPage();
//         return;
//       }, 60000);
//     }
//     return;
//   });
//   return;
// }


/* Force reload page */
View.prototype.reloadPage = function () {
  var self = this;
  if (self.selected_page != 'live') {
    if($("#main_content table").length){
      // Storing jobid that is selected before
      index = self.headers[self.clicked_page].indexOf('JobID');
      selected_jobid = $("#main_content table tbody tr.selected td").eq(index).text()??""
    } else if (self.gridApi) {
      self.gridState[self.selected_page] = self.gridApi.getState(); // Save current state to recover after refresh
      selected_jobid = self.gridApi.getSelectedNodes(); // Get selected job
    }
    // Re-select current page and subpage
    self.selectPage([self.selected_page,self.selected_subpage],false,true, function () {
      // When there is a selected job...
      if (selected_jobid.length) {
        if($("#main_content table").length){
          // ...reselecting row with the same jobid (when present)
          jobid_row = $(`#main_content table tbody td:nth-child(${index+1}):contains('${selected_jobid}')`).parent()[0];
          if (jobid_row) {
            jobid_row.click()
          }
        } else if (self.gridApi) {
          self.gridApi.forEachNode((node) => {
            if (node.id == selected_jobid[0].id && node.displayed) {
              // Making it visible
              self.gridApi.ensureIndexVisible(node.rowIndex,'middle');
              // Selecting it
              node.setSelected(true);
            }
          });
        }
      }
    });
  } else {
    // Reload svg on live view and update status info text
    load_svg();
    self.update_status_info();
  }
  return;
}


/**
 * Add "presentation mode" button (to cycle through jobs and tabs automatically)
 */
View.prototype.add_presentation = function () {
  let self = this;
  // Button should have been deleted before being added
  $('#presentation').empty();
  
  // Creating presentation mode button
  let text = `Presentation Mode is ${self.initial_data.presentation?.present ? "ON" : "OFF"}`;
  let button = $('<button>',{type: "button", class: 'inner-circle', title: text}).attr("aria-label",text).addClass("fa").addClass("fa-play");
  var timebetweenjobs = 30000; // Time to alternate between jobs (in microseconds)

  // If presentation mode is active (from URL), activate it
  if (self.initial_data.presentation?.present) {
    button.addClass('active');
    button.attr("data-original-title","Presentation Mode is ON")
          .attr("aria-label","Presentation Mode is ON")
          .toggleClass("fa-play")
          .toggleClass("fa-pause");
    self.loopFooterTabs(self,timebetweenjobs)
    self.presentationjobinterval = setInterval(self.loopFooterTabs, timebetweenjobs, self, timebetweenjobs);
  }

  $('#presentation').append(button)
  // On presentation-mode button click:
  button.on('click',() => {
    // Toggle class 'active' on button to change its colors, and icons play/pause
    button.toggleClass('active').toggleClass("fa-play").toggleClass("fa-pause");
    // Turns on and off presentation mode
    if (self.initial_data.presentation?.present) {
      // If it presentation mode exists when clicking the button, then turn it off
      button.attr("data-original-title","Presentation Mode is OFF")
            .attr("aria-label","Presentation Mode is OFF");
      delete self.initial_data.presentation.present;
      self.setHash();
      // Remove Intervals
      if (self.presentationtabinterval) clearInterval(self.presentationtabinterval);
      clearInterval(self.presentationjobinterval);
    } else {
      // If it presentation mode does not exist when clicking the button, then turn it on
      button.attr("data-original-title","Presentation Mode is ON")
            .attr("aria-label","Presentation Mode is ON");
      self.initial_data.presentation = { 'present': 'true' };
      self.setHash();
      self.loopFooterTabs(self,timebetweenjobs)
      self.presentationjobinterval = setInterval(self.loopFooterTabs, timebetweenjobs, self, timebetweenjobs);
    }
    return;
  });
  return;
}

/**
 * Loops through the footer tabs of the current selected job using 
 * an interval of timebetweenjobs / #tabs
 * @param {int} timebetweenjobs time between 2 random jobs are selected
 * @returns 
 */
View.prototype.loopFooterTabs = function (view_self,timebetweenjobs) {
  let self = view_self;
  let graphtabs, timebetweentabs, count, randomjob;
  // Selecting a random job from the table
  if ($('#main_content > table').length) {
    let randomtd = Math.floor(Math.random() * $('#main_content > table > tbody tr:visible').length);
    randomjob = $('#main_content > table > tbody tr:visible').eq(randomtd)[0];
    if (!randomjob) return
    // Scroll the job into view
    randomjob.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'center'
    });
    // Click on the job
    randomjob.click();

  } else if (self.gridApi) {
    let randomtd = Math.floor(Math.random() * self.gridApi.getDisplayedRowCount());
    // Scroll the job into view
    self.gridApi.ensureIndexVisible(randomtd,'middle');
    // Selecting the job
    randomjob = self.gridApi.getDisplayedRowAtIndex(randomtd)
    self.gridApi.setNodesSelected({ nodes: [randomjob], newValue: true });
  }
  // Get all tabs in footer
  graphtabs = $('#graph_selection > ul > li:visible > a');
  if (graphtabs.length > 1) {
    // Calculate time to spend on each tab as total/#tabs
    timebetweentabs = timebetweenjobs/graphtabs.length;
    count = 1;
    // Start selecting first tab (when not selected)
    graphtabs[0].click();
    // Cleaning old tab interval
    clearInterval(self.presentationtabinterval);
    // Setting tab interval
    self.presentationtabinterval = setInterval(function () {
      // Clicking on a tab
      graphtabs[count].click();
      count = (count+1)%graphtabs.length;
    }, timebetweentabs);
  }
  return;
}


/**
 *  Get the headers of a table or a grid and stores into self.headers[view.clicked_page]
 * @returns 
 */
View.prototype.getHeaders = function () {
  let self = this;
  // Getting headers of the main table of this page (if it exists) as an Array
  if($("#main_content > table").length){
    self.headers[self.clicked_page] = $("#main_content table").find("thead tr:first th").toArray().map(function(i){ return i.innerText });
  } else if (self.gridApi) {
    let header;
    self.headers[self.clicked_page] = []
    self.headerToName[self.clicked_page] = {}
    self.nameToHeader[self.clicked_page] = {}
    self.gridApi.getColumns().forEach((column) => {
      if(column.originalParent && Object.keys(column.originalParent.colGroupDef).length) {
        // If the original parent group definition has keys
        // this is a column group. Get the conversion header<->name also from those
        header = column.originalParent.colGroupDef.headerName;
        self.headerToName[self.clicked_page][header] = column.originalParent.groupId;
        self.nameToHeader[self.clicked_page][column.originalParent.groupId] = header;
      }
      header = self.gridApi.getDisplayNameForColumn(column);
      self.headerToName[self.clicked_page][header] = column.getColId();
      self.nameToHeader[self.clicked_page][column.getColId()] = header;
      self.headers[self.clicked_page].push(header);
    });
  }
  return
}

/**
 * Add, update or remove loading screen
 * @param {boolean} state boolean to set the loading div or remove it
 **/
View.prototype.loading = function (state) {
  // if (cover_element){
  //     console.log($("#main_content > table:first-child"))
  //     loading = $("<div>").addClass("loading");
  //     loading.css("top", $("#header").height()+$("#day_selection_scroll").height() + $("#main_content thead").height() + 10);
  //     loading.css("bottom", $("footer").height());
  //     loading.css("left", "15px");
  //     loading.css("right", "15px");
  //     loading.append($("<span>").text("LLview is loading. Please wait...").prepend("<br/>").prepend($("<span>").addClass("fa").addClass("fa-spinner").addClass("fa-spin")));
  //     $("body").append(loading);
  //     return;
  // }
  if (state) {
    let loading;
    $("html,body").css("cursor", "progress");
    if ($(".loading").length == 0) {
      loading = $("<div>").addClass("loading");
      loading.css("top", $("#header").height());
      loading.css("bottom", $("#footer_footer").height());
      loading.append($("<span>").text("LLview is loading. Please wait...").prepend("<br/>").prepend($("<span>").addClass("fa").addClass("fa-spinner").addClass("fa-spin")));
      $("body").append(loading);
    } else {
      loading = $(".loading");
      loading.css("top", $("#header").height());
      loading.css("bottom", $("#footer_footer").height());
    }
  } else {
    $(".loading").remove();
    $("html,body").css("cursor", "default");
  }
  return;
}

/**
 * Add DOM 'element' to infoline (gray bar above the footer) at position 'pos'
 * @param {object} element DOM element to be added to the infoline
 * @param {int} pos integer number defining the position to add the element (bigger numbers to the right)
 */
View.prototype.add_to_footer_infoline = function (element, pos) {
  let included = false;
  if (pos) {
    // If a position is given
    $(element).data("pos", pos);
    for (let i = 0, existing_elements = $("#footer_infoline_page_options").children(); i < existing_elements.length; ++i) {
      if (!included && $(existing_elements[i]).data("pos") && $(existing_elements[i]).data("pos") > pos) {
        $(existing_elements[i]).before($(element));
        included = true;
        return;
      }
    }
  }
  if (!included) {
    $("#footer_infoline_page_options").append($(element));
  }
  return;
}


/**
 * Add tooltip to elements in JQuery object "elements"
 * @param {object} elements 
 */
View.prototype.apply_tooltip = function (elements) {
  $(".tooltip").tooltip("hide");
  elements.attr("data-toggle", "tooltip");
  elements.attr("data-html", "true");
  elements.tooltip({ boundary: 'viewport' });
  // Close tooltip after click, this avoids a problem of having a hanging tooltip e.g. in Safari
  elements.on('click', function () {
    $(this).tooltip('hide');
    return;
  });
}

/**
 * Add functions from ref data (that was read from 'ref.json')
 * Loops over the ref values in data.ref and check if they are in 'ref.json'
 * values that are stored in self.refdata. If there are functions, add them
 * to data.function.
 * Scripts and Styles are added in the beginning.
 * @param {object} data 
 */
View.prototype.add_refdata = function (data) {
  let self = this;
  if (self.refdata && data.ref) {
    data.ref.forEach(function (ref) {
      if (ref in self.refdata) {
        // Scripts and styles are now added in the beginning
        // if (self.refdata[ref].scripts) {
        //     data.scripts = self.refdata[ref].scripts.concat((data.scripts) ? data.scripts : []);
        // }
        // if (self.refdata[ref].styles) {
        //     data.styles = self.refdata[ref].styles.concat((data.styles) ? data.styles : []);
        // }
        if (self.refdata[ref].functions) {
          data.functions = self.refdata[ref].functions.concat((data.functions) ? data.functions : []);
        }
      }
    })
  }
}

/**
 * Add required scripts to the plots on footer or graph page
 * @param {object} data 
 */
View.prototype.add_graph_data = function (data) {
  // Add footer_graph scripts and layout files if necessary
  if (data.footer_graph_config || data.graph_page_config) {
    let contents = [
      // {
      //     values: ["ext/d3.min.js", "ext/plotly.min.js", "plotly_graph.js", data.footer_graph_config ? "footer_graphs.js" : "page_graph.js" ],
      //     target: "scripts"
      // }, 
      // {
      //     values: [],
      //     target: "styles"
      // }, 
      {
        values: data.footer_graph_config ? ["init_footer_graphs"] : ["init_graphs_page"],
        target: "functions"
      }
    ];
    contents.forEach(content => {
      content.values.forEach(element_a => {
        let found = false;
        if (!data[content.target]) {
          data[content.target] = [];
        }
        data[content.target].forEach(element_b => {
          found = found || JSON.stringify(element_a) == JSON.stringify(element_b);
        });
        if (!found) {
          data[content.target].push(element_a);
        }
      });
    });
    this.footer_graph_config = data.footer_graph_config;
    this.graph_page_config = data.graph_page_config;
    data.footer_template = "graph_footer_plotly";
  } else {
    this.footer_graph_config = null;
  }
}


/**
 * Get Information from the page to add to required objects
 * @param {Array} object Array containing entries to be added
 * @param {boolean} remove Boolean to choose if original key should be deleted
 * @param {object} refdata Reference data to give list of entries with single keyword
 * @returns 
 */
View.prototype.getPagesInfo = function (elem) {
  let self = this;
  self.all_page_sections.push(elem.section);
  // If footer page or graph page is used, add corresponding scripts
  if (elem.footer_graph_config || elem.graph_page_config) {
    self.addons.scripts = new Set([...self.addons.scripts, ...["plotly_graph.js","mermaid_graph.js", elem.footer_graph_config ? "footer_graphs.js" : "page_graph.js" ]])
  }

  // Getting scripts needed on the website and removing from config
  self.addons.scripts = new Set([...self.addons.scripts, ...self.getEntries(elem.scripts,'scripts',true)])
  // Getting scripts from refs
  self.addons.scripts = new Set([...self.addons.scripts, ...self.getEntries(elem.ref,'scripts',false,self.refdata)])

  // Getting styles needed on the website and removing from config
  self.addons.styles = new Set([...self.addons.styles, ...self.getEntries(elem.styles,'styles',true)])
  // Getting styles from refs
  self.addons.styles = new Set([...self.addons.styles, ...self.getEntries(elem.ref,'styles',false,self.refdata)])

  // Check for default value
  if (elem.default) {
    self.default_section = elem.section;
  }
  // Getting columns
  // if (elem.data?.default_columns) {
  //     console.log(elem.section,elem.data.default_columns)
  // }
  return;
}


/**
 * Get entries (scripts or styles) from Array and optionally remove it
 * @param {Array} object Array containing entries to be added
 * @param {boolean} remove Boolean to choose if original key should be deleted
 * @param {object} refdata Reference data to give list of entries with single keyword
 * @returns 
 */
View.prototype.getEntries = function (object, type, remove = false, refdata) {
  let entries = new Set();
  if (object) {
    object.forEach(function (ref) {
      if (refdata) {
        // If value is obtained from refdata
        if (refdata[ref] && refdata[ref][type]) {
          refdata[ref][type].forEach(entry => entries.add(entry))
        } 
      } else {
        // If value is obtained from configuration
        entries.add(ref)
      }
    });
    if (remove) { delete object; }
  }
  return entries;
}


/**
 *  Adds the script to the page and resolves the deferred object on load
 * @param {string} script Script to be added to the page
 * @param {object} deferred deferred object
 */
View.prototype.addScript = function (script, deferred) {
  let script_tag = $("<script>").attr("src", "js/" + script);
  script_tag.on("load", function () { deferred.resolve(); return; });
  $("body")[0].appendChild(script_tag[0]);
}

/**
 *  Adds the style to the page and resolves the deferred object on load
 * @param {string} style Stylesheet to be added to the page
 * @param {object} deferred deferred object
 */
View.prototype.addStyle = function (style, deferred) {
  let style_tag = $("<link>").attr("rel","stylesheet").attr("href", "css/" + style);
  style_tag.on("load", function () { deferred.resolve(); return; });
  $("head")[0].appendChild(style_tag[0]);
}


/**
 * Update URL with parameters in initial_data.page 
 * initial_data.filter and initial_data.sort
 * @param {boolean} keep_history Flag to keep page in history
 */
View.prototype.setHash = function (keep_history) {
  self = this;
  let hash = "";
  parameter = {};
  // Add active page
  if (self.initial_data.page) {
    parameter["page"] = self.initial_data.page;
  }
  // Add active filter
  if (self.initial_data.filter) {
    // parameter = Object.assign({}, parameter, self.initial_data.filter);
    Object.assign(parameter, self.initial_data.filter);
  }
  // Add active sort
  if (self.initial_data.sort) {
    // parameter = Object.assign({}, parameter, self.initial_data.sort);
    Object.assign(parameter, self.initial_data.sort);
  }
  // Add colorscale
  if (self.initial_data.colors) {
    // parameter = Object.assign({}, parameter, self.initial_data.colors);
    Object.assign(parameter, self.initial_data.colors);
  }
  // Add auto-refresh
  if (self.initial_data.refresh) {
    Object.assign(parameter, self.initial_data.refresh);
  }
  // Add Presentation Mode
  if (self.initial_data.presentation) {
    Object.assign(parameter, self.initial_data.presentation);
  }
  // Add description box
  if (self.initial_data.description) {
    Object.assign(parameter, self.initial_data.description);
  }
  // Add options box
  if (self.initial_data.options) {
    Object.assign(parameter, self.initial_data.options);
  }

  // Build hash into URL
  for (let key in parameter) {
    if (key.length > 0 && parameter[key].length > 0) {
      hash += ((hash.length > 0) ? "&" : "") + encodeURIComponent(key) + "=" + encodeURIComponent(parameter[key]);
    }
  }
  if (keep_history) {
    window.location.href = `${window.location.pathname}${window.location.search}#${hash}`;
  } else {
    history.replaceState({}, document.title, window.location.pathname + window.location.search + "#" + hash);
  }
}

/**
 * Download config file defined in this.config and return its jqXHR response object
 * @returns {object} jqXHR from $.getJSON
 */
View.prototype.download_config = function () {
  // Download graph configuration file
  let self = this;
  /* Check if given path starts with /, in this case the path is seen relative to the root of the webserver
  Otherwise it is handled relative to the json subfolder */
  let config_path = process_path(self.config_file, "json/");
  return $.getJSON(config_path, function (json_data) {
    self.config = json_data;
    return;
  });

}

/**
 * Show dropmenus on hover
 */
View.prototype.add_dropmenu_hover = function () {
  // Select all dropdown and add hover
  $('.dropdown').hover(function() {
    // When hovering in and the menu is not open, click on it and remove focus
    if(!$(this).hasClass('show')) {
      $('.dropdown-toggle', this).trigger('click').blur();
    }
  },
  function() {
    // When hovering out and the menu is open, click on it and remove focus
    if($(this).hasClass('show')) { 
      $('.dropdown-toggle', this).trigger('click').blur();
    }
  });

  // Select all dropup and add hover
  $('.dropup').hover(function() {
    // When hovering in and the menu is not open, click on it and remove focus
    if(!$(this).hasClass('show')) { 
      $('.dropdown-toggle', this).trigger('click').blur();
    }
  },
  function() {
    // When hovering out and the menu is open, click on it and remove focus
    if($(this).hasClass('show')) { 
      $('.dropdown-toggle', this).trigger('click').blur();
    }
  });
}

/**
 * Load and render handlebar templates using the given context into a given
 * element. postprocess can be used to execute a specific function afterwards.
 * @param {object} templates Object containing the styles, templatex, context and element to be added to the page
 * @param {function} postprocess Function to be run after the template is loaded
 */
View.prototype.applyTemplates = function (templates, postprocess) {
  let self = this;
  templates = Array.isArray(templates) ? templates : [templates];
  if (templates.length > 0) {
    for (let i = 0; i < templates.length; ++i) {
      // Getting script files (NOT NEEDED AS THEY ARE ADDED IN THE BEGINNING)
      // if (templates[i].scripts) {
      //     templates[i].scripts.forEach(function (scripts) {
      //         if (Array.isArray(scripts)) {
      //             deferrer.push($.Deferred(function () { addScriptsInOrder(scripts, this); }));
      //         } else {
      //             deferrer.push($.Deferred(function () { addScriptsInOrder([scripts], this); }));
      //         }
      //     });
      // }
      // Adding CSS style files
      // if (templates[i].styles) {
      //     console.log("ADDED STYLES",templates[i].styles)
      //     templates[i].styles.forEach(function (style_name) {
      //         $("head").append($("<link>", {
      //             rel: "stylesheet",
      //             href: "css/" + style_name
      //         }));
      //     });
      // }
      // If a template is given, add the related files
      if (templates[i].template) {
        // Process path of template handlebar
        let template_path = process_path(templates[i].template + ".handlebars","templates/");
        // Create deferrer for template file (as text)
        self.deferrer.push($.get(template_path, function () { return; }, "text"));
        if (templates[i].context_location) {
          // If a context if given, create deferrer for its file too
          if (templates[i].context_location.endsWith(".json")) {
            self.deferrer.push($.getJSON(templates[i].context_location, function (data) { self.contexts[templates[i].context_location] = data; return; }));
          } else if (templates[i].context_location.endsWith(".csv")) {
            self.deferrer.push($.get(templates[i].context_location, function (data) { self.contexts[templates[i].context_location] = csvToArr(data, ";"); return; }, "text"));
          } else {
            self.deferrer.push($.get(templates[i].context_location, function () { return; }, "text"));
          }
        }
      }
    }
    // When all the deferrers are finished, continue with template application
    $.when.apply($, self.deferrer).done(function () {
        // Restarting deferrer as the current ones are done
        self.deferrer.length = 0;

        for (let i = 0; i < templates.length; ++i) {
          // Skip scripts from counter (NOT NEEDED AS SCRIPTS ARE NOT ADDED ANYMORE)
          // if (templates[i].scripts) {
          //     counter += templates[i].scripts.length;
          // }

          // If a template is given, process it
          if (templates[i].template) {
            // Get returned data from deferrer (if it is an array - i.e., from many deferrer files -, get first element)
            let template_data = arguments[self.counter++];
            if (Array.isArray(template_data)) {
              template_data = template_data[0];
            }
            // Getting context from 'context_location' or, if that is not present, from 'context'                      
            let context;
            if (templates[i].context_location) {
              context = arguments[self.counter++][0];
            } else {
              context = templates[i].context ? templates[i].context : {};
            }
            // Compiling 'template', applying with 'context', and adding to HTML 'element'
            // This will create the repetitions defined in the templates (from Handlebars)
            let template = Handlebars.compile(template_data);
            $(templates[i].element).html(template(context));
          }
        }
        // Restarting counter for next call
        self.counter = 0;
        // Template was loaded, page is not empty
        self.empty = false;
        // Running post-processing function when it is present
        if (postprocess) {
          postprocess();
        }
      }
    ).fail(function () {
      console.error("No data found or error while applying templates");
      // Template was not loaded, page is empty
      self.empty = true;
      self.deferrer.length = 0;
      self.loading(false);
      // Restarting counter for next call
      self.counter = 0;
      // Running post-processing function when it is present
      if (postprocess) {
        postprocess();
      }
      return;
    });
  } else {
    if (postprocess) {
      postprocess();
    }
  }
  return;
}


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
  // Height of main content is window size - the height of the header - height of the footer - 10 for padding(?)
  $("#main_content").height($(window).height() - $("#header").height() - $("footer").height() - 10);
  $("#main_content th").css("top", $("#day_selection_scroll").height() - 10);
  $("#main_content thead tr.filter th").css("top", $("#main_content thead tr:first").height() + $("#day_selection_scroll").height()- 10);
  $("#main_content thead tr.aggregate th").css("top", $("#main_content thead tr:first").height() +
                        $("#main_content thead tr.filter").height() + $("#day_selection_scroll").height() - 14);
  if ($("#myGrid")) {
    $("#myGrid").height($("#main_content").height());
  }
  for (let i = 0; i < view.resize_function.length; ++i) {
    view.resize_function[i]();
  }
}

/**
 * Capitalize first letter of string
 * @returns {string} capitalized string
 */
String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

/**
 * Parse the URL address to get configuration and parameters
 * @returns {object} Object containing parameters given in URL
 */
function getURLParameter() {
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
  paras = {
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
  for (let key in paras) {
    for (let i = 0; i < data_str[key].length; ++i) {
      let p = data_str[key][i].split('=', 2);
      let content = "";
      if (p.length > 1)
        content = decodeURIComponent(p[1].replace(/\+/g, " "));
      let entry = decodeURIComponent(p[0]);
      let target = paras[key];
      if (entry == "demo") {
        if (content.length == 0)
          content = true;
        else {
          content = content === "true";
        }
      }
      if (key == "inital") {
        if (entry == "page") {
          target = paras[key];
        } else if (entry == "colId" || entry == "sort") {
          target = paras[key].sort;
        } else if (entry == "colorscale") {
          target = paras[key].colors;
        } else if (entry == "disablerefresh") {
          target = paras[key].refresh;
        } else if (entry == "present") {
          target = paras[key].presentation;
        } else if (entry == "showinfo") {
          target = paras[key].description;
        } else if (entry == "showoptions") {
          target = paras[key].options;
        } else {
          target = paras[key].filter;
          entry = entry;
        }
      }
      target[entry] = content;
    }
  }
  return paras;
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
    // Clean up any remaining "#demo#" as it might not be set at all
    text = text.replace("#demo#", "");
  }
  return text;
}

/**
 * When the index page is ready, crates the view with the chosen configurations
 */
$(document).ready(function () {
  // Bind resize function to relevant resize events
  $(window).resize(resize);
  $("#navbarSupportedContent").bind('shown.bs.collapse', resize);
  $("#navbarSupportedContent").bind('hidden.bs.collapse', resize);
  // Read and store parameters defined in the URL
  let parameters = getURLParameter();
  // Listener to reload page when clicking Back/Forward buttons (not only changing the address)
  $(window).on("popstate", function(e) {
    if (e.originalEvent.state !== null) {
      location.reload()
    }
  });
  // When no config parameter is given, forward to login page
  if (!parameters) {
    window.location.replace("login.php");
    return;
  }
  // Using the configuration from the URL to create and configure the view
  view = new View(parameters);
  view.show();
  return;
});
