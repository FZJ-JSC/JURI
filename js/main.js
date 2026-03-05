/* 
* Copyright (c) 2023 Forschungszentrum Juelich GmbH.
* This file is part of JURI. 
*
* This is an open source software distributed under the GPLv3 license. More information see the LICENSE file at the top level.
*
* Contributions must follow the Contributor License Agreement. More information see the CONTRIBUTING.md file at the top level.
*
* Contributors:
*    Sebastian Lührs  (Forschungszentrum Juelich GmbH) 
*    Filipe Guimarães (Forschungszentrum Juelich GmbH)   
*    Nabil Abubaker   (Forschungszentrum Juelich GmbH)   
*/

// Global variable to store the view of the page
var view;

/** 
 * View object constituting most of the website: configuration, URL, filepaths
 * @param {object} parameters Parameters from URL that is parsed via getHash()
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
  this.clicked_subpage = null;  // Subpage to be shown (after clicking)
  this.selected_page = null;    // Shown page (before clicking)
  this.selected_subpage = null; // Shown subpage (before clicking)
  this.page_separator = '.';    // Which character to use to separate page from subpage in URL
  this.page_data = null;
  this.page_template = null;
  this.page_context = null;
  this._templateRequests = [];  // Store the open template requests
  this._resourceCache = {};     // Variable for caching templates and contexts
  this._activeWorkers = [];     // Workers that will compile and run the template
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
  // Store filter options used to define the preset table
  // (Used also to compare applied filters and select checkboxes)
  this.filteroptions = {};
}

/**
 * Main method of the view object, which parses the configuration and creates/applies the selected page (from the URL)
 */
View.prototype.show = function () {
  let self = this;

  // Add loading screen
  self.loading(true,false);

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

    // Processing configuration
    if (self.navdata.pages) {
      self.navdata.pages.forEach(function (elem) {
        const items = elem.pages ?? [elem]; // Getting pages that are directly given or as subpages

        items.forEach(function (item) {
          // Normalize: collect what is to be processed: either the tabs (enriched with parent info) or the item (page/subpage) itself
          const toProcess = item.tabs // if there are tabs, get tab information, else, get the item itself
            ? item.tabs.map(tab => {
              tab.parent_section = item.section;
              tab.description    = tab.description??item.description;
              return tab;
            })
            : [item];

          toProcess.forEach(function (pageOrTab) {
            // Add reference data, that is added from the "ref" keyword on yaml
            self.add_refdata(pageOrTab);
            // TODO: Should we enforce this or do we leave for the scripts in the configuration only (either scripts or ref)?
            // If we enforce, this should be before adding the scripts to the page
            // with a check if any page has (data.footer_graph_config || data.graph_page_config)

            // Add scripts and layout for graphs (footer_graph and graph_page)
            // But here the call to init_footer_graphs or init_graphs_page should remain
            self.add_graph_data(pageOrTab);

            // Get information from all the pages that should be added to the web portal 
            // (sections, scripts, styles, default page)
            self.getPagesInfo(pageOrTab);
          });
        });
      });
    }

    // Adding scripts and styles to the page in a local deferrer
    // (they should be finished before doing the rest, 
    // to make sure all scripts and styles are added and function may be called)
    const local_deferrer = [];
    // Adding scripts and styles to the page deferring them
    for (let type in self.addons) {
      if (!self.addons[type]) continue;

      self.addons[type].forEach((entry) => {
        // create a deferred that will be resolved by the loader
        const d = $.Deferred();
        local_deferrer.push(d.promise()); // push the promise so $.when works reliably

        // call the loader and pass the deferred so it resolves on load
        // you must implement the loader to call d.resolve()/d.reject()
        // The loader name calculation keeps your original approach
        const loaderName = `add${type.charAt(0).toUpperCase() + type.slice(1, -1)}`;
        if (typeof self[loaderName] === 'function') {
          try {
            self[loaderName](entry, d);
          } catch (err) {
            // in case loader throws synchronously, reject the deferred
            d.reject(err);
          }
        } else {
          // No loader found — reject so we don't hang
          d.reject(new Error('Loader not found: ' + loaderName));
        }
      });
      // Adding counter to skip scripts
      self.counter += self.addons[type].size;
    }
    // console.log("self.addons.scripts",self.addons.scripts)
    // console.log("self.addons.styles",self.addons.styles)
    // console.log("self.all_page_sections",self.all_page_sections)

    // Applying initial template for navigation
    // The deferrer for the scripts is also synchronised at this point
    $.when.apply($, local_deferrer).done(function () {
      // force async continuation if you need to avoid reentrancy
      setTimeout(() => self.applyTemplates(
        {
          "element": "#navbarSupportedContent",
          "template": "navigation",
          // "element": "#header",
          // "template": "header",
          "context": self.navdata
        },
        [], // initializers
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

          // Initializing scrollbars for navbar:
          self.initScrollableMenu()

          // Initializing handlers for the links on navbar and tabs
          // to allow modifier keys
          self.initGlobalEventHandlers();

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

          let initial_page = ""
          let initial_subpage = ""
          if (self.initial_data.page) {
            // If initial_data is set, set initial_date
            const parts = self.initial_data.page.split(self.page_separator);
            initial_page = parts[0];
            initial_subpage = parts[1];
          } else if (typeof (Storage) !== "undefined") {
            // If browser support local storage, get the 'last_page' to set as initial page
            let last_page = sessionStorage.getItem("last_page");
            if (last_page) {
              [initial_page,initial_subpage] = last_page.split(self.page_separator);
            }
          }

          if (initial_page && self.all_page_sections.indexOf(initial_page) != -1) {
            // If initial_data is set and that page is present on the sections of the page, select it
            self.selectPage([initial_page,initial_subpage], false);
          } else if (self.default_section) {
            // Otherwise, select default_section
            self.selectPage(self.default_section);
          }
          return;
        }
      ) , 0); // end of setTimeout for applyTemplates
    });
    return;
  });
}


/**
 * Function to initialize events for modifier keys on navbar and tabs
 */
