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

/* The PlotlyGraph class represents a single graph and takes care of its rendering. */
function PlotlyGraph(graph_data) {
  this.id = "graph_" + graph_data.name.replaceAll(' ', '_');
  this.data = {};
  this.graph_data = graph_data;
  this.filepath = "";
  this.timeout = null;
  this.controller = new AbortController();
  this.signal = this.controller.signal;
  this.sliderpos = null;
  /* Default values */
  this.GRIDLINES = 4;
  this.layout = {
    modebar: {
      bgcolor: 'rgba(0,0,0,0)',
      color: '#C7C7C7',
      activecolor: '#7C7C7C',
    },
    margin: {
      l: 50,
      r: 40,
      t: this.graph_data.datapath ? 0 : 30, // If self.graph_data.datapath is present, it is a footer plot: use 0 margin. For a graph page, use margin 30
      b: 30
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: '#FFFFFF',
    xaxis: {
      zeroline: true,
      showline: true,
      mirror: 'ticks',
      rangemode: 'nonnegative',
      automargin: true,
      spikesnap: 'data',
      // autorange: true,
    },
    yaxis: {
      zeroline: true,
      showline: true,
      titlefont: {
        family: 'sans-serif',
        size: 12
      },
      fixedrange: false,
      mirror: 'ticks',
      rangemode: 'nonnegative',
      automargin: true,
      autorange: true,
      // dtick: 1.0,
      // nticks: 4,
      tickmode: "auto",
    },
    yaxis2: {
      overlaying: 'y',
      side: 'right',
      zeroline: true,
      showline: true,
      mirror: 'ticks',
      titlefont: {
        family: 'sans-serif',
        size: 12
      },
      rangemode: 'nonnegative',
      automargin: true,
      dtick: 1.0,
      nticks: 4,
      tickmode: "auto",
    },
    hovermode: "x unified",
    showlegend: true,
    legend: {
      font: {
        family: 'sans-serif',
        size: 10,
        color: '#000'
      },
      x: 0.5,
      xanchor: 'center',
      y: 1,
      orientation: "h",
      yanchor: 'top',
      bgcolor: '#FFFFFFAA',
      bordercolor: '#000000AA',
      borderwidth: 1
    }
  };
  download_data_button = {'name': 'Download data', 
  'icon': { 'width': 500, 
        'height': 500, 
        'path': 'M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z', 
      }, 
  'attr': 'download', 
  'click': function(gd) {
      // Collecting data from all traces
      let data = {};
      for (let trace of gd.data) {
        if (trace.x) {
          data[trace.name] = {"x": trace.x, "y": trace.y};
        }
      }
      // If data is empty, returns error to console
      if (Object.keys(data).length === 0) {
        console.error("No data on graph!");
        return;
      }
      // Creating "virtual" (hidden) element to be able to download the data as an encoded text
      var element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data)));
      element.setAttribute('download', `${gd.id}.json`);
      // Setting the element as invisible and adding to body
      element.style.display = 'none';
      document.body.appendChild(element);
      // Clicking on virtual link to download the data
      element.click();
      // Removing "virtual" element
      document.body.removeChild(element);
    }
  }
  // Default config for Plotly graphs
  this.config = {
    responsive: true,
    displaylogo: false,
    modeBarButtons: [["zoom2d", "pan2d", "zoomIn2d", "zoomOut2d", "resetScale2d", download_data_button]]
  };
}

/* This function is a wrapper to add a timeout (and canceling previous calls) when reading the csv files */
PlotlyGraph.prototype.add_data_to_graph = function (params) {
  let self = this;
  // Cleaning up data, to replot with new values when clicking again (e.g., in auto-refresh)
  self.data = {}
  clearTimeout(this.timeout);
  this.timeout = setTimeout(function(){self.key_add_data_to_graph(params);},300);
}


