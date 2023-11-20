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

/* The FooterGraph class represents multiple graph pages and holds the overall pages and graph configurations */
View.prototype.FooterGraph = function (config_file) {
  // Config file to be read by View.download_config()
  this.config_file = config_file;
  // Config information read from this.config_file
  this.config = "";
  this.graphs = [];
  this.data = {};
  this.selected_parameter = null;
  View.prototype.download_config.call(this).done(() => {
    this.add_mouse_resize();
    this.apply_config()
    this.add_event_handler();
    // Add click when footer is added after changing tabs and only one result is on the table (e.g., since filter has already been applied)
    if($("#main_content table tbody tr:visible").length == 1) {
      $("#main_content table tbody tr:visible")[0].click();
    }
  });
}

/* Add event handler to all rows of the current data table to be taken into account be the footer graph selection process */
View.prototype.FooterGraph.prototype.add_event_handler = function () {
  let self = this;
  // Getting names of all header cells as keys
  let keys = [];
  $("#main_content table thead tr:first").find("th").each(function () {
    keys.push($(this).text());
  });

  // Selecting or de-selecting a line
  $("#main_content table tbody tr").click(function () {
    if($(this).hasClass("selected")) { 
      // If clicking again on already selected line, deselect and restart footer
      $("#main_content table tbody tr").removeClass("selected");
      self.selected_parameter = null;
      self.clear();
      self.create_graphs();
      return; 
    } else {
      $("#main_content table tbody tr").removeClass("selected");
      $(this).addClass("selected");
      let params = {};
      let i = 0;
      for (let key of keys) {
        params[key] = $($(this).find("td")[i++]).text()
      }
      self.apply_data(params);
      return;
    }
  });

  /* Function to be used when the cursor keys are used to scroll through the table */
  function scroll(event) {
    if ([38, 40].indexOf(event.keyCode) == -1) {
      return
    }
    let current_selected = $("#main_content table tbody tr.selected");
    if (current_selected.length == 0) {
      return;
    }
    event.preventDefault();
    if (event.keyCode == 38) {
      var new_selected = current_selected.prevAll(":visible").first();
    } else {
      var new_selected = current_selected.nextAll(":visible").first();
    }
    if (new_selected.length > 0) {
      current_selected.removeClass("selected");
      new_selected.addClass("selected");
      let speed = 0;
      let newpos = Math.max(0, new_selected.position().top - $("#main_content").height() / 2);
      // By default use no animation only for larger jumps use timed animation. Animation at the end of
      // the scrollbar is skipped as well.
      if ((Math.abs($("#main_content").scrollTop() - newpos) > new_selected.height() * 2) &&
        ($("#main_content")[0].scrollHeight - new_selected.position().top - $("#main_content").height() / 2 > 0)) {
        speed = 400;
      }
      $("#main_content").animate({ scrollTop: newpos }, speed);
      let params = {};
      let i = 0;
      for (let key of keys) {
        params[key] = $(new_selected.find("td")[i++]).text();
      }
      self.apply_data(params);
    }
  }

  $(document).keydown(scroll);
  $("#main_content table tbody tr").addClass("clickable");
}


/* Add mouse drag to resize footer */
/* Adapted from: https://stackoverflow.com/a/53220241/3142385 */
View.prototype.FooterGraph.prototype.add_mouse_resize = function () {
  if (view.footersize) {
    $("footer").height(view.footersize);
  } else {
    // Default height for footer
    $("footer").height(280);
  }
  $('#footer_infoline').append('<hr />');
  let drag = $('#footer_infoline > hr')
  let self = this;
  const BORDER_SIZE = 4;
  const footer = $("footer");

  let m_pos;
  function resize_footer(e){
    const dy = m_pos - e.y;
    m_pos = e.y;
    footer.height(footer.height() + dy);
    view.footersize = footer.height();
    return;
  }
  function on_mouse_up() {
    document.removeEventListener("mousemove", resize_footer, false);
    document.removeEventListener("mouseup", on_mouse_up, false);
    self.resize_graph()
    return;
  }

  drag.on('mousedown', function(e){
    if(e.preventDefault) e.preventDefault();
    if(e.offsetY < BORDER_SIZE) {
      document.addEventListener("mouseup", on_mouse_up, false);
    
      m_pos = e.y;
      document.addEventListener("mousemove", resize_footer, false);
    }
    return;
  });

  return;
}


// Function to apply x-range relayout to all the elements to sync graphes
View.prototype.FooterGraph.prototype.relayout = function (ed) {
  sync_relayout(ed, this.graphs) ;
}

/* Resize footer graph area and all graphs */
View.prototype.FooterGraph.prototype.resize_graph = function () {
  // Resize graphs
  for (let graph of this.graphs) {
    graph.resize();
  }
  // Resize table window
  resize();
}