View.prototype.initGlobalEventHandlers = function () {
  const self = this;

  /**
   * To open the page in a new tab correctly, the URL must be built
   * with all its parts on the link. This part updates the clicked link
   * with the queries and fragments of the current URL
   * @param {HTMLElement} linkElement - The clicked <a> element.
   * @param {string} paramToUpdate - The name of the hash parameter to set (e.g., 'page', 'subpage').
   */
  const buildDynamicUrl = function(linkElement, paramToUpdate) {
    const section = $(linkElement).data('section');
    if (!section) return;

    // Get the base part of the URL (everything before the hash)
    const baseUrl = window.location.href.split('#')[0];
    // Parse the existing hash into a URLSearchParams object for easy manipulation
    // using window.location.hash.substring(1) to get the string after the '#'
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    // Logic to update the parameters based on the type
    if (paramToUpdate === 'subpage') {
      // Special handling for tabs: Append subpage with the chosen separator (e.g., page.subpage)
      let currentPage = hashParams.get('page') || '';

      // If the current page already has a subpage (has a separator), strip it off first
      if (currentPage.includes(self.page_separator)) {
        currentPage = currentPage.substring(0, currentPage.lastIndexOf(self.page_separator));
      }

      // Set the 'page' parameter to "MainPage.SubPage"
      hashParams.set('page', currentPage + self.page_separator + section);
      // Remove any explicit 'subpage' parameter to keep the URL clean
      hashParams.delete('subpage');
    } else {
      // Standard handling (Navbar): Directly replace the parameter value
      hashParams.set(paramToUpdate, section);
    }

    // Rebuild the hash string from the modified parameters
    const newHash = '#' + hashParams.toString();
    // Instantly update the link's href attribute with the complete URL
    $(linkElement).attr('href', baseUrl + newHash);
  };

  /**
   * When the page is opened in-place (no modifier keys clicked),
   * the javascript function to selectPage is applied
   * This solution without using <a onclick=(...)> is necessary
   * to preserve the option of opening in a new tab using modifier keys
   * @param {Event} event - The jQuery click event object.
   * @param {function} getPageInfo - A function that returns the necessary info for selectPage.
   */
  const handleAjaxNavigation = function(event, getPageInfo) {
    // Check for modifier keys or middle-mouse-button click
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
      // If a modifier key was used, the browser will open the link built above
      // in a new tab/window. Nothing to be done here.
      return; 
    }

    // Otherwise, this was a normal left-click

    // Prevent the browser from reloading the page by following the href
    event.preventDefault();

    // Get the section and subsection and call the selectPage with the respective info
    const pageInfo = getPageInfo(event.currentTarget);
    if (pageInfo) {
      self.selectPage(pageInfo);
    }
  };

  // ---- Adding Navigation Bar Handlers ----
  $('#navigation').on('mousedown', 'a.nav-select-page', function() {
    buildDynamicUrl(this, 'page'); // The navbar updates the 'page' hash parameter
  });

  $('#navigation').on('click', 'a.nav-select-page', function(event) {
    handleAjaxNavigation(event, (element) => {
      // For the navbar, selectPage just needs the section name
      return $(element).data('section'); 
    });
  });

  // ---- Adding Tabs Handlers ----
  const staticParent = 'body';

  $(staticParent).on('mousedown', '#tabs a', function() {
    buildDynamicUrl(this, 'subpage'); // Tabs update the 'subpage' hash parameter
  });

  $(staticParent).on('click', '#tabs a', function(event) {
    handleAjaxNavigation(event, (element) => {
      // For tabs, selectPage needs both the main page and the subpage (section)
      const section = $(element).data('section');
      return [self.clicked_page, section];
    });
  });
};

/**
 * Initialize scroll bar on navbar
 */
View.prototype.initScrollableMenu = function() {
  const wrapper = $('#title_wrapper');
  const scroller = $('#nav_scroller');
  const list = $('#navigation');

  if (!wrapper.length || !scroller.length) return;

  // Inject Arrows
  if (wrapper.find('.scroll-arrow').length === 0) {
    const leftArrow = $('<button class="scroll-arrow left"><span class="fa fa-chevron-left"></span></button>');
    const rightArrow = $('<button class="scroll-arrow right"><span class="fa fa-chevron-right"></span></button>');

    wrapper.prepend(leftArrow);
    wrapper.append(rightArrow);

    const scrollAmount = 200;
    leftArrow.on('click', function(e) {
      e.preventDefault();
      scroller[0].scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    rightArrow.on('click', function(e) {
      e.preventDefault();
      scroller[0].scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
  }

  // Inject Sentinels
  // Note: We add them *inside* the UL so they flow with the items
  if (list.find('.scroll-sentinel').length === 0) {
    list.prepend('<li class="scroll-sentinel sentinel-start"></li>');
    list.append('<li class="scroll-sentinel sentinel-end"></li>');
  }

  // Observer
  const observerOptions = {
    root: scroller[0],
    threshold: 0.1 // Trigger as soon as even 1 pixel is visible
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.target.classList.contains('sentinel-start')) {
        // If START is visible -> Hide Left Arrow
        if (entry.isIntersecting) {
          wrapper.removeClass('can-scroll-left');
        } else {
          wrapper.addClass('can-scroll-left');
        }
      }

      if (entry.target.classList.contains('sentinel-end')) {
        // If END is visible -> Hide Right Arrow
        if (entry.isIntersecting) {
          wrapper.removeClass('can-scroll-right');
        } else {
          wrapper.addClass('can-scroll-right');
        }
      }
    });
  }, observerOptions);

  const startSentinel = list.find('.sentinel-start')[0];
  const endSentinel = list.find('.sentinel-end')[0];

  if (startSentinel) observer.observe(startSentinel);
  if (endSentinel) observer.observe(endSentinel);

  // Fix Dropdown Positioning
  // Since CSS forces position: fixed (to escape overflow clipping), we must
  // manually calculate coordinates relative to the viewport.
  // We use 'shown.bs.dropdown' which fires after Bootstrap tries to position it.
  wrapper.on('shown.bs.dropdown', function (e) {
    const dropdownMenu = $(e.target).find('.dropdown-menu');
    const button = $(e.relatedTarget); // The clicked toggle link

    // Get the button's exact position on screen
    const rect = button[0].getBoundingClientRect();

    // Force the menu to align with the button
    dropdownMenu.css({
      top: rect.bottom + 'px', // Just below the button
      left: rect.left + 'px',  // Aligned with left edge
      right: 'auto',
      transform: 'none'        // Disable Popper.js transforms to avoid conflicts
    });
  });

  // Close dropdowns on scroll
  // Required because fixed menus won't move with the scrolling content
  scroller.on('scroll', function() {
    // If a dropdown is currently open (has class 'show'), close it.
    const openMenus = scroller.find('.dropdown-menu.show');
    if (openMenus.length > 0) {
      // Trigger the click on the toggle to close it gracefully via Bootstrap's API
      openMenus.parent().find('.dropdown-toggle').dropdown('toggle');

      // Fallback: force remove the class if the above doesn't catch it
      openMenus.removeClass('show');
      openMenus.parent().removeClass('show');
    }
  });
};


/**
 * Reads the status of the system when a status file is given
 */
