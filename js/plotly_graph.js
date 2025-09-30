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
  this.sliderpos = null;
  this.empty = true; // Marks empty plots
  this.mousePressed = false; // Stores the state of the primary mouse button
  /* Default values */
  this.GRIDLINES = 4;
  this.layout = {
    modebar: {
      bgcolor: 'rgba(0,0,0,0)',
      color: '#C7C7C7',
      activecolor: '#7C7C7C',
      editable: false,
    },
    margin: {
      l: 50,
      r: 40,
      t: this.graph_data.datapath ? 5 : 30, // If self.graph_data.datapath is present, it is a footer plot: use margin 5. For a graph page, use margin 30
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
      title: {
        font: {
          size: 12,
        },
      },
      // autorange: true,
    },
    yaxis: {
      zeroline: true,
      showline: true,
      title: {
        font: {
          family: 'sans-serif',
          size: 12,
        },
      },
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
      zeroline: true,
      showline: true,
      mirror: 'ticks',
      title: {
        font: {
          family: 'sans-serif',
          size: 12,
        },
      },
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

  // Abort any pending $.get requests from a previous invocation.
  if (self._pendingRequests && self._pendingRequests.length) {
    self._pendingRequests.forEach((req) => req.abort());
  }
  // Reset the pending requests array for this call.
  self._pendingRequests = [];

  let deferrer = [];  // Array to hold all asynchronous CSV loading tasks (jqXHR objects)

  // Generate a unique call ID for this invocation.
  // This will be used to invalidate callbacks from previous calls.
  const callId = Date.now();
  self._currentCallId = callId;

  // Local variable to capture the main footer plot filepath.
  // This will be used later to update self.filepath for self.plot(params).
  let localFilepath = null;

  // Footer plots: Check if there's a data path for the main graph data.
  if (self.graph_data.datapath) {
    // Replace placeholders in the datapath with the provided parameters.
    localFilepath = replaceDataPlaceholder(self.graph_data.datapath, params);
    
    // If the file has already been read, skip downloading to avoid duplicate data.
    if (!(localFilepath in self.data)) {
      // Initialize an array to store CSV data for this file.
      let currentDataArray = [];
      self.data[localFilepath] = currentDataArray;
      
      // Download the graph data using jQuery's $.get.
      // The CSV text is then parsed using csvToArr.
      let jqxhr = $.get(localFilepath)
        .done(function (csvText) {
          // Only process if this call is still current.
          if (self._currentCallId !== callId) return;
          // Parse the CSV text into an array of objects.
          let parsed = csvToArr(csvText, ",");
          // Push each parsed row into the data array.
          parsed.forEach((row) => currentDataArray.push(row));
        })
        .fail(function () {
          // Allow plotting to continue even if one file is not found.
        });
      
      deferrer.push(jqxhr);
      self._pendingRequests.push(jqxhr);
    }
  }

  // Graph-page plots: Process each trace in self.graph_data.traces.
  for (let trace of self.graph_data.traces) {
    if (trace.datapath) {
      // Replace placeholders in the trace datapath with parameters.
      let localTracePath = replaceDataPlaceholder(trace.datapath, params);
      
      // If the file has already been read, skip to avoid duplicate data.
      if (localTracePath in self.data) continue;
      
      // Initialize an array to store CSV data for this trace.
      let currentTraceArray = [];
      self.data[localTracePath] = currentTraceArray;
      
      // Download the CSV data for this trace.
      let jqxhr = $.get(localTracePath)
        .done(function (csvText) {
          // Only process if this call is still current.
          if (self._currentCallId !== callId) return;
          // Parse the CSV text and push each row into the trace's data array.
          let parsed = csvToArr(csvText, ",");
          parsed.forEach((row) => currentTraceArray.push(row));
        })
        .fail(function () {
          // Catch error to allow plotting to continue even if one file is not found.
        });
      
      deferrer.push(jqxhr);
      self._pendingRequests.push(jqxhr);
    }
  }

  // When all asynchronous CSV download tasks complete,
  // update self.filepath and call the plot function.
  $.when.apply($, deferrer)
    .then(function () {
      // If this call is no longer current, do nothing.
      if (self._currentCallId !== callId) return;
      self.filepath = localFilepath;
      self.plot(params);
    })
    .fail(function (e) {
      // Only log the error if this call is still current.
      if (self._currentCallId !== callId) return;
      // Cleaning up plot, as it cannot be plotted
      self.plot();
      console.error("Something went wrong when plotting!", e);
    });
};

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
  // Getting div where plot is going to be added
  let graphDiv = $(`#${self.id}`);
  if(self.graph_data.height) {
    graphDiv.height(self.graph_data.height)
  }
  // Merging default layout with config one
  let layout;
  if (self.graph_data.layout) {
    layout = mergeDeep(self.layout, self.graph_data.layout)
  } else {
    layout = self.layout
  }

  let traces = [];
  let steps = [];
  let traces_slider_obj = {}; // Temporarily store traces for the slider with keys (will be transformed to array afterwards)
  let traces_slider; // Array containing traces for the slider
  let slider_steps = []; // Array containing the step values (necessary to store consistent steps for different traces on the same graph, in case they are filtered differently)
  let shapes = []; // Store the shapes (vertical lines) for the slider
  let numsteps;
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
      let trace_default = {
        name: trace_data.name,
        type: trace_data.type ?? "scatter",
        yaxis: trace_data.yaxis ?? "y",
        xaxis: trace_data.xaxis ?? "x",
      }
      let trace = { ...trace_default };
      let step = {};
      let data = self.data[filepath];

      // Filtering the data when both filter and data are present
      if (trace_data.where && data) {
        data = data.filter((item) => {
          return Object.keys(trace_data.where).every((key) => {
            const conditions = Array.isArray(trace_data.where[key]) 
              ? trace_data.where[key] 
              : [trace_data.where[key]]; // Ensure it's always an array

            // Check if item[key] satisfies ALL conditions
            return conditions.every((condition) => {
              if (condition.startsWith("<")) {
                return item[key] < parseFloat(condition.slice(1));
              } else if (condition.startsWith(">")) {
                return item[key] > parseFloat(condition.slice(1));
              } else {
                return item[key] == condition; // Comparison should use "==" as numbers may be given as strings
              }
            });
          });
        });
      }

      // If there are still data to be plotted
      if (data) {
        self.empty = false;
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
            let val = typeof y[trace_data.ycol] == 'string'? y[trace_data.ycol].split(";") : [ y[trace_data.ycol] ];
            if (val.length == 3) {
              return { min: +val[0] * factor, y: +val[1] * factor, max: +val[2] * factor };
            } else {
              return { min: null, y: isNaN(+val[0])? val[0] : +val[0] * factor, max: null };
            }
          })
          trace.y = values.map(function (y) { return y.y });
          
          if (typeof trace_data.width != 'undefined' ) {
            trace.width = data.map(function (d)  { return parseFloat(d[trace_data.width]) });
          }

          self.minmax = (typeof values[0]?.min === 'number') ? true : false; // if first value of min is a number, all the others (and also max values) should be
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
          if (trace_data.basecol) {
            trace.base = data.map(function (d)  { return parseFloat(d[trace_data.basecol]) });
          }
          trace.orientation = trace_data.orientation ?? 'v';
          trace.marker = trace_data.marker ?? {};
          // Defining colors for different groups
          if (trace_data.colorby) {
            let groups = data.map(function (d)  { return d[trace_data.colorby] });
            trace.marker.color = trace.x.map(function (v,i) {
              return trace_data.color[groups[i]%trace_data.color.length]
            });  
          } else if (trace_data.colorcol) {
            trace.marker.color = data.map(function (d)  { return d[trace_data.colorcol] });
            // Storing original colors in a separate array to be able to recover them when clicking
            trace.marker._originalColors = [...trace.marker.color]
            // Adding line around bars to be 0, to be able to change on hover later on
            trace.marker.line = {
              width: Array.from({length: trace.marker.color.length}, (v) => 0),
              color: 'black'
            };
          }

          // Creating hovertemplate if given on config
          if (trace_data.onhover) {
            self.prepare_hoverinfo(trace,trace_data,data);
          }
          
          // Updating layout for bar plots hover mode
          layout.hovermode = 'closest'
          if ((self.graph_data?.layout?.hovermode == 'left')||(self.graph_data?.layout?.hovermode == 'right')) {
            // In this case, the hover info is not shown, and 
            // a listener is to be added for the 'plotly_hover' event 
            // and there, the data is added to a div on the left or right.
            // This is done before plotting the graph below.
            trace.hoverinfo = 'none'
          }
          // Hiding spikes
          delete layout.xaxis.rangemode;
          delete layout.xaxis.spikesnap;
          layout.xaxis.showspikes =  false;
          layout.yaxis.showspikes =  false;
          // Adding autorange for vertical bars, as fixed range from min to max 
          // cuts the first and last bar/bar group
          if (trace.orientation == 'v') {
            layout.xaxis.autorange = true;
          }

          // Adding values for highlighted keys as custom entries in trace
          // to be used later for comparison
          if (Array.isArray(self.graph_data.highlight)) {
            for (const item of self.graph_data.highlight) {
              trace[item] = data.map(function (d)  { return d[item] });
            }
          }
        } else if (self.graph_data.slider) { // PLOT WITH A SLIDER

          // Grouping the information on data according to the values of the quantity defined in self.graph_data.slider
          // This will become a new object where each value of self.graph_data.slider gives an object to be put
          // as a step on the slider
          let step_counter = 0;
          let previous_step;
          // Check if slider values need to be obtained or use from previous traces
          let get_slider_values = slider_steps.length>0 ? false : true;
          const grouped_data = data.reduce((acc, obj) => {
            const step = obj[self.graph_data.slider];
            const jobid = obj['jobid'];
            if (get_slider_values) {
              // Counting the number of different steps
              if (step !== previous_step) {
                previous_step = step;
                step_counter++;
              }
              // Checking if step needs to be skipped
              if ((typeof self.graph_data.step === 'undefined')||(step_counter%parseInt(self.graph_data.step)!=1)) {
                return acc;
              }
              // Storing current step
              if (!slider_steps.includes(step)) {
                slider_steps.push(step)
              }
            } else {
              // If using previous values, check if the current step is in slider_steps array
              if (!slider_steps.includes(step)) {
                return acc
              }
            }

            // If 'ts' is not already in the accumulator, initialize it
            if (!acc[step]) {
              acc[step] = {};
            }

            // Push the item to the correct 'ts' and 'jobid' group
            acc[step][jobid] = obj;

            return acc;
          }, {});

          // Getting number of steps in the slider
          numsteps = slider_steps.length

          // Looping over the different values defined for the "slider"
          Object.keys(grouped_data)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .forEach((key,index,grouped_data_keys) => {

            // One possibility of adding steps is to change the x and y points, and their colors for each step.
            // Due to plotly weird convention, the values obtained in trace cannot be used in the steps.
            // In the trace, the different curves must be given as, for example:
            // {
            //   x: [1, 2, 3],
            //   y: [2, 1, 3],
            //   type:   "scatter",
            //   mode:   "markers",
            //   marker: {
            //             size: 20,
            //             color: "blue"
            //           }
            // }
            // For the args (first arg) in each step of the slider, however, it must be:
            // {
            //   x: [[1, 2, 3]],
            //   y: [[1, 2, 3]],
            //   marker: [{
            //             size: 20,
            //             color: "red"
            //           }]
            //  }
            // Note that in this case, each value is an array. Not only that, but the number of elements in the arrays
            // of the args values cannot be smaller than the number of traces originally, otherwise it is not shown.
            //
            // The above functionality does not work well in plotly, as described here: https://github.com/plotly/plotly.js/issues/7293
            //
            // Another possbility is to add all the traces at first, and the steps will then just change their visibility
            // We are following this option for the moment. It is however, quite slow.
            //
            // One last possibility is to add only the traces for the current time, and use the 'plotly_sliderchange'
            // event to update the graphs ourselves. This way, we can add only the traces that are needed for that particular 
            // key/step, and hopefully the update is not too slow.

            // Check if the key exists; if not, initialize array that will hold the traces for this step
            if (!traces_slider_obj[key]) {
              // Adding empty traces for each yaxis in layout, such that the plots are generated every time
              traces_slider_obj[key] = Object.keys(layout)
                .filter(key => /^yaxis(\d+)?$/.test(key))
                .map(key => {
                  const yaxisName = key === 'yaxis' ? 'y' : key.replace('yaxis', 'y');
                  const xaxisName = key === 'yaxis' ? 'x' : key.replace('yaxis', 'x');
                  return {
                    name: 'empty',
                    type: 'scatter',
                    yaxis: yaxisName,
                    xaxis: xaxisName,
                    y: [],
                    x: []
                  };
                });
            }

            // Starting a new step (that will include many traces - one for each jobid)
            step = {};

            // Building up traces, one for each jobid, containing current point and previous points (if configured)
            Object.keys(grouped_data[key])
            .forEach(jobid => {
              // Starting a new trace (one per jobid)
              let steptrace = {...trace_default};

              steptrace.type = trace_data.mode ?? 'scatter';
              steptrace.mode = trace_data.mode ?? 'lines+markers';
              // steptrace.showlegend = trace_data.showlegend ?? false;
              // steptrace.legendgroup = trace_data.legendgroup ?? trace_data.name;

              if (!self.graph_data.include_previous_steps) {
                self.graph_data.include_previous_steps = 0
              }
              // Current + previous steps (if it is configured to be added)
              steptrace.x = []
              steptrace.y = []
              steptrace.color = []
              steptrace.size = []
              steptrace.customdata = []
              for (let i = self.graph_data.include_previous_steps; i >= 0; i--) {
                if (((index - i)>=0)&&(grouped_data[grouped_data_keys[index - i]][jobid])){
                  // If this jobid exist (to check if it exists in the previous keys), add its value
                  
                  // Getting x values
                  if ((layout.xaxis.type !== 'date')&&( self.graph_data.xcol && self.graph_data.xcol != 'date' )) {
                    steptrace.x.push(parseFloat(grouped_data[grouped_data_keys[index - i]][jobid][self.graph_data.xcol]));
                  } else {
                    steptrace.x.push(self.parseToDate(grouped_data[grouped_data_keys[index - i]][jobid][self.graph_data.xcol]));
                  }
                  steptrace.y.push(parseFloat(grouped_data[grouped_data_keys[index - i]][jobid][trace_data.ycol]));
                  steptrace.color.push(i===0?grouped_data[grouped_data_keys[index - i]][jobid]['color']:'gray');
                  steptrace.size.push(i===0?15:5);

                  // Creating hovertemplate if given on config
                  if (trace_data.onhover) {
                    // Geting data from grouped_data[key][jobid] in the correct format in customdata
                    // [ [first_item_info_1,first_item_info_2,first_item_info_3], [second_item_info_1,second_item_info_2,second_item_info_3], ...]
                    steptrace.customdata.push(trace_data.onhover.map(entry => {
                      // Extract the key and value (since each entry is a single key-value pair object)
                      const [hoverkey, value] = Object.entries(entry)[0];
                    
                      if (value['factor']) {
                        // If a factor is given, parse as a float and multiply by that factor
                        return parseFloat(grouped_data[grouped_data_keys[index - i]][jobid][hoverkey]) * value['factor']
                      } else if ((value['type'])&&(value['type']==='date')){
                        // If the value is type 'date', parse it
                        return self.parseToDate(grouped_data[grouped_data_keys[index - i]][jobid][hoverkey]).toLocaleString('sv-SE')
                      } else {
                        // Otherwise, return the value itself
                        return grouped_data[grouped_data_keys[index - i]][jobid][hoverkey]
                      }
                      // return value['factor'] ? parseFloat(grouped_data[grouped_data_keys[index - i]][jobid][hoverkey]) * value['factor'] : grouped_data[grouped_data_keys[index - i]][jobid][hoverkey];
                    }));
                  }
                }
              }
              steptrace.name = jobid
              steptrace.marker = {
                color: steptrace.color,
                size: steptrace.size,
              }
              steptrace.line = { width: 3, color: 'gray', simplify: false};
              
              // Preparing the hover template
              if (trace_data.onhover) {
                i = 0
                for (const entry of trace_data.onhover) {
                  const [key, value] = Object.entries(entry)[0]; // Extract the single key-value pair
                  // Add information on new line, when there's already some info there
                  steptrace.hovertemplate = steptrace.hovertemplate ? steptrace.hovertemplate + "<br>" : '';
                  steptrace.hovertemplate += `${value['name']}: %{customdata[${i}]${value['format']??''}}${value['units']??''}` ;
                  i++
                }
              }
              // Adding this steptrace to the current key/step
              traces_slider_obj[key].push(steptrace)
            });

            if (get_slider_values) {
              // If no lines (shapes) are to added, only traces are modified (method: restyle)
              let method =  'restyle';
              let args = [{},{}]; // Empty arguments, as we are now using `execute: false` and we update the plot ourselves
              shapes.push(layout.shapes??[])
              if (self.graph_data.vertical_line) {
                // If vertical lines (shapes) are to be added, both traces and layout need to be modified (method: update)
                shapes[shapes.length-1].push(...shapes[shapes.length-1],{
                  type: 'line',
                  x0: self.parseToDate(key),
                  y0: 0,
                  x1: self.parseToDate(key),
                  yref: 'paper',
                  y1: 1,
                  line: {
                    color: 'gray',
                    width: 1.5,
                    dash: 'dot',
                  }
                })
                // method = 'update' // change method to 'update' and add layout change below
                // args.push(
                //   {shapes: shapes_with_lines} // adding lines as shapes to layout
                // )
              }

              step = {
                label: self.parseToDate(key).toLocaleString('sv-SE'),
                value: key,
                method: method,
                args: args,
                execute: false,
              }

              // Adding vertical line for the first step that is shown
              if ((index === numsteps - 1)&&(self.graph_data.vertical_line)) {
                layout.shapes = shapes[shapes.length-1]
              }

              steps.push(step)
            }
          });

        } else {                                    // SCATTER PLOT 
          // If it's not a heatmap not a bar, we consider it is a scatter plot
          trace.line = mergeDeep({ width: 1, shape: 'hvh', color: trace_data.color ?? 'black' },trace_data.line??{});
          trace.mode = trace_data.mode ?? 'lines';
          trace.showlegend = trace_data.showlegend ?? true;
          trace.legendgroup = trace_data.legendgroup ?? trace_data.name;

          // Getting x values
          if ((layout.xaxis.type !== 'date')&&( self.graph_data.xcol && self.graph_data.xcol != 'date' )) {
            trace.x = data.map(function (x)  { return parseFloat(x[self.graph_data.xcol]) });
          } else {
            trace.x = data.map(function (x)  { return self.parseToDate(x[self.graph_data.xcol]) });
            // trace.x = data.map(function (x)  { return new Date(Date.parse(x[self.graph_data.xcol])) });
          }
          // Parsing values and min/max when present
          values = data.map(function (y) {
            let val = typeof y[trace_data.ycol] == 'string'? y[trace_data.ycol].split(";") : [ y[trace_data.ycol] ];
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
            self.prepare_hoverinfo(trace,trace_data,data)
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

        // Getting min and max values of y for each y axis to adjust ranges below
        // (min and max for x are adjusted below)
        if (((self.minmax)&&(trace.min))||(trace.y)) {
          ymin[trace.yaxis] = Math.min(ymin[trace.yaxis] ? ymin[trace.yaxis] : 0, ...(self.minmax ? trace.min : trace.y));
          ymax[trace.yaxis] = Math.max(ymax[trace.yaxis] ? ymax[trace.yaxis] : 0, ...(self.minmax ? trace.max : trace.y));  
        }

        // Add traces if this data does not contain a slider, as in that case, all the traces were added already
        if (!self.graph_data.slider) {
          traces.push(trace);
        }
      }
    }

    // Getting traces to be plotted on slider (for each step and the default one)
    if (self.graph_data.slider) {
      // Transforming object that stored all traces for each timestamp into an array of arrays
      traces_slider = Object.keys(traces_slider_obj)
          .map(Number)                            // convert keys to numbers
          .sort((a, b) => a - b)                  // sort in ascending order
          .map(key => traces_slider_obj[key]);    // map sorted keys to their arrays
      // Getting the last step to plot first
      if (traces_slider.length) {
        traces = traces_slider[traces_slider.length - 1]
      }
    }

    // Getting min and max values of x for each x axis to adjust ranges below
    for (let trace of traces) {
      if (trace.x) {
        // Getting x range to fix range below
        if (trace.x[0] instanceof Date) {
          xmin = new Date(Math.min(xmin ?? new Date("2101/01/01"),...trace.x))
          xmax = new Date(Math.max(xmax ?? new Date("2001/01/01"),...trace.x))
        } else {
          xmin = Math.min(xmin ?? Infinity,...trace.base??trace.x)
          xmax = Math.max(xmax ?? -Infinity,...trace.base?trace.base.map((a, i) => a + trace.x[i]):trace.x)
        }
        // Fixing xmin where the vertical dashed line is located (when vertical_line = true)
        // Note: this only works because there's only this shape given
        if (self.graph_data.vertical_line) {
          xmin = layout.shapes[0].x0
        }
      }
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
  if (!layout.grid){
    // If yaxis is used in traces
    if (yaxis2) {
      layout.yaxis2.overlaying = 'y'
      layout.yaxis2.side = 'right'

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
  }

  // Removing all listeners before adding new ones
  if (graphDiv.hasClass('js-plotly-plot')) {
    // removeAllListeners CANNOT be done here, otherwise it will remove the listeners added outside (in page_graph.js or footer_graph.js)
    // graphDiv[0].removeAllListeners();
    // graphDiv[0].removeListener('plotly_update');  
  }


  // Adding a slider if that's defined, and the actions when changing the slider or clicking the buttons
  if ((self.graph_data.slider)&&(!self.empty)) {
    // Adding our own update of the graph when the slider is changed, due to slowness of using
    // all traces at once, and bugs updating the traces when passing them in the steps (see long comment above)
    var slider_change = function (e) {
      // Updating shapes in layout
      layout.shapes = shapes[e.step._index]
      layout.xaxis.range = [ self.graph_data.vertical_line?layout.shapes[0].x0:Math.min(...traces_slider[e.step._index].flatMap(trace => trace.x)),Math.max(...traces_slider[e.step._index].flatMap(trace => trace.x)) ]
      // Resettting autorange to false, as after zoom it may be changed to true (must be xaxis, which is used in 'matched' for all graphs)
      layout.xaxis.autorange = false
      // Updating the graph, as the slider update has problems
      Plotly.react(self.id, traces_slider[e.step._index], layout, self.config);
    
      // Updating range to fix double click or 'reset axis'
      graphDiv[0]._fullLayout.xaxis._rangeInitial0 = layout.xaxis.range[0]
      graphDiv[0]._fullLayout.xaxis._rangeInitial1 = layout.xaxis.range[1]
    }

    layout.sliders = [{
      active: numsteps-1,
      pad: {
        t: 30
      },
      len: 0.93,
      x: 0,
      currentvalue: {
        xanchor: 'right',
        prefix: 'Queue view at: ',
        font: {
          color: '#888',
          size: 20
        }
      },
      steps: steps,
    }]
    layout.margin.l = 60
    layout.margin.r = 60

    // Adding previous and next buttons
    layout.updatemenus = [{
      showactive: false,
      pad: {t: 60, l: 30},
      type: 'buttons',
      xanchor: 'right',
      yanchor: 'top',
      x: 1.0,
      y: 0,
      direction: 'left',
      font: {
        family: "FontAwesome",
        size: 12
      },  
      buttons: [{
        label: "&#xf048;",
        args: [],
        execute: false
      },{
        label: "&#xf051;",
        args: [],
        execute: false
      }]
    }]
    // Adding function and listener of selecting previous or next step when clicking the buttons
    var change_step = function (e) {
      let index = graphDiv[0]._fullLayout.sliders[0].active
      if (e.button._index)
        ++index
      else
        --index

      if(traces_slider[index]) {
        layout.sliders[0].active = index
        // Updating shapes in layout
        layout.shapes = shapes[index]
        layout.xaxis.range = [ self.graph_data.vertical_line?layout.shapes[0].x0:Math.min(...traces_slider[index].flatMap(trace => trace.x)),Math.max(...traces_slider[index].flatMap(trace => trace.x)) ]
        // Resettting autorange to false, as after zoom it may be changed to true (must be xaxis, which is used in 'matched' for all graphs)
        layout.xaxis.autorange = false

        // Updating the graph, as the slider update has problems
        Plotly.react(self.id, traces_slider[index], layout, self.config);
        // Updating range to fix double click or 'reset axis'
        graphDiv[0]._fullLayout.xaxis._rangeInitial0 = layout.xaxis.range[0]
        graphDiv[0]._fullLayout.xaxis._rangeInitial1 = layout.xaxis.range[1]
      }
    }
    // Add function and click event to mark a given job ID as selected
    var mark_job = function (e) {
      let jobid = e.points[0].data.name
      let index = graphDiv[0]._fullLayout.sliders[0].active

      // Iterate over each inner array in traces_slider to mark selected jobid
      traces_slider.forEach(steps => {
        steps.forEach(job => {
          // Ensure the marker object exists
          job.marker = job.marker || {};

          if (job.name == jobid) {
            // For the matching jobid, add (or update) the line property
            job.marker.line = {
              color: "black",
              width: 2,
            };
            job.marker.symbol = 'star';
            job.line.color = 'black';
          } else {
            // For non-matching items, remove the line property if it exists
            if (job.marker.line) {
              delete job.marker.line;
              delete job.marker.symbol;
              job.line.color = 'gray';
            }
          }
        });
      });
      Plotly.update(self.id, traces_slider[index], layout);
    }
    // Removing listeners before adding new ones
    graphDiv[0].removeListener('plotly_sliderchange', slider_change);
    graphDiv[0].removeListener('plotly_buttonclicked', change_step);
    graphDiv[0].removeListener('plotly_click', mark_job);  

    graphDiv[0]
      .on('plotly_sliderchange', slider_change)
      .on('plotly_buttonclicked', change_step)
      .on('plotly_click', mark_job);
  }

  // Checking if info div is to be added to the left (for hoverinfo or calendar)
  if ((self.graph_data.layout.calendar == 'left')||(self.graph_data.layout.hovermode == 'left')) {
    // Check if graph already has a .info sibling on the left, and if not, create it
    if(!graphDiv.prevAll('.info').length > 0) {
      let hoverdiv = $('<div>').addClass('info')
                                .addClass(self.id);
      hoverdiv.insertBefore(graphDiv)
    }
  }
  // Checking if info div is to be added to the right (for hoverinfo or calendar)
  if ((self.graph_data.layout.calendar == 'right')||(self.graph_data.layout.hovermode == 'right')) {
    // Check if graph already has a .info sibling on the right, and if not, create it
    if(!graphDiv.nextAll('.info').length > 0) {
      let hoverdiv = $('<div>').addClass('info')
                                .addClass(self.id);
      hoverdiv.insertAfter(graphDiv)
    }
  }

  // Adding listener to add data to the info div
  if ((self.graph_data.layout.hovermode == 'left')||(self.graph_data.layout.hovermode == 'right')) {
    // Adding listener to hover to add data to 'info' div
    if (($(`.info.${self.id}`).length>0)&&(graphDiv.children().length>0)) {
      let saved_info = '';
      // Creatign 'close' button, to clean up the info when clicked
      let closeBtn = $('<span class="close-btn"><i class="fa fa-times"></i></span>');

      // Selecting the corresponding div to display info
      let infoDiv;
      if (self.graph_data.layout.hovermode == 'left') {
        // Selecting the div on the left of graphDiv
        infoDiv = graphDiv.prev('.info');
      } else  {
        // Selecting the div on the right of graphDiv
        infoDiv = graphDiv.next('.info');
      }

      let hoverinfo = infoDiv.children('.hoverinfo');
      if (hoverinfo.length === 0) {
        // Create a new div to hold hoverinfo
        hoverinfo = $('<div>').addClass('hoverinfo');
  
        // Prepend the calendar to the container without removing its current elements
        infoDiv.append(hoverinfo);
      }

      var print_hoverinfo = function(e) { 
        if ((e.points[0].data.hovertemplatecustom)&&(e.points[0].data.hovertemplatecustom.length>0)) {
          // console.log('e.points[0].customdata',e.points[0].customdata)
          // console.log( e.points[0].data.hovertemplatecustom.replace(/%\{customdata\[(\d+)\]\}/g, (_, index) => e.points[0].customdata[index]) )
          hoverinfo.html(e.points[0].data.hovertemplatecustom.replace(/%\{customdata\[(\d+)\]\}/g, (_, index) => e.points[0].customdata[index]));
        }
      }
      var stick_hoverinfo = function(e) {
        if ((e.points[0].data.hovertemplatecustom)&&(e.points[0].data.hovertemplatecustom.length>0)) {
          // Storing the information of the clicked box
          saved_info = e.points[0].data.hovertemplatecustom.replace(/%\{customdata\[(\d+)\]\}/g, (_, index) => e.points[0].customdata[index])
          // Adding text and close button
          // The click event is not needed because the unhover will be triggered anyway
          hoverinfo.html(saved_info).prepend(closeBtn);
        }
      }
      var clean_hoverinfo = function(e) {
        if (saved_info.length>0) {
          hoverinfo.html(saved_info).prepend(closeBtn);
          closeBtn.on('click', function() {
            // Clearning up saved_info and info div
            saved_info = '';
            $(this).parent().empty();
          });
        } else {
          hoverinfo.html('')
        }
      }

      // Removing listeners before adding new ones
      graphDiv[0].removeListener('plotly_hover', print_hoverinfo);
      graphDiv[0].removeListener('plotly_click', stick_hoverinfo);  
      graphDiv[0].removeListener('plotly_unhover', clean_hoverinfo);

      graphDiv[0]
        .on('plotly_hover', print_hoverinfo)
        .on('plotly_click', stick_hoverinfo)
        .on('plotly_unhover', clean_hoverinfo);
    }
  }

  // Adding calendar if layout.calendar = 'left' or 'right'
  if ((self.graph_data.layout.calendar == 'left')||(self.graph_data.layout.calendar == 'right')) {
    // Checking if calendar is going to be put on the same div as info
    let infoDiv;
    if (self.graph_data.layout.calendar == 'left') {
      // Selecting the div on the left of graphDiv
      infoDiv = graphDiv.prev('.info');
    } else  {
      // Selecting the div on the right of graphDiv
      infoDiv = graphDiv.next('.info');
    }
    let calendar = infoDiv.children('.calendar');
    if (calendar.length === 0) {
      // Create a new div and initialize it as a jQuery UI datepicker (inline calendar)
      calendar = $('<div>').addClass('calendar').datepicker({
        numberOfMonths: 1,
        onSelect: (dateText, inst) => self.selectDate(dateText, inst),
      });
    }

    // Restricting dates on the calendar
    if (layout.xaxis?.range?.length>0) {
      calendar.datepicker("option", "minDate", self.parseToDate(layout.xaxis.range[0]));
      calendar.datepicker("option", "maxDate", self.parseToDate(layout.xaxis.range[1]));
    }
    // Prepend the calendar to the container without removing its current elements
    infoDiv.prepend(calendar);

  }

  // Fixing axes labels after plotly update to 3.0.0
  if (typeof layout?.yaxis?.title === 'string') {
    layout.yaxis.title = {
      text: layout.yaxis.title
    }
  }
  if ((typeof layout?.yaxis?.title !== 'undefined')&&(typeof layout?.yaxis?.title?.font === 'undefined')) {
    layout.yaxis.title.font = { 
      family: 'sans-serif',
      size: 12,
    }
  }
  if (typeof layout?.xaxis?.title === 'string') {
    layout.xaxis.title = {
      text: layout.xaxis.title
    }
  }
  if ((typeof layout?.xaxis?.title !== 'undefined')&&(typeof layout?.xaxis?.title?.font === 'undefined')) {
    layout.xaxis.title.font = { 
      family: 'sans-serif',
      size: 12,
    }
  }

  /**************************************
   **         CREATING THE PLOT        **
   **************************************/
  if (params) layout.datarevision = params.JobID
  Plotly.react(self.id, traces, layout, self.config).then(_ => {

    // Fixing zoom when double clicking or clicking on the 'reset axis' modebar button
    if ((graphDiv.length>0)&&(typeof layout?.xaxis?.range != 'undefined')) {
      graphDiv[0]._fullLayout.xaxis._rangeInitial0 = layout.xaxis.range[0];
      graphDiv[0]._fullLayout.xaxis._rangeInitial1 = layout.xaxis.range[1];
    }

    // Moving the rangeslider when that is the case
    if (layout.xaxis.rangeslider?.translate) {
      self.move_slider(self.id, layout.xaxis.rangeslider.translate)
    }


    // Defining function to add in 'plotly_update' listener (and to be able to remove it)
    var moveSlider = function () {
      if (layout.xaxis.rangeslider?.translate) {
        self.move_slider(self.id, layout.xaxis.rangeslider.translate);
      }
    }
    // Removing listeners before adding new ones
    graphDiv[0].removeAllListeners('plotly_update');  

    graphDiv[0].on('plotly_update', moveSlider)

    // When a list for highlighing is given and the graph is not empty
    // Add the 'hover' and 'click' listeners to highlight the bars
    if (Array.isArray(self.graph_data.highlight)&&(!self.empty)) {

      let timerhover = null
      let timerunhover = null
      let timerevent = null
      let accumulatedIndices = null
      
      // Set all marker linewidths to 0
      function resetBarWidth(traces) {
        // Reset all marker.line.width values to 0 for every trace
        traces.forEach(trace => {
          // Reset the width array by mapping every element to 0
          if (trace.marker && trace.marker.line && Array.isArray(trace.marker.line.width)) {
            trace.marker.line.width = trace.marker.line.width.map(() => 0);
          }
        });
      }

      // Set all colors back to the original one
      function resetColors(traces) {
        traces.forEach(trace => {
          // Check if the original colors are stored in each trace
          if (trace.marker && trace.marker._originalColors && Array.isArray(trace.marker._originalColors)) {
            // Restore the marker color array from the stored original colors
            trace.marker.color = [...trace.marker._originalColors];
          }
        });
      }

      var grayOthers = function(traces, curveNumber, accumulatedIndices) {
        // If mouse if pressed, make all other curves gray
        console.log(self.mousePressed)
        if (self.mousePressed) {
          traces.forEach((trace, idx) => {
            if (trace.marker && Array.isArray(trace.marker.color)) {
              if (idx === curveNumber) {
                // For the trace that matches curveNumber, only preserve colors at indices in accumulatedIndices.
                trace.marker.color = trace.marker.color.map((color, i) =>
                  accumulatedIndices.has(i) ? color : "gray"
                );
              } else {
                // For all other traces, change all colors to "gray".
                trace.marker.color = trace.marker.color.map(() => "gray");
              }
            }
          });
        }                
      }

      // Function to be called on hover to highlight a bar (increasing edge linewidth)
      var highlight = function(e) {
        if(timerevent)
          clearTimeout(timerevent)

        // Wrapping over a timeout to cancel intermediate hover events
        timerevent = setTimeout(_ => {
          timerevent = null

          // Accumulate the indices of the traces that should be highlighted
          accumulatedIndices = new Set();
          // Looping over all "keys" to be checked:
          // Gets the values of the current hovered item and get 
          // the indices of all of the other traces that have the same value
          for (const item of self.graph_data.highlight) {
            const highlight_value = e.points[0].data[item][e.points[0].pointIndex];
            const indices = e.points[0].data[item].reduce((acc, element, index) => {
              if (element === highlight_value) {
                acc.push(index);
              }
              return acc;
            }, []);
            // indices store all the indices of the traces that have the same value
            // of the hovered element to be highlighted
            indices.forEach(idx => accumulatedIndices.add(idx));  
          }

          // Reseting bar linewidths to 0 to clean up
          resetBarWidth(traces)

          // For each global index in accumulatedIndices, update that element's width to 2
          accumulatedIndices.forEach(index => {
            // Check that globalIndex is valid
            traces[e.points[0].curveNumber].marker.line.width[index] = 2;
          });

          // If mousePressed, this means that the mouse was clicked and 
          // now it's hovered on a bar. In this case, the accumularedIndices should have
          // colors, but all others should be grayed out
          grayOthers(traces,e.points[0].curveNumber,accumulatedIndices)

          Plotly.update(self.id, traces, layout);

        }, 100)
      }

      var unhighlight = function() {
        if(timerevent)
          clearTimeout(timerevent)

        timerevent = setTimeout(_ => {
          timerevent = null
          lastrace = null

          resetBarWidth(traces);
          resetColors(traces);

          Plotly.update(self.id, traces, layout);
        }, 100)
      }

      // Plotly does not have events for mousedown and mouseup
      // so we have to catch all the bars and set the events "by hand"
      console.log("Adding events for mouse")
      // Adding listeners to to mouse events to keep track of the state of the primary mouse button
      document.addEventListener("mousedown", self.setPrimaryButtonState);
      document.addEventListener("mousemove", self.setPrimaryButtonState);
      document.addEventListener("mouseup", self.setPrimaryButtonState);
      console.log("Adding events for mplotly")

      graphDiv[0].removeListener('plotly_hover', highlight);
      graphDiv[0].removeListener('plotly_unhover', unhighlight);

      // Getting all bar (or point) objects
      graphDiv[0]
        .on("plotly_hover", highlight)
        .on("plotly_unhover", unhighlight)
        .on("plotly_relayout", data => { // Trigerring mouseup and mousedown events
          console.log("relayout triggered!")
          let bars = document.querySelectorAll(".barlayer .bars .points .point path")
          for(let i = 0; i < bars.length; i++) {
            bars[i].onmousemove = e => {
              console.log("Mousemove!")
              if(graphDiv[0]._fullLayout._lasthover)
                graphDiv[0]._fullLayout._lasthover.dispatchEvent(new MouseEvent("mousemove", e))
            }
            bars[i].onmouseout = e => {
              console.log("Mouseout!")
              if(graphDiv[0]._fullLayout._lasthover)
                graphDiv[0]._fullLayout._lasthover.dispatchEvent(new MouseEvent("mouseout", e))
            }
            bars[i].onmousedown = e => {
              console.log("Mousedown!")
              // grayOthers(traces)
              // Plotly.update(self.id, traces, layout);
            }
            bars[i].onmouseup = e => {          
              console.log("Mouseup!")
              // resetColors(traces)
              // Plotly.update(self.id, traces, layout);
            }
          }
        })
      Plotly.relayout(self.id, {})

      // let bars = document.querySelectorAll(".barlayer .bars .points .point path")
      // console.log(bars)
      // for(let i = 0; i < bars.length; i++) {
      //   bars[i].onmousemove = e => {
      //     if(graphDiv[0]._fullLayout._lasthover)
      //       graphDiv[0]._fullLayout._lasthover.dispatchEvent(new MouseEvent("mousemove", e))
      //   }
      //   bars[i].onmouseout = e => {
      //     if(graphDiv[0]._fullLayout._lasthover)
      //       graphDiv[0]._fullLayout._lasthover.dispatchEvent(new MouseEvent("mouseout", e))
      //   }
      //   bars[i].onmousedown = e => {
      //     console.log("Mousedown!")
      //     grayOthers(traces)
      //     Plotly.update(self.id, traces, layout);
      //   }
      //   bars[i].onmouseup = e => {          
      //     console.log("Mouseup!")
      //     resetColors(traces)
      //     Plotly.update(self.id, traces, layout);
      //   }
      // }





      // let bars = document.querySelectorAll(".barlayer .bars .points .point path")
      // // Looping over the bars
      // for(let i = 0; i < bars.length; i++) {
      //   bars[i].onmousemove = e => {
      //     if(layer._fullLayout._lasthover)
      //       layer._fullLayout._lasthover.dispatchEvent(new MouseEvent("mousemove", e))
      //   }
      //   bars[i].onmouseout = e => {
      //     if(layer._fullLayout._lasthover)
      //       layer._fullLayout._lasthover.dispatchEvent(new MouseEvent("mouseout", e))
      //   }
      //   bars[i].onmousedown = e => {
      //     Plotly.restyle(layer, {
      //       "marker.color": "red"
      //     }, [lastrace])
      //   }
      //   bars[i].onmouseup = e => {          
      //     Plotly.restyle(layer, {
      //       "marker.color": colors[lastrace]
      //     }, [lastrace])
      //   }
      // }




    }

  })
}

/**
 * Function to check and store the primary mouse button state
 * to be used with mousedown/mouseup events on the highlighting of jobs
 */
PlotlyGraph.prototype.setPrimaryButtonState = function(e) {
  let self = this
  var flags = e.buttons !== undefined ? e.buttons : e.which;
  self.mousePressed = (flags & 1) === 1;
}

/**
 * Function to perform when a date is selected in the calendar
 * @param {string} dateText Date in text format
 * @param {obj} inst 
 * @returns 
 */
PlotlyGraph.prototype.selectDate = function (dateText, inst) {
  // TODO
  console.log('select date',dateText, inst,$(this))
  return
}

/* Conversion functions */
PlotlyGraph.prototype.msToHHMMSS = function (mseconds) {
  return this.sToHHMMSS(mseconds/1000)
}
PlotlyGraph.prototype.sToHHMMSS = function (seconds) {
  return this.FracToHHMMSS(seconds/3600)
}
PlotlyGraph.prototype.FracToHHMMSS = function (frac) {
  // Calculate hours, minutes, seconds using Math.floor
  let hours = Math.floor(frac);
  let rest = frac - hours;
  let min = Math.floor(rest * 60);
  rest = rest * 60 - min;
  let sec = Math.floor(rest * 60);
  return `${hours>0?hours.toString()+'h':''}${hours>0?min.toString().padStart(2, '0'):min.toString()}m${sec.toString().padStart(2, '0')}s`;
}

/* Creating hovertemplate */
PlotlyGraph.prototype.prepare_hoverinfo = function (trace,trace_data,data) {
  let self = this;
  // Geting data in the correct format in customcustom data
  // [ [first_item_info_1,first_item_info_2,first_item_info_3], [second_item_info_1,second_item_info_2,second_item_info_3], ...]
  trace.customdata = data.map(function (d)  {
    return trace_data.onhover.map(entry => {
      // Extract the key and value (since each entry is a single key-value pair object)
      // This is used instead of a regular object to be able to keep the order entered in the configuration
      const [hoverkey, value] = Object.entries(entry)[0];
      let ret;

      if (value['factor']) {
        // If a factor is given, parse as a float and multiply by that factor
        ret = parseFloat(d[hoverkey]) * value['factor']
      } else if ((value['type'])&&(value['type']==='date')){
        // If the value is type 'date', parse it
        ret = self.parseToDate(d[hoverkey]).toLocaleString('sv-SE')
      } else {
        // Otherwise, return the value itself
        ret = d[hoverkey]
      }
      // Applying function
      if (value['function']) {
        if (typeof self[value['function']] === 'function') {
          ret = self[value['function']](ret)
        } else {
          console.error(`Function '${value['function']}' not found! Ignoring...`);
        }
      }
      return ret
    });
  })

  // Preparing the hover template
  i = 0
  for (const entry of trace_data.onhover) {
    const [key, value] = Object.entries(entry)[0]; // Extract the single key-value pair
    // Add information on new line, when there's already some info there
    if ((self.graph_data?.layout?.hovermode == 'left')||(self.graph_data?.layout?.hovermode == 'right')) {
      // If the hover information is to be shown on the left or right of the graph
      if (i==0) {
        trace.hovertemplatecustom = '<table><tbody>'
      }
      trace.hovertemplatecustom += `<tr><td><strong>${value['name']}:</strong></td><td>%{customdata[${i}]${value['format']??''}}${value['units']??''}</td></tr>` ;  
      if (i==trace_data.onhover.length-1) {
        trace.hovertemplatecustom += '</tbody></table>'
      }
    } else {
      // If the hover information is to be shown on top of the graph (usual way)
      if (i==0) {
        trace.hovertemplate = trace.hovertemplate ? trace.hovertemplate + "<br>" : '';
      }
      trace.hovertemplate += `${value['name']}: %{customdata[${i}]${value['format']??''}}${value['units']??''}` ;  
      if (i<trace_data.onhover.length) {
        trace.hovertemplate += '<br>'
      }
    }
    i++
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
 * Converts a timestamp or string date into a new Date object
 * @param {str} input either timestamp or date in a string
 * @returns new Date object
 */
PlotlyGraph.prototype.parseToDate = function(input) {
  // Convert the input to a string, whether it starts as a number or string.
  const strInput = input.toString();

  // Check if the input is a valid timestamp (only contains digits)
  if (/^((\d+\.?\d*)|(\.\d+))$/.test(strInput)) {
    // If it's in seconds (10 digits), convert to milliseconds
    const timestamp = strInput.length === 10 ? parseInt(strInput) * 1000 : parseInt(strInput);
    return new Date(timestamp); // Return Date object from timestamp
  }

  // Check if the input is a valid date string
  const date = new Date(strInput);
  if (!isNaN(date.getTime())) {
    return date; // Return Date object if valid
  }

  // If neither, throw an error or return null/undefined
  throw new Error("Invalid date or timestamp input");
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


function sync_relayout(e,graphs) {
  if (Object.entries(e).length == 0) { return; }

  graphs.forEach( (graph) => {
    let div = $("#" + graph.id)[0];
    let x = div.layout.xaxis;
    let update = {};
    if ("xaxis.autorange" in e && e["xaxis.autorange"] != x.autorange) {
      update['xaxis.autorange'] = e["xaxis.autorange"];
    }
    if ("xaxis.autorange" in e && "rangeslider" in x) {
      update['layout.xaxis.rangeslider.autorange'] = e["xaxis.autorange"];
    }
    if ("xaxis.range[0]" in e && e["xaxis.range[0]"] != x.range[0]) {
      update['xaxis.range[0]'] = e["xaxis.range[0]"];
    }
    if ("xaxis.range[1]" in e && e["xaxis.range[1]"] != x.range[1]) {
      update['xaxis.range[1]'] = e["xaxis.range[1]"];
    }
    if ("xaxis.range" in e && e["xaxis.range"] != x.range) {
      update['xaxis.range'] = e["xaxis.range"];
    }
    /* Use ".update" instead of ".relayout" to avoid triggering the function again */
    Plotly.update(div, {}, update);
  });
}

// Function to get mouse event from one graph and trigger hover over the same x over all curves in other divs
function couple_hover(e, id, graphs) {
  // Getting x-value from mouse hover event data
  let xval = e.xvals[0];
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