/* Apply a data selection to the given graph to select a data file to be downloaded */
PlotlyGraph.prototype.key_add_data_to_graph = function (params) {
  let self = this;
  let deferrer = Array();
  self.controller.abort();
  // Footer plots
  footer_plot: if (self.graph_data.datapath) {
    self.filepath = replaceDataPlaceholder(self.graph_data.datapath, params);
    if (self.filepath in self.data) break footer_plot // If file was already read, skip it (to avoid having data multiple times)
    self.data[self.filepath] = Array()
    /* Download the graph data to be plotted */
    deferrer.push(d3.csv(self.filepath, self.signal, (data) => { // TODO replace by jquery download and manual CSV parsing to avoid d3 function
      self.data[self.filepath].push(data);
    }));
  }
  // Graph-page plots (if there's a self.graph_data.traces.datapath)
  for (let trace of self.graph_data.traces) {
    if (trace.datapath) {
      trace.datapath = replaceDataPlaceholder(trace.datapath, params);
      if (trace.datapath in self.data) continue // If file was already read, skip it (to avoid having data multiple times)
      self.data[trace.datapath] = Array()
      deferrer.push(d3.csv(trace.datapath, self.signal , (data) => { // TODO replace by jquery download and manual CSV parsing to avoid d3 function
        self.data[trace.datapath].push(data);
      }).catch(()=>{return;}));  // Catching error to allow plot to continue even if one file is not found
    }
  }
  $.when.apply($, deferrer).then(function () {
    self.plot(params);
  }).fail(function () {
    console.error("Something wrong when plotting!");
  });
}

Math.sum = (...a) => Array.prototype.reduce.call(a, (a, b) => a + b)
Math.avg = (...a) => Math.sum(...a) / a.length;
Math.last = (...a) => a.at(-1);

/* This function checks if "show_pattern" is given inside argument 'object'. If it is not
given, it returns true. If it is given, it returns true when the give pattern matches
the comparison with #key# given by replaceDataPlaceholder (that obtains values from the table) */
function checkPattern(object,params) {
  let match_pattern = true;
  if (object.show_pattern) {
    for (const [key, values] of Object.entries(object.show_pattern)) {  // Looping over the patterns
      let patterns = Array.isArray(values) ? values : [values] // Transforming to array if necessary, to handle many patterns
      if (! params) { // If params is not defined, then no line was selected, and the pattern should not be shown
        match_pattern = false;
        break;
      }
      if (! Object.keys(params).includes(key)) continue // If params is defined, but does not include given key, ignore this rule (to be able to use in different types of tables)
      if (! patterns.some(pattern => {let regex = new RegExp(pattern); return regex.test(replaceDataPlaceholder("#"+key+"#", params))})) {  // If at least one pattern is matched
        // if (! patterns.some(pattern => replaceDataPlaceholder("#"+key+"#", params).includes(pattern))) {  // If at least one pattern is matched
        match_pattern = false;
        break ;
      };
    };
  }
  return match_pattern
}