View.prototype.get_system_status = async function (statusfile,systemname) {
  // Getting system status
  if (!statusfile) { return; }
  let lastMod = null;
  let systemmap = {
    'SYSTEM': 'JURECA DC',
    'JURECA-DC': 'JURECA DC',
    'JURECA': 'JURECA DC',
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
    let now = new Date();
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
    let toReturn;
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
        if (!health_id) { return; }
        // If health was obtained, add image to menu
        let health = health_id[0];
        if (health) {
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
      if (!health_id) { return; }
      // If health was obtained, add image to menu
      let health = health_id[0];
      let id = health_id[1];
      if (health) {
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
 * If the same page is selected, do nothing;
 * If another page is selected, empty current page and create the new one;
 * @param {object} page Object containing information on the page to be loaded
 * @param {boolean} reset_initial_params Option to reset all parameters
 */
View.prototype.selectPage = async function (page, reset_initial_params, reload = true, postprocess) {
  let self = this;
  let subpage = null;
  let page_data = {};

  // Updating map between jobid to day (can be used to check if job exists)
  // (Only done if search_field is used)
  if ( self.navdata.search_field && self.navdata.search_field.length > 0) {
    self.mapjobid_to_day = await update_mapjobid_to_day();
    // Check URL for search params and redirect if found.
    self.checkUrlForSearch();
  }

  if (Array.isArray(page)) {
    /* Adding the possibility of changing to a subpage when selectPage is called */
    subpage = page[1];
    page = page[0];
  }

  let pageChanged = self.selected_page != page;
  let subpageChanged = self.selected_subpage != subpage;

  // Updating clicked page
  self.clicked_page = page
  self.clicked_subpage = subpage

  if ( !reload && (!pageChanged) && (!subpage || (!subpageChanged))) {
    // Same page and subpage, nothing to do
    return;
  }

  // Remove keydown events
  $(document).off("keydown");

  // Search for page entry
  let activeId = null;
  for (let i = 0; i < self.navdata.pages.length && !activeId; i++) {
    const elem = self.navdata.pages[i];
    if (elem.pages) {
      for (let j = 0; j < elem.pages.length; j++) {
        const inner = elem.pages[j];
        if (inner.section === page) {
          Object.assign(page_data, inner);
          activeId = elem.section + "_dropdown_button";
          break;
        }
      }
    } else if (elem.section === page) {
      Object.assign(page_data, elem);
      activeId = page + "_button";
    }
  }

  // If the page or subpage has changed
  if ((pageChanged)||(subpageChanged)) {
    // Adding or updating loading screen
    self.loading(true,pageChanged?false:true)

    // If the page has changed, clean up top menus
    if (pageChanged) {
      $("main").children(":not(#main_content)").remove();
    }

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
    $("#filter_container").empty();
    $("#options").empty()
    $("#footer_content").empty();
    $("#footer_infoline_page_options").empty();
    $("#footer_infoline > #dragger").remove();
    $("footer").height($("#footer_infoline").height() + $("#footer_footer").height());
    self.gridApi = null;

    // Toggle navigation entry
    $("nav li").removeClass("active");
    $("#" + activeId).addClass("active");

    // Check if tabs are to be added
    let tabs = false;
    if (page_data.tabs?.length) {
      // Storing page tabs to use later when creating the tabs (page_data is overwritten below)
      page_tabs = page_data.tabs;
      // Getting current tab for page_data
      page_data =  page_data.tabs.find(element => element.section === subpage) || page_data.tabs[0];
      // If the page was changed (or opened the first time),
      // tabs need to be created
      if (pageChanged) {
        self.addTabs(page_tabs,page);
      }
      tabs = true;
    } else if (page_data.functions && Array.isArray(page_data.functions) && (index = page_data.functions.indexOf('init_dates')) > -1) {
      // If this is a history page, with init_dates to be called,
      // call it here to generate the tabs
      // Creating history tabs
      self.initDates(page,subpage)
      tabs = true;
    }
    // Selecting tab, if that is the case
    self.setActiveTab(subpage);

    // Updating loading screen
    self.loading(true,tabs)

    // Store current data, template, context and functions of current page/subpage to reuse when needed
    self.page_data = (page_data.data) ?? null;
    self.page_description = (page_data.description) ?? null;
    self.page_template = (page_data.template) ?? null;
    self.page_context = (page_data.context) ?? null;
    self.page_functions = (page_data.functions) ?? null;
    self.footer_graph_config = (page_data.footer_graph_config) ?? null;
    self.graph_page_config = (page_data.graph_page_config) ?? null;

    // Updating page_context depending on subpage
    self.page_context = ((typeof subpage === 'undefined')||(isNaN(parseInt(subpage)))) ? replaceDataPlaceholder(self.page_context) : self.get_history_context(subpage);
  }

  self.applyTemplates([
    {
      "element": "#main_content",
      "template": self.page_template,
      "context_location": self.page_context,
    },
    {
      "element": "#footer_content",
      // If page didn't change, footer does not need to be loaded again
      // (Only the event_handler, that is added in post-processing below)
      "template": (pageChanged||subpageChanged)?page_data.footer_template:null
    }], 
    self.page_functions,
    function () {
      if ((!pageChanged) && (!subpageChanged)) {
        // If page or subpage has not changed (i.e., refresh)
        if (self.footer_graph) {
          // Adding handler (only on reload, as footer already exists and handler will not be added)
          self.footer_graph.add_event_handler();
        }
      } else {
        // If page or subpage has changed

        // Scrolling back to the top after changing page (otherwise, it keeps scrolling position)
        document.getElementById('main_content').scrollTo({top: 0});

        // Add button that shows more information about current page (when a description is given)
        if (self.page_description) {
          self.add_or_update_infobutton(self.page_description);
        } else {
          $("#information").empty()
        }
      }

      // Update text in footer_infoline with the url data and page data info
      self.update_view_data_info();

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

      // Defering functions
      setTimeout(() => {
        // Resize view and reset autoresize
        resize();
        // Remove loading element
        // if (self.gridApi) {
        //   self.gridApi.setGridOption('onGridReady', () => self.loading(false));
        // } else 
        if (page != 'live') {
          self.loading(false);
        }

        // Post-process function after selecting page
        if (typeof postprocess === "function") postprocess();

        // Wait for the browser to paint the changes
        // (Double requestAnimationFrame to ensure the event fires after the next paint cycle)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const event = new CustomEvent("pageLoadComplete");
            window.dispatchEvent(event);
          });
        });
      }, 0);

      return;
    });
  // Store page
  if (typeof (Storage) !== "undefined") {
    sessionStorage.setItem("last_page", subpage ? `${page}${self.page_separator}${subpage}` : page);
  }

  if (reset_initial_params) {
    self.initial_data = {};
  }
  self.initial_data.page = subpage ? `${page}${self.page_separator}${subpage}` : page;

  // Setting Hash on URL
  self.setHash(true);
  // Update info in footer_footer
  self.update_status_info()

  return;
}


View.prototype.checkUrlForSearch = function() {
  // Use a URL object to easily manipulate params
  const url = new URL(window.location.href);
  const field = url.searchParams.get('search_field');
  const value = url.searchParams.get('search_value');

  // If URL contains search params, trigger the search
  if (field && value) {
    
    // Remove parameters to avoid infinite loop
    url.searchParams.delete('search_field');
    url.searchParams.delete('search_value');
    
    // Update the browser URL without reloading
    window.history.replaceState(null, '', url);

    // Trigger the search and change page
    apply_search(field, value, true);
  }
};

/**
 * Update the text in #view_data_info with url_data and page_data, when they exist
 */
