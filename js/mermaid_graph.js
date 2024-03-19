/* 
* Copyright (c) 2023 Forschungszentrum Juelich GmbH.
* This file is part of JURI. 
*
* This is an open source software distributed under the GPLv3 license. More information see the LICENSE file at the top level.
*
* Contributions must follow the Contributor License Agreement. More information see the CONTRIBUTING.md file at the top level.
*
* Contributors:
*    Filipe Guimarães (Forschungszentrum Juelich GmbH)   
*/

/* The MermaidGraph class represents a single mermaid graph and takes care of its rendering. */
function MermaidGraph(graph_data) {
  this.id = "graph_" + graph_data.name.replaceAll(' ', '_');
  this.data = {};
  this.graph_data = graph_data;
  this.filepath = "";
  this.timeout = null;
  this.controller = new AbortController();
  this.signal = this.controller.signal;
  this.sliderpos = null;
  this.panZoom = null;
}

/* This function is a wrapper to add a timeout (and canceling previous calls) when reading the csv files */
MermaidGraph.prototype.add_data_to_graph = function (params) {
  let self = this;
  // Cleaning up data, to replot with new values when clicking again (e.g., in auto-refresh)
  self.data = {}
  clearTimeout(this.timeout);
  this.timeout = setTimeout(function(){self.key_add_data_to_graph(params);},300);
}


/* Apply a data selection to the given graph to select a data file to be downloaded */
MermaidGraph.prototype.key_add_data_to_graph = function (params) {
  let self = this;
  let deferrer = Array();
  self.controller.abort();
  // Footer plots
  footer_plot: if (self.graph_data.datapath) {
    self.filepath = replaceDataPlaceholder(self.graph_data.datapath, params);
    if (self.filepath in self.data) break footer_plot // If file was already read, skip it (to avoid having data multiple times)
    self.data[self.filepath] = Array()
    /* Download the graph data to be plotted */
    deferrer.push($.get(self.filepath, (data) => { // TODO replace by jquery download and manual CSV parsing to avoid d3 function
      self.data[self.filepath].push(data);
    }, "text"));
  }
  $.when.apply($, deferrer).then(function () {
    self.plot(params);
  }).fail(function () {
    console.error("Something wrong when plotting!");
  });
}

/* Add mermaid graph to the div element */
MermaidGraph.prototype.plot = function (params) {
  let self = this;
  let height = $("#graph_depgraph").height();
  let width = $("#graph_depgraph").width()
  mermaid.initialize({ startOnLoad: false, flowchart: { useMaxWidth: false } });
  // Creating <pre class="mermaid"> element with graph description
  depgraph = $("<pre>").addClass("mermaid")
                       .text(self.data[self.filepath]);
  // depgraph.height(100)
  // Adding to the graph div
  $(`#${self.id}`).html(depgraph);
  mermaid.run().then(function () {
    self.panZoom = svgPanZoom(".mermaid > svg",{
      zoomEnabled: true,
      controlIconsEnabled: true,
      fit: true,
      center: true
    })
    self.resize(height,width);
  })
}

/* Resize the graph to stick to the borders of the outer container */
MermaidGraph.prototype.resize = function (height,width) {
  let self = this;
  $(".mermaid > svg").height(height);
  $(".mermaid > svg").width(width);
  self.panZoom.resize();
  self.panZoom.fit();
  self.panZoom.center();
}