/* (Re-)draw the graph */
PlotlyGraph.prototype.plot = function (params) {
  let self = this;
  if(self.graph_data.height) {
    $(`#${self.id}`).height(self.graph_data.height)
  }
  // Merging default layout with config one
  if (self.graph_data.layout) {
    layout = mergeDeep(self.layout, self.graph_data.layout)
  } else {
    layout = self.layout
  }

  let traces = [];
  let xmin;
  let xmax;
  // ymin and ymax must be a hash as there may be two y axis
  let ymin = {};
  let ymax = {};
  if (self.graph_data.traces) {
    /* Check if there are annotations to be filled (keywords between #) */
    let matches = {}
    let new_annotation = {}
    if (layout.annotations) {

      layout.annotations = layout.annotations.filter(annotation => checkPattern(annotation,params));

      layout.annotations.forEach((annotation, i) => {
        matches[i] = annotation.text.match(/#(.*?)#/g)
        if (matches[i]) {
          matches[i] = matches[i].map((match) => { return match.slice(1, -1); });
        }
        new_annotation[i] = ""
      });
    }
    if (layout.shapes) {
      layout.shapes = layout.shapes.filter(annotation => checkPattern(annotation,params));
    }

    for (let trace_data of self.graph_data.traces) {
      /* Getting path from given trace or from whole graph */
      filepath = trace_data.datapath ? trace_data.datapath : self.filepath;
      let trace = {};
      let data = self.data[filepath];

      trace.name = trace_data.name;
      trace.type = trace_data.type ?? "scatter";
      trace.yaxis = trace_data.yaxis ?? "y";

      // Filtering the data when both filter and data are present
      if (trace_data.where && data) {
        data = data.filter((item) => {
            return Object.keys(trace_data.where).every(key => item[key] === trace_data.where[key]);
        })
      }

      // If there are still data to be plotted
      if (data) {
        // Calculating factor if present, otherwise set to 1
        let factor = typeof (trace_data.factor) == "string" ? eval(trace_data.factor) : 1;

        // Trace options for heatmap must be done separately, as the data is expected to be differently
        // and some options are not required
        if (trace.type == 'heatmap') {                           // HEATMAP
          trace.colorscale = trace_data.colorscale ?? undefined;
          trace.reversescale = trace_data.reversescale ?? false;

          // Getting x values and testing if it is 'date' or not (in which case, it's considered Int)
          if (trace_data.xcol == 'date'){
            trace.x = data.map(function (x)  { return new Date(Date.parse(x[trace_data.xcol])) });
          } else {
            trace.x = data.map(function (x)  { return parseInt(x[trace_data.xcol]) }); 
            layout.xaxis.tickmode =  "array";
            layout.xaxis.tickvals =  Array.from(new Set(trace.x)).sort(function(a, b) { return parseInt(a) - parseInt(b); });
          }
          // Removing duplicates and sorting
          trace.x = Object.values(
            trace.x.reduce((a, c) => (a[c.toString()] = c, a), {})
          ).sort(function(a, b) { return a - b; });
          // Getting values of y as Integers, removing duplicates (with a Set), transforming back to array and sorting as integers
          trace.y = Array.from(new Set(data.map(function (y) { return y[trace_data.ycol] }))).sort(function(a, b) { return parseInt(a) - parseInt(b); });
          
          // Create empty array with sizes length[ length[...]=length_x ]=length_y
          trace.z = new Array(trace.y.length);
          for (var i = 0; i < trace.y.length; i++) {
            trace.z[i] = new Array(trace.x.length);
            for (var j = 0; j < trace.x.length; j++) {
              trace.z[i][j] = trace_data.fill ?? null;
            }
          }
          // looping over values in data and filling array of z component (i.e., values that are represented by colors)
          for (let d = 0; d < data.length; d++) {
            let line = data[d];
            let xval = trace_data.xcol == 'date' ? new Date(Date.parse(line[trace_data.xcol])) : parseInt(line[trace_data.xcol])
            let j = trace.x.map(Number).indexOf(+xval)
            let i = trace.y.indexOf(line[trace_data.ycol])
            trace.z[i][j] = line[trace_data.zcol];
          }
          // Fixing layout for heatmaps
          delete layout.yaxis.range;
          layout.yaxis.tickmode =  "array";
          layout.yaxis.tickvals =  trace.y;
        } else if (trace.type == 'bar') {              // BARPLOT

          // Getting x values
          if ( trace_data.xcol != 'date' && (self.graph_data.xcol && self.graph_data.xcol != 'date') ) {
            trace.x = data.map(function (x)  { return parseFloat(x[trace_data.xcol??self.graph_data.xcol]) });
          } else {
            trace.x = data.map(function (x)  { return new Date(Date.parse(x['date'])) });
          }

          // Parsing values and min/max when present
          values = data.map(function (y) {
            let val = y[trace_data.ycol].split(";");
            if (val.length == 3) {
              return { min: +val[0] * factor, y: +val[1] * factor, max: +val[2] * factor };
            } else {
              return { min: null, y: isNaN(+val[0])? val[0] : +val[0] * factor, max: null };
            }
          })
          trace.y = values.map(function (y) { return y.y });
          self.minmax = (typeof values[0].min === 'number') ? true : false; // if first value of min is a number, all the others (and also max values) should be
          if (self.minmax) {
            trace.min = values.map(function (y) { return y.min });
            trace.max = values.map(function (y) { return y.max });  
          }
          if (self.minmax) {
            var plus = trace.y.map((v, i) => trace.max[i] - v)
            var minus = trace.y.map((v, i) => v - trace.min[i])
            trace.error_y = {
              type: 'data',
              symmetric: false,
              array: plus,
              arrayminus: minus,
              thickness: 1,
            }
          }
          trace.base = data.map(function (d)  { return parseFloat(d[trace_data.basecol]) });
          trace.orientation = trace_data.orientation ?? 'v';
          trace.marker = trace_data.marker ?? {};
          // Defining colors for different groups
          if (trace_data.colorby) {
            let groups = data.map(function (d)  { return d[trace_data.colorby] });
            trace.marker.color = trace.x.map(function (v,i) {
              return trace_data.color[groups[i]%trace_data.color.length]
            });  
          }

          // Creating hovertemplate if given on config
          if (trace_data.onhover) {
            // Geting data in the correct format in customcustom data
            // [ [first_item_info_1,first_item_info_2,first_item_info_3], [second_item_info_1,second_item_info_2,second_item_info_3], ...]
            trace.customdata = data.map(function (d)  {
              return Object.keys(trace_data.onhover).map((k) => { return trace_data.onhover[k]['factor'] ? parseFloat(d[k])*trace_data.onhover[k]['factor'] : d[k] })
            })
            // Preparing the hover template
            i = 0
            for (const [key, value] of Object.entries(trace_data.onhover)) {
              // Add information on new line, when there's already some info there
              trace.hovertemplate = trace.hovertemplate ? trace.hovertemplate + "<br>" : '';
              trace.hovertemplate += `${value['name']}: %{customdata[${i}]${value['format']??''}}${value['units']??''}` ;
              i++
            }
          }

          // Updating layout for bar plots hover mode and hiding spikes
          layout.hovermode = 'closest'
          delete layout.xaxis.rangemode;
          delete layout.xaxis.spikesnap;
          layout.xaxis.showspikes =  false;
          layout.yaxis.showspikes =  false;
          // Adding autorange for vertical bars, as fixed range from min to max 
          // cuts the first and last bar/bar group
          if (trace.orientation == 'v') {
            layout.xaxis.autorange = true;
          }
        } else {                                    // SCATTER PLOT 
          // If it's not a heatmap not a bar, we consider it is a scatter plot
          trace.line = mergeDeep({ width: 1, shape: 'hvh', color: trace_data.color ?? 'black' },trace_data.line??{});
          trace.mode = trace_data.mode ?? 'lines';
          trace.showlegend = trace_data.showlegend ?? true;
          trace.legendgroup = trace_data.legendgroup ?? trace_data.name;

          // Getting x values
          if ( self.graph_data.xcol && self.graph_data.xcol != 'date' ) {
            trace.x = data.map(function (x)  { return parseFloat(x[self.graph_data.xcol]) });
          } else {
            trace.x = data.map(function (x)  { return new Date(Date.parse(x['date'])) });
          }
          // Parsing values and min/max when present
          values = data.map(function (y) {
            let val = y[trace_data.ycol].split(";");
            if (val.length == 3) {
              return { min: +val[0] * factor, y: +val[1] * factor, max: +val[2] * factor };
            } else {
              return { min: null, y: +val[0] * factor, max: null };
            }
          })
          trace.y = values.map(function (y) { return y.y });
          self.minmax = (values.length > 0 && typeof values[0].min === 'number') ? true : false; // if first value of min is a number, all the others (and also max values) should be
          if (self.minmax) {
            trace.min = values.map(function (y) { return y.min });
            trace.max = values.map(function (y) { return y.max });  
          }
          trace.stackgroup = trace_data.stackgroup ? trace_data.stackgroup : null

          // Configuring marker
          trace.marker = trace_data.marker ?? {
            size: 5,
            color: trace_data.color ?? trace.y,
            colorscale: 'Jet',
          };
  
          let minmax = {};
          // If min/max is present and nodes>1, change hover info and prepare information for background curves
          // Show min/max also when nnodes is undefined (e.g., in Project view)
          let nnodes = params ? params['#Nodes'] : undefined
          if ((self.minmax == true) && (((nnodes === undefined) || (nnodes > 1)) || (self.graph_data.xcol != 'date')) ) {
            trace.hovertemplate = [];
            for (let i = 0; i < trace.x.length; i++) {
              trace.hovertemplate.push(trace.min[i].toFixed(2) + ' / <b>' + trace.y[i].toFixed(2) + '</b> / ' + trace.max[i].toFixed(2));
            }
            minmax[trace_data.ycol] = { name: trace.name, min: trace.min, max: trace.max, yaxis: trace.yaxis, color: trace.line.color, factor: data.factor };
          } else {
            trace.hovertemplate = '<b>%{y}</b>';
          }

          // Creating hovertemplate if given on config
          if (trace_data.onhover) {
            // Geting data in the correct format in customcustom data
            // [ [first_item_info_1,first_item_info_2,first_item_info_3], [second_item_info_1,second_item_info_2,second_item_info_3], ...]
            trace.customdata = data.map(function (d)  {
              return Object.keys(trace_data.onhover).map((k) => { return trace_data.onhover[k]['factor'] ? parseFloat(d[k])*trace_data.onhover[k]['factor'] : d[k] })
            })
            // Preparing the hover template
            i = 0
            for (const [key, value] of Object.entries(trace_data.onhover)) {
              // Add information on new line, when there's already some info there
              trace.hovertemplate = trace.hovertemplate ? trace.hovertemplate + "<br>" : '';
              trace.hovertemplate += `${value['name']}: %{customdata[${i}]${value['format']??''}}${value['units']??''}` ;
              i++
            }
          }

          // If a map is given for the values:
          if (trace_data.map) {
            trace.text = trace.y.map(function (value) { return trace_data.map[value] });
            trace.hovertemplate = '<b>%{y} (%{text})</b>';
          }

          // Adding traces for min/max filled area when values are present
          for (const [key, value] of Object.entries(minmax)) {
            // for (let i = 0; i < minmax.length; i++) {
            traces.unshift({
              x: trace.x, // x-values for min/max should be the same as the avg
              y: value.min,
              line: { width: 1, shape: 'hvh', color: value.color + "44" },
              name: "Min " + value.name,
              legendgroup: value.name,
              yaxis: value.yaxis,
              hoverinfo: 'skip',
              // fillcolor: 'white',
              mode: 'lines',
              fill: 'tonexty',
              showlegend: false,
            })
            traces.unshift({
              x: trace.x, // x-values for min/max should be the same as the avg
              y: value.max,
              line: { width: 1, shape: 'hvh', color: value.color + "44" },
              name: "Max " + value.name,
              legendgroup: value.name,
              yaxis: value.yaxis,
              hoverinfo: 'skip',
              fillcolor: value.color + "44",
              mode: 'lines',
              showlegend: false
            })
          }
        } // End of scatter plots configurations

        // Looping through different annotations that contain substitution keywords
        Object.keys(matches).forEach((key) => {
          new_annotation[key] = new_annotation[key] + layout.annotations[key].text
          // Looping through keywords and substituting each
          if (matches[key]) {
            matches[key].forEach((match) => {
              new_annotation[key] = new_annotation[key].replace("#"+match+"#", Math[match](...trace.y).toFixed(1))
            });
            // Adding annotation for this trace and going to the next line for possible values of other traces
            new_annotation[key] = new_annotation[key] + "<br>"
          }
        });
      
        // Getting x range to fix range below
        if (trace.x[0] instanceof Date) {
          xmin = new Date(Math.min(xmin ?? new Date("2101/01/01"),...trace.x))
          xmax = new Date(Math.max(xmax ?? new Date("2001/01/01"),...trace.x))
        } else {
          xmin = Math.min(xmin ?? Infinity,...trace.base??trace.x)
          xmax = Math.max(xmax ?? -Infinity,...trace.base?trace.base.map((a, i) => a + trace.x[i]):trace.x)
        }
        // Getting min and max values of y for each y axis to adjust ranges below
        ymin[trace.yaxis] = Math.min(ymin[trace.yaxis] ? ymin[trace.yaxis] : 0, ...(self.minmax ? trace.min : trace.y));
        ymax[trace.yaxis] = Math.max(ymax[trace.yaxis] ? ymax[trace.yaxis] : 0, ...(self.minmax ? trace.max : trace.y));
      }
      traces.push(trace);
    }
    /* Substituting new annotations */
    Object.keys(matches).forEach((key) => {
      if (matches[key]) {
        layout.annotations[key].text = new_annotation[key]
      }
    });
  }

  // Fixing xaxis, that has white spaces on the edges when using markers
  if (!layout.xaxis.autorange && xmin && xmax) {
    range = (layout.xaxis.type=="log") ? [Math.log10(xmin),Math.log10(xmax)] : [xmin,xmax]
    layout.xaxis.range = layout.xaxis.range ?? range
    if (layout.xaxis.rangeslider) {
      layout.xaxis.rangeslider.range = range
    }  
  }

  // checking if yaxis2 is used
  let yaxis2 = false;
  traces.forEach( (trace) => {
    if (trace.yaxis == "y2") {
      yaxis2 = true;
    }
  })
  if (yaxis2) {
    //--------------------------------------------------------------------------
    // Coupling the grids for both yaxis (left and right)
    // Adapted from: https://github.com/VictorBezak/Plotly_Multi-Axes_Gridlines/blob/master/multiAxis.js
    // This works only for nonnegative y-axis
    delete layout.yaxis.tickmode;
    delete layout.yaxis2.tickmode;
    layout.yaxis.autorange = false;
    layout.yaxis2.autorange = false;

    let ydtick = {};
    let ydtick_ratio = {};
    Object.keys(ymax).forEach((key) => {
      // for (const [key, value] of Object.entries(ymax)) {
      ymax[key] = ymax[key] * 1000000;  // mult by 1000 to account for ranges < 1
      let y1_len = Math.floor(ymax[key]).toString().length;
      let y1_pow10_divisor = Math.pow(10, y1_len - 1);
      let y1_firstdigit = Math.floor(ymax[key] / y1_pow10_divisor);
      let y1_max_base = y1_pow10_divisor * y1_firstdigit / 1000000;  // div by 1000 to account for ranges < 1

      ydtick[key] = y1_max_base / self.GRIDLINES;

      ymax[key] = ymax[key] / 1000000;  // range reset
      ydtick_ratio[key] = ymax[key] / ydtick[key];
    })
    // Increase the ratio by 0.1 so that your range maximums are extended just
    // far enough to not cut off any part of your highest value
    // console.log('dtickratio', ydtick_ratio, Object.values(ydtick_ratio))
    global_dtick_ratio = Math.max(...Object.values(ydtick_ratio))+0.1

    // Taking into account that graphs may have either no points or only values at 0, 
    // such that ydtick = 0, and ydtick_ratio and global_dtick_ratio = NaN
    if (ydtick["y"] == 0) {
      layout.yaxis.showgrid = false
    } else {
      layout.yaxis.range = [0, (global_dtick_ratio ? global_dtick_ratio : (ydtick_ratio["y"] + 0.1)) * ydtick["y"]]
      layout.yaxis.dtick = ydtick["y"]
    }
    if (ydtick["y2"] == 0) {
      layout.yaxis2.showgrid = false
    } else {
      layout.yaxis2.range = [0, (global_dtick_ratio ? global_dtick_ratio : (ydtick_ratio["y"] + 0.1)) * ydtick["y2"]]
      layout.yaxis2.dtick = ydtick["y2"]
    }
    //--------------------------------------------------------------------------
  } else {
    // Remove secondary axis
    delete layout.yaxis2;
  }

  // Creating the plot
  if (params) layout.datarevision = params.JobID
  Plotly.react(self.id, traces, layout, self.config);

  // Moving the rangeslider when that is the case
  if (layout.xaxis.rangeslider?.translate) {
    self.move_slider(self.id, layout.xaxis.rangeslider.translate)
  }
}

/* Move slider according to given translation */
PlotlyGraph.prototype.move_slider = function (id,translation) {
  let self = this;
  let slider = $(".rangeslider-container", `#${id}`)
  if (! self.sliderpos) {
    let regex = /\(([^)]+)\)/
    let translate = regex.exec(translation)[1].split(",");
    let position = regex.exec(slider.attr("transform"))[1].split(",");
    let new_position = []
    for (var i = 0; i < translate.length; i++) {
      new_position.push(translate[i].charAt(0) == "@" ? parseInt(translate[i].slice(1)) : parseInt(translate[i]) + parseInt(position[i]))
    }
    self.sliderpos = new_position
  }
  slider.attr("transform", `translate(${self.sliderpos[0]},${self.sliderpos[1]})`)
}