View.prototype.update_view_data_info = function() {
  let self = this;
  // info_str to be written on the "footer_infoline" (above the bottom graphs, when they are present)
  // (such as project / user name from URL)
  // This is done here because the text in view_data_info may be updated with 
  // the page.data.info contents, so the text must be rewritten for every page
  // to make sure it is correct
  let info_str = "";

  // Process data from the URL stored in self.url_data 
  for (let key in self.url_data) {
    if (key != "config") {
      info_str += Handlebars.escapeExpression(key.capitalize()) + ": <strong>" + Handlebars.escapeExpression(self.url_data[key]) + "</strong>; ";
    }
  }

  // Now process self.page_data.info, which may contain per-page info
  if ((self.page_data)&&(self.page_data.info)) {
    let infoData = self.page_data.info;

    // Helper function to append the info
    const appendInfo = (k, v) => {
      info_str += Handlebars.escapeExpression(k) + ": <strong>" + Handlebars.escapeExpression(v) + "</strong>; ";
    };

    if (Array.isArray(infoData)) {
      // Case: info is a list like [{Benchmark: "Name"}]
      infoData.forEach(item => {
        if (typeof item === 'object') {
          for (let k in item) {
            appendInfo(k, item[k]);
          }
        } else {
          // Case: info is a list of strings ["Benchmark: Name"]
          info_str += Handlebars.escapeExpression(item) + "; ";
        }
      });
    } else if (typeof infoData === 'object') {
      // Case: info is a single object {Benchmark: "Name"}
      for (let k in infoData) {
        appendInfo(k, infoData[k]);
      }
    } else {
      // Case: info is just a string "Benchmark: Name"
      info_str += Handlebars.escapeExpression(infoData) + "; ";
    }
  }

  // Cleanup trailing "; " and update DOM
  // We check if the string has length to avoid errors on empty strings
  if (info_str.length > 2) {
    info_str = info_str.substring(0, info_str.length - 2);
  }

  $("#view_data_info").html(info_str);
}


/**
 * Creates tabs on content page (main_content)
 */
View.prototype.addTabs = function (page_tabs, page) {
  // Failsafe to not create tabs in case they are already there
  if ($("#tabs").length > 0) {
    return;
  }

  // Create the container
  let tabs = $("<div id='tabs'></div>");

  // Prepare the links
  page_tabs.forEach(tab => {
    // Construct the href for opening the links with modifier keys
    // It needs the 'data-section' so the event listener knows which subpage to load.
    let link = $(`<a href="#page=${page}&subpage=${tab.section}"></a>`)
      .attr("data-section", tab.section)
      .text(tab.name);

    tabs.append(link);
  });

  let tabs_scroll = $("<div id='tabs_scroll'></div>").append(tabs);

  // Add tabs to the DOM before the main content
  let main = $("#main_content");
  tabs_scroll.insertBefore(main);
}


/**
 * Set the respective tab as active
 * @param {string} subpage The section name of the tab to activate
 */
