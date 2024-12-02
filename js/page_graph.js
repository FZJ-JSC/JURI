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

/* The Graph class represents a page with multiple graphs and holds the graph configurations */
View.prototype.Graph = function (config_file) {
  // Config file to be read by View.download_config()
  this.config_file = config_file;
  // Config information read from this.config_file
  this.config = "";
  this.graphs = [];
  this.data = {};
  this.selected_parameter = null;
  // $("#main_content").empty();
  View.prototype.download_config.call(this).done(() => {
    this.create_graphs()
  });
}

// Function to apply x-range relayout to all the elements to sync graphes
View.prototype.Graph.prototype.relayout = function (ed) {
  sync_relayout(ed, this.graphs);
}

// Function to get mouse event from one graph and trigger hover over the same x over all curves in other divs
View.prototype.Graph.prototype.couple_hover = function (ed, id) {
  couple_hover(ed, id, this.graphs)
}

// Function to hide hover text when mouse leaves plot (i.e., when it is over 'body')
View.prototype.Graph.prototype.hide_hover = function (ed) {
  hide_hover(this.graphs)
}

/* Create graphs for current page */
View.prototype.Graph.prototype.create_graphs = function () {
  this.graphs = [];
  // Creating divs for the graphs
  // let graphs_data = this.config.graphs;
  let graphs_data = this.config.graphs;
  // Calculating width of the element considering the number of columns
  let element_width = Math.floor(12 / this.config.columns);
  let rows = Math.ceil(graphs_data.length / this.config.columns)
  // Adding divs for each row
  for (var i = 0; i < rows; i++) {
    let row_div = $("<div>").attr("id", "graph_row_"+i).addClass("graph_row").addClass("row").addClass("d-none").addClass("d-sm-flex");
    $("#main_content").append(row_div);
  }
  for (var i = 0; i < graphs_data.length; i++) {
    let graph_data = graphs_data[i];
    let id = "graph_" + graph_data.name.replaceAll(' ', '_');
    let graph_div = $("<div>").attr("id", id).addClass("system_graph").addClass("col-" + element_width);
    let row = Math.floor(i / this.config.columns)
    graph_data.div = graph_div;
    $("#graph_row_" + row).append(graph_div);
    this.graphs.push(new PlotlyGraph(graph_data));
    // Creating plots and turning on synchronization
    this.graphs.at(-1).plot();
    // Synchronizing zoom between different graphs
    graph_div[0].on("plotly_relayout", (ed) => { this.relayout(ed); });
    // Creating hover event listener to couple hover information across divs
    graph_div[0].on('plotly_hover', (ed) => { this.couple_hover(ed, id); });
    // Creating mouse leave event listener to hide hover over all graphs
    graph_div.find(".nsewdrag").on("mouseleave", (ed) => { this.hide_hover(ed); });
    // Adding data
    this.graphs.at(-1).add_data_to_graph();
  }
  resize();
}

/* Update graphs on current page */
View.prototype.Graph.prototype.update_graphs = function () {
  // Looping over the graphs
  let graphs_data = this.config.graphs;
  for (var i = 0; i < graphs_data.length; i++) {
    // Updating data
    this.graphs.at(i).add_data_to_graph();
  }
  resize();
}

/* Initialize the footer graph interface */
function init_graphs_page() {
  $("#footer_graphs").hide();
  if (view.graph_page_config) {
    if (!view.graph) {
      view.graph = new view.Graph(view.graph_page_config);
    } else {
      view.graph.update_graphs();
    }
  }
}