/* Take care of specifc parameter selection in table. */
View.prototype.FooterGraph.prototype.apply_data = function (params) {
  /* Store selected parameter in object to be reused when page is changed */
  if (params) {
    this.selected_parameter = params
  } else {
    params = this.selected_parameter;
  }
  if (params) {
    /* Adding info text below graphs */
    let info = this.config.find(o => { return o.name === this.current_page }).info;
    if (info) {
      $("#graph_info").text(replaceDataPlaceholder(info, params));
    }
    /* Check if all pages should be shown (configurable via "show_pattern" key) */
    this.config.forEach(page => { // Looping through the pages
      let match_pattern = true;
      if (page.show_pattern) {         // Testing if "show_pattern" exists
        for (const [key, values] of Object.entries(page.show_pattern)) {  // Looping over the patterns
          let patterns = Array.isArray(values) ? values : [values] // Transforming to array if necessary, to handle many patterns
          if (! patterns.some(pattern => replaceDataPlaceholder("#"+key+"#", params).includes(pattern))) {  // If at least one pattern is matched
            match_pattern = false;
            break ;
          };
        };
      };
      if (match_pattern) {  // If the patterns are matched
        $("#page_" + page.name.replaceAll(' ', '_').replaceAll("$", '').replaceAll("/", '')).show(); // Show the page
        return ;
      } else {
        $("#page_" + page.name.replaceAll(' ', '_').replaceAll("$", '').replaceAll("/", '')).hide();
        if (this.current_page == page.name) { // If the selected page is the hidden one
          return this.select_page($("#graph_selection ul li").first().text()); // Select first available page by default
        };
      };

    });
    for (let graph of this.graphs) {
      graph.add_data_to_graph(params);
    }
  }
}

/* Apply a downloaded configuration file */
View.prototype.FooterGraph.prototype.apply_config = function () {
  let self = this;
  this.config.forEach(element => {
    let link = $("<a>").attr("href", "#").attr("title", "Graph page: " + element.name).text(element.name).click(function () {
      self.select_page(element.name);
      return;
    });
    $("#graph_selection ul").append($("<li>").attr("id", "page_" + element.name.replaceAll(' ', '_').replaceAll("$", '').replaceAll("/", '')).append(link));
    view.apply_tooltip(link);
  });
  // Select first available page by default
  this.select_page($("#graph_selection ul li").first().text());
}

/* Select a specifc graph page */
View.prototype.FooterGraph.prototype.select_page = function (page) {
  $("#graph_selection ul li").removeClass("active");
  $("#page_" + page.replaceAll(' ', '_').replaceAll("$", '').replaceAll("/", '')).addClass("active");
  $(this).parent().addClass("active");
  this.current_page = page;
  this.clear();
  this.create_graphs();
  this.apply_data();
}

/* Clear the footer graph area */
View.prototype.FooterGraph.prototype.clear = function (page) {
  $("#graphs").empty();
}

// Function to get mouse event from one graph and trigger hover over the same x over all curves in other divs
View.prototype.FooterGraph.prototype.couple_hover = function (ed, id) {
  couple_hover(ed, id, this.graphs)
}

// Function to hide hover text when mouse leaves plot (i.e., when it is over 'body')
View.prototype.FooterGraph.prototype.hide_hover = function (ed) {
  hide_hover(this.graphs)
}

/* Create graphs for current page */
View.prototype.FooterGraph.prototype.create_graphs = function () {
  this.graphs = [];
  // Creating divs for the graphs
  let graphs_data = this.config.find(o => { return o.name === this.current_page }).graphs;
  let element_width = Math.floor(12 / graphs_data.length);
  for (let graph_data of graphs_data) {
    let id = "graph_" + graph_data.name.replaceAll(' ', '_');
    let graph_div = $("<div>").attr("id", id).addClass("footer_graph").addClass("col-" + element_width);
    graph_data.div = graph_div;
    $("#graphs").append(graph_div);
    this.graphs.push(new PlotlyGraph(graph_data));
    this.graphs.at(-1).plot();
    // Synchronizing zoom between different graphs
    graph_div[0].on("plotly_relayout", (ed) => { this.relayout(ed); });
    // Creating hover event listener to couple hover information across divs
    graph_div[0].on("plotly_hover", (ed) => { this.couple_hover(ed, id); });
    // Creating mouse leave event listener to hide hover over all graphs
    graph_div.find(".nsewdrag").on("mouseleave", (ed) => { this.hide_hover(ed); });
  }
  resize();
}

/* Initialize the footer graph interface */
function init_footer_graphs() {
  if ((!view.empty) && (!view.footer_graph) && (view.footer_graph_config)) {
    view.footer_graph = new view.FooterGraph(view.footer_graph_config);
  }
}