View.prototype.setActiveTab = function (subpage) {
  const tabsContainer = $('#tabs');

  // If there are no tabs, nothing to do
  if (!tabsContainer.length) return;

  // Otherwise, remove 'active' class from whatever is currently active
  tabsContainer.find('a.active').removeClass('active');

  // Try to find the specific tab requested
  let targetTab = null;
  if (subpage) {
    targetTab = tabsContainer.find(`a[data-section="${subpage}"]`);
  }

  // If no subpage was given ot if the given subpage doesn't exist in the list,
  // select the first tab available.
  if (!targetTab || !targetTab.length) {
    targetTab = tabsContainer.find('a').first();
  }

  // Otherise, select given subpage
  if (targetTab.length) {
    targetTab.addClass('active');
  }
};

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
      let texts = Array.isArray(text) ? text : [text];
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
      // info_str contains "Last update: 2023-11-06T10:30:00+01:00"
      let result = info_str.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
      if (result) {
        const resultDate = new Date(result[0]);
        const now = new Date();
        const differenceInMinutes = (now.getTime() - resultDate.getTime()) / 60000;

        if (differenceInMinutes > 10.0) {
          $("#view_status_info").css("color", 'red');
        } else {
          $("#view_status_info").css("color", '');
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

/**
 * Add filter to grid
 * @param {*} new_filter Filter(s) to be added
 * @param {*} delimiter string to separate more than one string when filter already exist
 */
View.prototype.add_filter = function (new_filter,delimiter="||") {
  let self = this;
  let full_filter = { ...self.initial_data.filter }; // Start with a shallow copy of self.initial_data.filter
  for (let key in new_filter) {
    if (full_filter.hasOwnProperty(key)) {
      if (!full_filter[key].includes(new_filter[key])) {
        // If both objects have the same key, and the old key does not include the filter already, concatenate values
        full_filter[key] = `${full_filter[key]}${delimiter}${new_filter[key]}`;
      }
    } else {
      // If the key is only in new_filter, add it to the merged object
      full_filter[key] = new_filter[key];
    }
  }
  apply_filter(full_filter);
}

/**
 * Compare the checkboxes on filter options table with the 'filters' and select the ones that 
 * are already included
 * @param {*} filters filters to be checked
 */
View.prototype.check_filteroptions = function (filters) {
  let self=this;
  if ((typeof self.page_data.options != 'object')||((typeof self.page_data.options === 'object')&&(!Object.keys(self.page_data.options).length))) {return;}
  // Checking if checkboxes on options need to be checked, and checking them
  for (let [name, input] of Object.entries(self.page_data.options)) {
    for (let [optname, filter] of Object.entries(input)) {
      let id = `${name.replace(/(\s)/g, '_')}_${optname.replace(/(\s)/g, '_')}`;
      let checked = true;
      for (let [key, value] of Object.entries(filter)) {
        if (!filters.hasOwnProperty(key)||!filters[key].includes(value)) {
          checked = false
        }
      }
      $(`#${id}`).prop('checked', checked);
      if(name=='State') {
        $(`#filter_${optname.toLowerCase()}`).toggleClass("active", checked)
      }
    }
  }  
}

/**
 * Remove filter from grid
 * @param {*} new_filter Filter(s) to be added
 */
View.prototype.remove_filter = function (new_filter,delimiter="||") {
  let self = this;
  let full_filter = { ...self.initial_data.filter }; // Start with a shallow copy of self.initial_data.filter
  for (let key in new_filter) {
    if (full_filter.hasOwnProperty(key)) {
      if (full_filter[key].includes(new_filter[key])) {
        // If both objects have the same key (it should have), remove value
        full_filter[key] = full_filter[key].replace(`${delimiter}${new_filter[key]}`,"");
        full_filter[key] = full_filter[key].replace(`${new_filter[key]}${delimiter}`,"");
        full_filter[key] = full_filter[key].replace(new_filter[key],"");
        // if (!full_filter[key].length) {
        //   delete full_filter[key];
        // }
      }
    }
  }
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
View.prototype.add_filter_options = function (filter,options) {
  if (typeof (options) == "undefined"||!Object.keys(options).length) {return;}
  let self = this;

  if(!filter.length){
    return;
  }
  self.filteroptions = options;

  // Creating table with filter options
  $('#optionsdiv').remove() // Removing previous before adding new one
  let desc = 'Options to filter table:'
  let optionsdiv = $('<div>',{id: "optionsdiv"}).hide()
  let optionstable = $('<table>',{id: "optionstable",width: 100+200*Object.keys(options).length});
  let optionsrow = $('<tr>').append($('<th>',{"aria-label":desc})
    .text(desc))

  // Looping over the different options according to their order on the columns
  for (let [key, values] of Object.entries(options).sort(([a], [b]) => sortByKeyOrder(a, b, self.gridApi.getColumns().map((col)=>col.colDef.headerName)))) {
    let id = key.replace(/(\s)/g, '_');
    // Adding current option 'title' in a cell
    optionsrow.append($('<td>',{id: id}).append($('<span>').text(`${key}: `).css("vertical-align", "middle")).addClass('optionname'))
    let this_option = $('<td>').addClass('optionvalues')
    // Looping over the different options for this given field, and creating the checkbox filteroptions
    for (let [optname, filter_entry] of Object.entries(values)) {
      let inputid = `${id}_${optname.replace(/(\s)/g, '_')}`;
      let option_input = $('<input>',{type: 'checkbox',id: inputid, name: id, value: optname})
      let option_label = $('<label>',{for: inputid}).append($('<span>').text(optname).css("vertical-align", "middle"))
        .prepend(option_input)
      this_option.append(option_label)
        .append(`<br>`);
      // Adding filter when input checkbox is clicked
      $('main').on('change', `#optionsdiv #${inputid}`, (e) => {
        let delimiter="||";
        if (e.target.checked) {
          self.add_filter(filter_entry,delimiter=delimiter);
        } else {
          self.remove_filter(filter_entry,delimiter=delimiter);
        }
      })

    }
    optionsrow.append(this_option)
  }
  // Creating div with table with filter options to be added to DOM
  optionstable.append(optionsrow)
  optionsdiv.append(optionstable)

  // Create the container for the toggle buttons
  let filterToggle = $('<div>')
    .addClass('filter-toggle')
    .attr('id', 'status-filter-toggle')

  // Define the buttons with their respective colors
  const buttons = [
    { 
      label: 'C', 
      color: 'green', 
      tooltip: 'Toggle filter for COMPLETED jobs',
      id: 'filter_completed',
      function: () => {
        let delimiter="||";
        if ($('#filter_completed').hasClass('active')) {
          self.add_filter({State: 'COMPLETED'},delimiter=delimiter);
        } else {
          self.remove_filter({State: 'COMPLETED'},delimiter=delimiter);
        }
      } 
    },
    { 
      label: 'F', 
      color: 'red', 
      tooltip: 'Toggle filter for FAILED jobs',
      id: 'filter_failed',
      function: () => {
        let delimiter="||";
        if ($('#filter_failed').hasClass('active')) {
          self.add_filter({State: 'FAILED'},delimiter=delimiter);
        } else {
          self.remove_filter({State: 'FAILED'},delimiter=delimiter);
        }
      } 
    },
    { 
      label: 'R', 
      color: 'blue',
      tooltip: 'Toggle filter for RUNNING jobs',
      id: 'filter_running',
      function: () => {
        let delimiter="||";
        if ($('#filter_running').hasClass('active')) {
          self.add_filter({State: 'RUNNING'},delimiter=delimiter);
        } else {
          self.remove_filter({State: 'RUNNING'},delimiter=delimiter);
        }
      } 
    },
    { 
      label: '+', 
      color: 'black', 
      tooltip: `${self.initial_data.options?.showoptions ? "Hide" : "Show"} pre-selected filter options`,
      id: 'filteroptions',
      function: () => {
        let filteroptions = $('#filteroptions')
        // Turns on and off filter options
        if (self.initial_data.options?.showoptions) {
          // If "aria-label"is already showing up when clicking the filteroptions, then turn it off
          filteroptions.attr("data-original-title","Click to show the options to filter the table")
            .attr("aria-label","Click to show the options to filter the table")
          delete self.initial_data.options.showoptions;
          $('#optionsdiv').slideUp(function() {
            $(this).remove();
            resize()
          });
          self.setHash();
        } else {
          // If "aria-label" does not exist when clicking the filteroptions, then turn it on
          filteroptions.attr("data-original-title","Click to hide the options to filter the table")
            .attr("aria-label","Click to hide the options to filter the table")
          self.initial_data.options = { 'showoptions': 'true' };
          self.setHash();
          $('main').prepend(optionsdiv);
          // Checking which options should be already selected
          self.check_filteroptions(self.initial_data.filter);
          optionsdiv.slideDown(function() {
            resize();
          });
        }
        return;
      } 
    }
  ];

  // Loop through the buttons to create and add them
  buttons.forEach(button => {
    const btn = $('<button>')
      .addClass('filter-toggle-btn')
      .attr('id',button.id)
      .text(button.label)
      .attr('data-value', button.label)
      .attr("title",button.tooltip)
      .attr("aria-label",button.tooltip)
      .attr('data-toggle', "tooltip")
      .attr('data-html', "true")
      .attr('data-placement', "bottom")
      .css({
        color: button.color,
      })
      .off('click') // Turning off first, to avoid adding multiple events
      .on('click', function () {
        $(this).toggleClass('active');
        button.function();
      });

    // Add the button to the container
    filterToggle.append(btn);
  });

  // Add the toggle buttons to the #filter element
  filter.append(filterToggle);

  // If show info is active (from URL), activate it
  let filteroptions = $('#filteroptions')
  if (self.initial_data.options?.showoptions) {
    filteroptions.addClass('active');
    filteroptions.attr("data-original-title","Click to hide the options to filter the table")
      .attr("aria-label","Click to hide the options to filter the table")
    $('main').prepend(optionsdiv);
    // Checking which options should be already selected
    self.check_filteroptions(self.initial_data.filter);
    optionsdiv.slideDown(function() {
      resize();
    });
    resize();
  }
  return;
}


/**
 * Add show-info button
 */
View.prototype.add_or_update_infobutton = function (description) {
  let self = this;
  let text = `Click to ${self.initial_data.description?.showinfo ? "hide" : "show"} description of page`;
  let button = $('#information > button')
  let text_paragraph = $('#infotext > p')
  if (text_paragraph.length>0) {
    // If info_text exist, just update text
    text_paragraph.attr("aria-label",description)
      .html(description);
    
    // Apply KaTeX after updating existing text
    self.renderLaTeX('infotext');
    return                              
  }
  if (!button.length) {
    button = $('<button>',{type: "button", class: 'inner-circle', title: text}).attr("aria-label",text)
      .attr('data-toggle', "tooltip")
      .attr('data-html', "true")
      .attr('data-placement', "bottom")
      .addClass("fa")
      .addClass("fa-info");
    $('#information').append(button)
  }
  text_paragraph = $('<p>').attr("aria-label",description)
    .html(description);
  let infotext = $('<div>',{id: "infotext"}).append(text_paragraph)
    .hide();

  // If show info is active (from URL), activate it
  if (self.initial_data.description?.showinfo) {
    button.addClass('active');
    button.attr("data-original-title","Click to hide description of page")
      .attr("aria-label","Click to hide description of page")
    // Removing previous text before adding new one
    $('#infotext').remove();
    $('main').prepend(infotext);

    // Apply KaTeX for the initial page load
    self.renderLaTeX('infotext');

    infotext.slideDown(function() {
      resize()
    });
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
        resize()
      });
      self.setHash();
    } else {
      // If it presentation mode does not exist when clicking the button, then turn it on
      button.attr("data-original-title","Click to hide description of page")
        .attr("aria-label","Click to hide description of page");
      self.initial_data.description = { 'showinfo': 'true' };
      self.setHash();
      $('main').prepend(infotext);

      // Apply KaTeX after the user clicks to show info
      self.renderLaTeX('infotext');

      infotext.slideDown(function() {
        resize()
      });
    }
    return;
  });
  return;
}

/**
 * Applies KaTeX rendering to a specific element
 */
View.prototype.renderLaTeX = function (elementId) {
  let el = document.getElementById(elementId);
  if (el && typeof renderMathInElement === 'function') {
    renderMathInElement(el, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
        {left: '\\[', right: '\\]', display: true}
      ],
      throwOnError: false
    });
  }
};