/* Resize the graph to stick to the borders of the outer container */
PlotlyGraph.prototype.resize = function () {
  let self = this;
  Plotly.Plots.resize(self.id);
}


/**
* Performs a deep merge of objects and returns new object. Does not modify
* objects (immutable) and merges arrays via concatenation.
*
* @param {...object} objects - Objects to merge
* @returns {object} New object with merged key/values
*/
function mergeDeep(...objects) {
  const isObject = obj => obj && typeof obj === 'object';

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal);
      }
      else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      }
      else {
        prev[key] = JSON.parse(JSON.stringify(oVal)) ;
      }
    });

    return prev;
  }, {});
}


function sync_relayout(ed,graphs) {
  if (Object.entries(ed).length == 0) { return; }

  graphs.forEach( (graph) => {
    let div = $("#" + graph.id)[0];
    let x = div.layout.xaxis;
    let update = {};
    if ("xaxis.autorange" in ed && ed["xaxis.autorange"] != x.autorange) {
      update['xaxis.autorange'] = ed["xaxis.autorange"];
    }
    if ("xaxis.autorange" in ed && "rangeslider" in x) {
      update['layout.xaxis.rangeslider.autorange'] = ed["xaxis.autorange"];
    }
    if ("xaxis.range[0]" in ed && ed["xaxis.range[0]"] != x.range[0]) {
      update['xaxis.range[0]'] = ed["xaxis.range[0]"];
    }
    if ("xaxis.range[1]" in ed && ed["xaxis.range[1]"] != x.range[1]) {
      update['xaxis.range[1]'] = ed["xaxis.range[1]"];
    }
    if ("xaxis.range" in ed && ed["xaxis.range"] != x.range) {
      update['xaxis.range'] = ed["xaxis.range"];
    }
    /* Use ".update" instead of ".relayout" to avoid triggering the function again */
    Plotly.update(div, {}, update);

    // Moving the rangeslider when that is the case
    if (x.rangeslider?.translate) {
      graph.move_slider(graph.id, x.rangeslider.translate)
    }
  });
}

// Function to get mouse event from one graph and trigger hover over the same x over all curves in other divs
function couple_hover(ed, id, graphs) {
  // Getting x-value from mouse hover event data
  let xval = ed.xvals[0];
  // Looping over all divs different than given id
  graphs.filter(graph => graph.id != id).forEach((graph) => {
    // Triggering the hover event
    Plotly.Fx.hover(graph.id, { xval: xval });
  });
}

function hide_hover(graphs) {
  // Looping over all divs with empty hover info
  graphs.forEach( (graph) => {
    Plotly.Fx.hover(graph.id, [{}]);
  });
}