/**
 * Add auto-refresh button
 */
View.prototype.add_autorefresh = function () {
  let self = this;
  let text = `Auto-refresh is ${self.initial_data.refresh.disablerefresh ? "OFF" : "ON"}`;
  let button = $('<button>',{type: "button", class: 'inner-circle', title: text}).attr("aria-label",text).addClass("fa").addClass("fa-refresh");
  // Getting refresh time from property --time on :root
  const refresh_time = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--time'))

  // If disable refresh is not active (from URL), activate it
  if (! self.initial_data.refresh.disablerefresh) {
    button.addClass('active');
    button.attr("data-original-title","Auto-refresh is ON")
      .attr("aria-label","Auto-refresh is ON")
      .removeClass("fa")
      .removeClass("fa-refresh");
    let seconds = refresh_time;
    self.refreshinterval = setInterval(function () {
      button.text(seconds).attr("aria-label",`Auto-refresh in ${seconds} seconds`);
      seconds = seconds - 1;
      if (seconds === 0) {
        seconds = refresh_time;
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
      let seconds = refresh_time;
      self.refreshinterval = setInterval(function () {
        button.text(seconds).attr("aria-label",`Auto-refresh in ${seconds} seconds`);
        seconds = seconds - 1;
        if (seconds === 0) {
          seconds = refresh_time;
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
  let self = this;
  let selected_jobid = null;
  let index;
  if (self.selected_page != 'live') {
    // For pages different than the 'live view', try to store the current selected job
    if($("#main_content table").length){
      // Storing jobid that is selected before
      index = self.headers[self.clicked_page].indexOf('JobID');
      selected_jobid = $("#main_content table tbody tr.selected td").eq(index).text()??""
    } else if (self.gridApi) {
      self.gridState[self.selected_page] = self.gridApi.getState(); // Save current state to recover after refresh
      const selectedNodes = self.gridApi.getSelectedNodes();
      if (selectedNodes.length > 0) {
        selected_jobid = selectedNodes[0].data.jobid; // Just save the ID string
      }
    }

    // Re-select current page and subpage and re-select the job, if possible
    self.selectPage(
      [self.selected_page,self.selected_subpage],
      false,
      true,
      function() {
        // If there was no selected job, return
        if (!selected_jobid) return;

        if (self.gridApi) {
          // Defering the selection, to avoid the possibility of selecting the old version of the grid
          setTimeout(() => {
            self.gridApi.forEachNode((node) => {
              // Find the node by the saved job ID
              if (node.data.jobid == selected_jobid && node.displayed) {
                // Selecting it
                node.setSelected(true);
                // Making it visible
                self.gridApi.ensureIndexVisible(node.rowIndex, 'middle');
              }
            });
          }, 0); 
        } else if ($("#main_content > table").length){
          // This is done after the new elements are created, so the old ones were already renamed
          // (and we have to click only on that one, otherwise the job is deselected on the old)
          let table = $('#main_content > table');
          index = self.headers[self.clicked_page].indexOf('JobID');
          // ...reselecting row with the same jobid (when present)
          const jobid_row = table.find(`tbody td:nth-child(${index+1}):contains('${selected_jobid}')`).parent()[0];
          if (jobid_row) {
            jobid_row.click()
          }
        }
      }
    );
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
  if ($('#main_content table').length) {
    let randomtd = Math.floor(Math.random() * $('#main_content table > tbody tr:visible').length);
    randomjob = $('#main_content table > tbody tr:visible').eq(randomtd)[0];
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
  if($("#main_content table").length){
    self.headers[self.clicked_page] = $("#main_content table thead tr:first th").map(function() { 
      return $(this).text();
    }).get();
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
View.prototype.loading = function (state,tabs) {
  if (state) {
    let loading;
    $("html,body").css("cursor", "progress");
    if ($(".loading").length == 0) {
      loading = $("<div>").addClass("loading");
      loading.css("top", $("#header").height()+(tabs?$("#tabs_scroll").outerHeight():0)+(($("#infotext").length>0)?$("#infotext").outerHeight()+4:0)+1);
      loading.css("bottom", $("#footer_footer").height());
      loading.append($("<span>").text("LLview is loading. Please wait...").prepend("<br/>").prepend($("<span>").addClass("fa").addClass("fa-spinner").addClass("fa-spin")));
      $("body").append(loading);
    } else {
      loading = $(".loading");
      loading.css("top", $("#header").height()+(tabs?$("#tabs_scroll").outerHeight():0)+(($("#infotext").length>0)?$("#infotext").outerHeight()+4:0)+1);
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
    data.footer_template = "graph_footer_plotly";
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
  self.all_page_sections.push(elem.parent_section??elem.section);
  // If footer page or graph page is used, add corresponding scripts
  if (elem.footer_graph_config || elem.graph_page_config) {
    self.addons.scripts = new Set([...self.addons.scripts, ...["plotly_graph.js","mermaid_graph.js", elem.footer_graph_config ? "footer_graphs.js" : "page_graph.js" ]])
  }

  // Getting scripts needed on the website and removing from config
  self.addons.scripts = new Set([...self.addons.scripts, ...self.getEntries(elem.scripts,'scripts')]);
  delete elem.scripts;
  // Getting scripts from refs
  self.addons.scripts = new Set([...self.addons.scripts, ...self.getEntries(elem.ref,'scripts',self.refdata)]);

  // Getting styles needed on the website and removing from config
  self.addons.styles = new Set([...self.addons.styles, ...self.getEntries(elem.styles,'styles')]);
  delete elem.styles;
  // Getting styles from refs
  self.addons.styles = new Set([...self.addons.styles, ...self.getEntries(elem.ref,'styles',self.refdata)]);

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
View.prototype.getEntries = function (object, type, refdata) {
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
 * @typedef {Object} TemplateEntry
 * @property {string} [template]             Name of the Handlebars template (without .handlebars). Optional.
 * @property {string} [context_location]     Path to a .json/.csv/.txt context file. Optional.
 * @property {Object|string} [context]       Inline context (object for templates or HTML string if no template).
 * @property {string} element                jQuery selector (or DOM selector) where the output is inserted.
 */

/**
 * Fetches and applies one or more Handlebars templates (and their contexts) into the DOM.
 * This version uses a Web Worker to offload heavy template compilation and rendering,
 * keeping the main UI thread responsive.
 *
 * @param {TemplateEntry|TemplateEntry[]} templates
 * @param {function} [postprocess]
 * @returns {void}
 */
View.prototype.applyTemplates = function (templates, initializers, postprocess) {
  const self = this;
  // normalize input
  templates = Array.isArray(templates) ? templates : [templates];
  if (!templates.length) {
    if (initializers && Array.isArray(initializers)) {
      initializers.forEach(function_name => {
        if (typeof window[function_name] === 'function') {
          window[function_name](self.clicked_page, self.clicked_subpage);
        }
      });
    }
    if (typeof postprocess === "function") postprocess();
    return;
  }

  // Before fetching any resources, invalidate the cache for the dynamic
  // context files that this run is going to use. This ensures that
  // the auto-refresh will re-download the latest data.
  templates.forEach(t => {
    if (t.context_location) {
      delete self._resourceCache[t.context_location];
      delete self.contexts[t.context_location];
    }
  });

  // Terminate all workers from a previous run. This is the primary, immediate
  // cancellation mechanism for the heavy computation part.
  self._activeWorkers.forEach(worker => worker.terminate());
  self._activeWorkers = []; // Clear the array for the new run.

  // cancel any previous AJAX requests
  self._templateRequests.forEach(r => { try { if (r && typeof r.abort === "function") r.abort(); } catch (e) {} });
  self._templateRequests.length = 0;

  // bump id for this applyTemplates run so we can detect stale runs
  self._applyTemplatesId = (self._applyTemplatesId || 0) + 1;
  const localApplyId = self._applyTemplatesId;

  // fetch + parse resource (json/csv/text), dedupe via cache, push jqXHR for aborting
  function getResource(path) {
    if (self._resourceCache[path]) {
      return self._resourceCache[path];
    }
    let jq; 
    let promise;
    if (path.endsWith(".json")) {
      jq = $.getJSON(path);
      promise = jq;
    } else if (path.endsWith(".csv")) {
      jq = $.get(path, null, "text");
      promise = jq.then(text => csvToArr(text, ";"));
    } else {
      jq = $.get(path, null, "text");
      promise = jq;
    }

    // store jq so we can abort it later if needed
    if (jq && typeof jq.abort === "function") {
      self._templateRequests.push(jq);
    }
    // normalize to a Promise (jq is thenable)
    const p = Promise.resolve(promise)
      .then(res => {
        // Caching context to use later on
        if (path.endsWith(".json") || path.endsWith(".csv")) {
          self.contexts[path] = res;
        }

        // Return the result to keep the promise chain intact
        // for the rest of the applyTemplates logic.
        return res;
      })
      .catch(err => { 
        // If this promise is rejected (e.g., by an abort), we MUST remove it
        // from the cache. Otherwise, the cache becomes "poisoned" with a
        // permanently rejected promise for this resource.
        delete self._resourceCache[path];

        // Re-throw the error so that the Promise.all that is waiting for this
        // resource will correctly fail for the current applyTemplates run.
        throw err; 
      });
    self._resourceCache[path] = p;
    return p;
  }

  // Build fetch promises for all templates (parallel)
  const allFetchPromises = templates.map(t => {
    if (!t.template) {
      const ctxPromise = t.context_location ? getResource(t.context_location) : Promise.resolve(t.context ?? {});
      return ctxPromise.then(contextData => ({
        templateEntry: t,
        templateText: null,
        contextData
      }));
    }
    const template_path = process_path(t.template + ".handlebars", "templates/");
    const tplPromise = getResource(template_path);
    const ctxPromise = t.context_location ? getResource(t.context_location) : Promise.resolve(t.context ?? {});
    return Promise.all([tplPromise, ctxPromise]).then(([templateText, contextData]) => ({
      templateEntry: t,
      templateText,
      contextData
    }));
  });

  // Wait for all fetches
  Promise.all(allFetchPromises)
    .then(async results => {
      if (localApplyId !== self._applyTemplatesId) return;

      self._templateRequests.length = 0;

      // This flag will prevent race conditions where multiple workers might
      // try to trigger the same main-thread UI function.
      let addControlsCalledThisRun = false;

      // Map each template task to a promise that resolves when its worker is done.
      // This launches all worker jobs in parallel.
      const allRenderPromises = results.map(result => {
        const { templateEntry, templateText, contextData } = result;

        // Immediately handle templates that don't need a worker.
        if (!templateEntry.template) {
          // If no template is given, return a resolved promise
          // so Promise.all doesn't hang.
          return Promise.resolve(null);
        }

        // Return a new promise representing the entire lifecycle of one worker task.
        return new Promise((resolve, reject) => {
          // Check for cancellation before creating the worker
          if (localApplyId !== self._applyTemplatesId) return reject('aborted');

          // Starting a separate worker to keep main thread free and responsive.
          // This worker will render the page with the templates, which is the heavier
          // part when loading the page.
          const worker = new Worker('js/template.worker.js');

          // Add the newly created worker to the active fleet.
          self._activeWorkers.push(worker);

          worker.onmessage = event => {
            // Check again for cancellation *after* the worker finishes,
            // to prevent rendering stale content.
            if (localApplyId !== self._applyTemplatesId) {
              worker.terminate(); // Clean up this worker
              return reject('aborted'); // Ignore messages from old workers
            }

            const { command, html, error, name, scale } = event.data;

            // Different commands that may be received from the worker
            // If new messages/commands should be communicated, they must be defined here.
            switch (command) {
              case 'render_complete':
                // This is the message to indicate that the render
                // is complete and the worker job is done.
                worker.terminate(); // Worker's job is done, clean it up.
                // Resolve with an object containing the HTML and its target element.
                resolve({ html, element: templateEntry.element });
                break;

              case 'cache_colorscale':
                // The worker computed a new colorscale, that should be 
                // updated on the main thread's 'used_colorscales'.
                self.used_colorscales[name] = scale;
                break;

              case 'add_controls':
                // The worker finished rendering and there are columns with colors. 
                // The main thread should call add_colorscale_controls.
                // Use the flag to ensure this is only called once per applyTemplates run.
                if (!addControlsCalledThisRun) {
                  self.add_colorscale_controls();
                  addControlsCalledThisRun = true;
                }
                break;

              case 'error':
                // The worker encountered an error during its work.
                worker.terminate();
                console.error("Error from worker:", error);
                reject(new Error("An error occurred in the template worker. See console for details."));
                break;
            }
          };

          worker.onerror = err => {
            worker.terminate();
            console.error("A worker error occurred:", err);
            const errorMessage = err.message || "An unknown worker error occurred.";
            reject(new Error(`Worker error: ${errorMessage} in ${err.filename} at line ${err.lineno}`));
          };

          // Before sending the job, create a plain object containing a snapshot
          // of the data from the 'view' (self) object that helpers will need.
          const helperContext = {
            is_demo: (self.navdata.data.demo || self.url_data.demo) ? true : false,
            permission: self.navdata.data.permission,
            windowLocation: {
              origin: window.location.origin,
              pathname: window.location.pathname,
              search: window.location.search,
              hash: window.location.hash
            },
            mapjobid_to_day: self.mapjobid_to_day,
            system: self.navdata.data.system,
            fs: self.navdata.data.fs,
            colorscale: self.initial_data.colors.colorscale,
            default_colorscale: self.default_colorscale,
            url_data: self.url_data,
            used_colorscales: self.used_colorscales, // cached colorscales
            // Add any other properties from `self` that other helpers might need here.
          };

          // Send the context object along with the template and data.
          worker.postMessage({
            templateText,
            contextData,
            helperContext // The payload for helpers
          });
        });
      });

      // Wait for ALL the parallel worker jobs to complete.
      return Promise.all(allRenderPromises);
    })
    .then(renderedTemplates => {
      // This .then() only runs after every single worker has finished
      if (localApplyId !== self._applyTemplatesId) return;

      // The run was successful, clear the active workers array
      self._activeWorkers = [];

      const templatesToRender = renderedTemplates.filter(r => r && r.element && typeof r.html === 'string');

      // If there's nothing to render, run scripts on the existing DOM and exit
      if (templatesToRender.length === 0) {
        if (Array.isArray(initializers)) {
          initializers.forEach(name => {
            if (typeof window[name] === 'function') window[name](self.clicked_page, self.clicked_subpage);
          });
        }
        if (typeof postprocess === "function") postprocess();
        return;
      }

      // If this is an auto-refresh, we want the page to update from the old version
      // to the new one without flickering much.
      // For that, we place all new content into the DOM, but keep it transparent
      // using an invisible overlay
      templatesToRender.forEach(result => {
        const targetElement = $(result.element);
        const tagName = targetElement.prop('tagName').toLowerCase();

        // If the element where the new templates are to be added is not empty,
        // this means this is a refresh. The previous element IDs must be renamed
        // to avoid conflicts
        if (!targetElement.is(':empty')) {

          // Creating the overlay element, that is a clone of
          // the target element, but transparent
          // For elements in <main>, they are placed on the
          // same grid cell
          const overlay = $(`<${tagName}>`);
          $.each(targetElement[0].attributes, function() {
            overlay.attr(this.name, this.value);
          });
          overlay.addClass('update-overlay');

          // Rename IDs on the children of the target element parent 
          // (including target element) to keep the container stable
          targetElement.find('[id]').addBack('[id]').each(function() {
            const currentId = $(this).attr('id');
            if (currentId) $(this).attr('id', currentId + '_old_temp');
          });          
          targetElement.css('position', 'relative');

          overlay.html(result.html);
          targetElement.before(overlay);
        } else {
          // For an initial load, render the content and hide it with a class
          targetElement.html(result.html);
        }
      });

      // Store old grid to be able to destroy it later and avoid a memory leak
      const oldGridApi = self.gridApi;

      // Run all scripts on the prepared DOM
      // The content is now in place but transparent. 
      // (e.g., AG Grid should initialize here)
      if (Array.isArray(initializers)) {
        initializers.forEach(name => {
          if (typeof window[name] === 'function') {
            try {
              window[name](self.clicked_page, self.clicked_subpage);
            } catch (e) { 
              console.error(`Error in initializer '${name}':`, e); 
            }
          }
        });
      }

      // A counter to track when all reveal operations are complete
      let finalizationCounter = templatesToRender.length;

      const onFinalizationComplete = () => {
        finalizationCounter--;
        // When the last operation is done, call postprocess
        if (finalizationCounter === 0) {
          self.empty = false;
          if (typeof postprocess === "function") {
            try {
              postprocess();
            } catch (e) {
              console.error("Error in postprocess:", e);
            }
          }
        }
      };

      // Make the fully initialized content visible
      // using requestAnimationFrame to ensure this runs just before the next browser paint.
      // This gives AG Grid's synchronous setup code time to complete.
      // requestAnimationFrame(() => {
      templatesToRender.forEach(result => {
        // Getting the old targetElement and its parent
        const targetElement = $(`${result.element}_old_temp`);
        const targetParent = targetElement.parent();


        // If this was a refresh, show the new element and clean up the old one
        const overlay = targetParent.find('> .update-overlay');
        if (overlay.length) {
          // This is a REFRESH

          // Making elements visible before cleaning up, as they may
          // take some time to load. So we make the new elements visible here
          // for the swap to happen without flickering
          // (Transparent objects may still look strange/flicker)
          overlay.css('opacity', 1);

          // Run post-processing functions on elements,
          // so they are prepared on the background before swapping
          onFinalizationComplete();

          // Now that the overlay is fully visible and prepared, 
          // perform the cleanup.
          setTimeout(() => {
            // Destroy the OLD grid API that we stored earlier
            if (oldGridApi && typeof oldGridApi.destroy === 'function') {
              try {
                oldGridApi.destroy();
              } catch(e) {
                console.error('Error destroying old AG Grid API:', e);
              }
            }

            // Clean up old content from old targetElement
            targetElement.empty().remove();

            // Clean up overlay/new targetElement
            overlay.removeClass('update-overlay')
          }, 500);

        } else {
          // Initial load of the page
          onFinalizationComplete();
        }
      });

      self.empty = false;
    })
    .catch(err => {
      // If a newer applyTemplates run has started, this .catch() block belongs
      // to a stale, cancelled run. It must NOT perform any cleanup, as that
      // would interfere with the new, active run.
      if (localApplyId !== self._applyTemplatesId) {
        return; // Exit silently
      }
      // If we are here, this is the currently active run, and it has failed.
      // Now we can safely perform cleanup.

      // Clear the active workers array to reset the state.
      // (The individual workers should have already been terminated by their
      // own onerror handlers, but this ensures the main array is clean).
      self._activeWorkers = [];

      // If we are here, it means this is the currently active run, and a
      // genuine, non-cancellation error occurred. Proceed with cleanup.
      const isAbort = err && (err.statusText === "abort" || err === "abort");
      if (!isAbort) {
        console.error("Error while applying templates:", err);
        self.empty = true;
        if (typeof self.loading === "function") self.loading(false);
      }
      // cleanup and still call postprocess (if applicable) so callers can finalize UI state
      self._templateRequests.length = 0;
      if (initializers && Array.isArray(initializers)) {
        initializers.forEach(function_name => {
          if (typeof window[function_name] === 'function') {
            window[function_name](self.clicked_page, self.clicked_subpage);
          }
        });
      }
      if (typeof postprocess === "function") postprocess();
    });
};


/**
 * Capitalize first letter of string
 * @returns {string} capitalized string
 */
String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
}


/**
 * Update URL with parameters in initial_data.page 
 * initial_data.filter and initial_data.sort
 * @param {boolean} keep_history Flag to keep page in history
 */
View.prototype.setHash = function (keep_history) {
  let self = this;
  let hash = "";
  parameter = {};
  // Add active page
  if (self.initial_data.page) parameter["page"] = self.initial_data.page;
  // Add active filter
  if (self.initial_data.filter) Object.assign(parameter, self.initial_data.filter);
  // Add active sort
  if (self.initial_data.sort) Object.assign(parameter, self.initial_data.sort);
  // Add colorscale
  if (self.initial_data.colors) Object.assign(parameter, self.initial_data.colors);
  // Add auto-refresh
  if (self.initial_data.refresh) Object.assign(parameter, self.initial_data.refresh);
  // Add Presentation Mode
  if (self.initial_data.presentation) Object.assign(parameter, self.initial_data.presentation);
  // Add description box
  if (self.initial_data.description) Object.assign(parameter, self.initial_data.description);
  // Add options box
  if (self.initial_data.options) Object.assign(parameter, self.initial_data.options);
  // Add quickfilter
  if (self.initial_data.quickfilter) parameter["quickfilter"] = self.initial_data.quickfilter;
  // Add footer height
  if (self.initial_data.footer_height) parameter["footer_height"] = self.initial_data.footer_height;
  // Add footer tab
  if (self.initial_data.footer_tab) parameter["footer_tab"] = self.initial_data.footer_tab;

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
 * When the index page is ready, crates the view with the chosen configurations
 */
$(document).ready(function () {
  // Bind resize function to relevant resize events
  $(window).resize(resize);
  $("#navbarSupportedContent").bind('shown.bs.collapse', resize);
  $("#navbarSupportedContent").bind('hidden.bs.collapse', resize);
  // Read and store parameters defined in the URL
  let parameters = getHash();
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
