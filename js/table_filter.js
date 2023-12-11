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

var key_timeout = null;

function key_filter(table) {
  clearTimeout(key_timeout);
  key_timeout = setTimeout(function(){filter(table); return;},300);
}

function filter(table) {
  filter_values = [];
  search = {}
  search.headers = Array.isArray(view.navdata.search_field) ? view.navdata.search_field : [view.navdata.search_field]
  search.fields = []
  search.indices = [];
  view.inital_data.filter = {};
  // Cleaning message
  $(".filtermessage").remove();
  let index = 0;
  let tr_filter = $(table).find("tr.filter th");
  let tr_first = $(table).find("tr:first th")
  tr_filter.each(function() {
    // console.log("test length",$(this).find("input").length) // TO CHECK: All fields are added. Is that needed, or only fields with values?
    if ($(this).find("input").length > 0) {
      let key = tr_first.eq(index).text().toLowerCase();
      let filter = $(this).find("input").val().trim()
      filter_values.push(filter);
      view.inital_data.filter[key] = filter;
      if (search.headers.includes(key)) {
        search.fields.push($(this));
        search.indices.push(index);
      }
    } else {
      filter_values.push("");
    }
    index += 1;
    return;
  });
  view.setHash();
  let tr = $(table).find("tbody tr");
  tr.each(function() {
    let td = $(this).find("td");
    let show = true;
    td.each(function(i) {
      if (filter_values[i] && filter_values[i].length > 0) {
        if (filter_values[i].charAt(0) == '>') {
          if ($(this).text().length == 0 || parseFloat($(this).text().replace(/[^\.\-\+\d]/g, '')) <= parseFloat(filter_values[i].substring(1))) {
            show = false;
          }
        } else if (filter_values[i].charAt(0) == '<') {
          if ($(this).text().length == 0 || parseFloat($(this).text().replace(/[^\.\-\+\d]/g, '')) >= parseFloat(filter_values[i].substring(1))) {
            show = false;
          }
        } else if (filter_values[i].charAt(0) == '=') {
          if ($(this).text().length == 0 || $(this).text() != filter_values[i].substring(1) ) {
            show = false;
          }
        } else {
          if ($(this).text().toUpperCase().indexOf(filter_values[i].toUpperCase()) == -1) {
            show = false;
          }
        }
      }
      return show;
    });
    if (show) {
      $(this).show();
    } else {
      $(this).hide();
    }
    return;
  });
  // Default bootstrap table striping does not work for filtered tables.
  // Reapply manual stripes.
  $(table).find("tbody tr:visible").each(function(index) {
    $(this).css("background-color", !!(index & 1)? "rgba(0,0,0,.05)" : "rgba(0,0,0,0)");
    return;
  });

  // Reapply correct border at the bottom
  // $(table).find("tbody tr:visible").find("td").css("border-bottom","none")
  // $(table).find("tbody tr:visible").last().find("td").css("border-bottom","1px solid #dee2e6")
  // Reapply correct borders on hover
  $(table).find("tbody tr:visible").hover(function() { // on hover
      $(this).nextAll("tr:visible").first().find("td").css("border-top","none");
      return;
    },function() { // off hover
      $(this).nextAll("tr:visible").first().find("td").css("border-top","1px solid #dee2e6");
      return;
    });

  // Update aggregated values
  update_aggregation();
  // Updating number of visible entries
  let visible = update_num_count();
  // Adding messages when there is no data to show (no lines)
  if (tr.length) {
    if (!visible) {
      // When the table is not empty but no result is shown (all jobs were filtered)
      search_jobs(search);
    } else if (visible == 1) {
      // When only one result is shown, select
      // (when not selected, footer is already present and filter is applied)
      let row = $("#main_content table tbody tr:visible");
      if (!row.hasClass("selected")) {
        $("#main_content table tbody tr:visible")[0].click();
      }
    }  
  } else {
    $("#main_content").append($("<span>").addClass('filtermessage').text("No data available."));
  }
}

function search_jobs(search) {
  // If there is a field to be searched
  if (search.fields.length > 0) {
    // Loop through the selected search fields
    for (let i = 0; i < search.fields.length; ++i) {
      let filter = search.fields[i].find("input").val().trim();
      // If there is a filter added
      if (filter.length > 0) {
        apply_search(search.headers[i],filter);
      } else {
        no_results();
      } 
    }
  } else {
    no_results();
  }    
}

// Reads the mapping file from jobid to day (running/history) 
// and returns it in an object with jobid as key and "day" as value
function update_mapjobid_to_day() {
  // Getting map jobid to day
  let mapjobid_to_day_file = replaceDataPlaceholder("data/" + ((view.navdata.data.demo || view.url_data.demo) ? "DEMO/" : "") + "_queued/mapjobid_to_day.csv")
  let mapjobid_to_day = d3.csv(mapjobid_to_day_file)
  .then((data) => {
    let obj = {};
    data.forEach(function (d) {
      obj[d.jobid] = d.day;
      return;
    });
    return obj;
  }, () => { console.log("Error reading ", mapjobid_to_day_file); return; });

  return mapjobid_to_day;
}

// Perform search using "filter" values written in "header"
function apply_search(header,filter,follow) {
  // Getting map jobid to day
  let found = false;
  // Remove previous filter message (if that is the case)
  $(".filtermessage").remove();
  for (let [key, value] of Object.entries(view.mapjobid_to_day)) {
    // Check if the value of the filter is on the csv file
    if (key.indexOf(filter) !== -1) {
      value = parseInt(value)
      // If 'follow=true' change the page to the corresponding value
      if (follow) {
        view.inital_data.filter[header] = filter;
        changePage(value)
        return;
      }
      // Otherwise, add the link with the search results
      if (value !== -1) {
        let date = new Date()
        date.setDate(date.getDate() - value);
        let date_str = String(date.getDate()).padStart(2, '0') + "." + String(date.getMonth() + 1).padStart(2, '0') + "." + date.getFullYear();
        let link = $("<a>").attr("href", "#").text(date_str).click(function () { changePage(value); return; });
        $("#main_content").append($("<span>").addClass('filtermessage').text(`JobID ${key} found on `).append(link));
      } else {
        let link = $("<a>").attr("href", "#").text('currently active').click(function () { changePage(value); return; });
        $("#main_content").append($("<span>").addClass('filtermessage').text(`JobID ${key} is `).append(link));
      }
      found = true;
    }
  }
  if (!found) {
    // If no result is found, but 'follow' is used, there is no page to go to
    if (follow) {
      alert(`${header}:${filter} was not found. The job may have been too short.`)
    } else {
      no_results();
    }
  }
}


function changePage(value) {
  if (value !== -1) {
    if (view.navdata.data.permission && ["observer","support"].indexOf(view.navdata.data.permission) != -1) {
      view.selectPage(['history_three_weeks', value], false); 
    } else if (view.navdata.data.permission && ["project","advisor","mentor","user"].indexOf(view.navdata.data.permission) != -1) {
      if (value !== 0) {
        view.selectPage('jobs_three_weeks', false);
      } else {
        view.selectPage('jobs_ended_today', false);
      }
    }
  } else {
    view.selectPage('running_jobs', false);
  }
  return;
}

/**
 * Adds "no result" message at the end of main_content
 */
function no_results() {
  let clear_filter_link = $("<a>").attr("href", "#").append($("<span>").text("Clear filter.").click(function () { clear_filter(); return false; }));
  // Add "no results" filter message
  $("#main_content").append($("<span>").addClass('filtermessage').text("No results found. ").append(clear_filter_link));
}

/**
 * Clear the filter values of the table (or given column(s))
 * and updates the table
 * @param {string} column Class of column(s) to clean filter
 */
function clear_filter(column) {
  $(`tr.filter th${column ? '.'+column : ""} input`).val("");
  $("tr.filter").closest("table").each(function() {
    filter(this);
    return;
  });
}

function set_initial_filter() {
  let index = 0;
  $("tr.filter").closest("table").find("tr:first th").each(function() {
    let key = $(this).text().toLowerCase();
    if (view.inital_data.filter && view.inital_data.filter[key]) {
      $(this).closest("table").find("tr.filter th input").eq(index).val(view.inital_data.filter[key]);
    }
    index+=1;
    return;
  });
  $("tr.filter").closest("table").each(function() {
    filter(this);
    return;
  });
  return;
}

function update_num_count() {
  let table = $("tr.filter").closest("table");
  let visible = table.find("tbody tr:visible").length;
  $("#num_visible_rows").text("Showing "+visible+"/"+table.find("tbody tr").length+" entries");
  return visible;
}

/**
 * Gets unchecked checkboxes from column selector and adds to table the corresponding
 * class to hide them
 */
function set_initial_columns() {
  // Gather checked checkboxes
  let unchecked = new Set();
  $("#column_selection input").each(function() {
    if (typeof(Storage) !== "undefined") {
      sessionStorage.setItem($(this).attr("name"),$(this).is(":checked"));
    }
    if (!$(this).is(":checked")) {
      unchecked.add($(this).attr("name"));
    }
    return;
  });
  // Search for available groups
  $("#main_content th[class^='group_'],#main_content th[class*=' group_']").each(function() {
    let classes = $(this).attr("class").split(" ");
    let index = $(this).parent().children().index($(this)) + 1;
    let th = this;
    classes.forEach(function(cl) {
      matcher = cl.match("group_(.+)");
      if (matcher) {
        $(th).closest("table").find("tr td:nth-child(" + index + "), tr th:nth-child(" + index + ")").addClass(cl);
      };
    });
    return;
  });

  unchecked.forEach(function(cl) {
    $("#main_content table").addClass(`hide-${cl}`); 
    return;
  });
  return;
}

/**
 * Creates column selector and adds to infoline
 */
function add_column_selector() {
  let column_selection = $("<div>").addClass("dropup clickable")
                   .attr("id","column_selection")
                   .attr("title","Show/Hide column groups")
                   .attr("data-placement","left")
                   .append($("<a>").attr("href","#")
                   .attr("aria-label","Show/Hide column groups")
                   .addClass("dropdown-toggle")
                   .attr("data-toggle","dropdown")
                   .text("Columns"));
  let dropup_menu = $("<div>").addClass("dropdown-menu");
  column_selection.append(dropup_menu);
  let groups = get_column_groups();
  groups = Array.from(groups).sort();
  // Create dropdown menu when there's more than 1 group
  if (groups.length > 1) {
    // Getting columns that are used in filters or sort to activate column group
    // Get filters that are not empty
    let used_cols = Object.keys(view.inital_data.filter).filter(key => view.inital_data.filter[key] != "")
    // Adding sort column when present
    if (view.inital_data.sort.sort_col) {
      used_cols.push(view.inital_data.sort.sort_col)
    }

    // Getting all header elements that contain 'group_' classes
    // And check if the text is included in 'used_cols'
    let used_groups = new Set();
    $("#main_content th[class^='group_'],#main_content th[class*=' group_']").each(function() {
      // If this element is in 'used_cols'
      if (used_cols.includes($(this).text().toLowerCase())) {
        // Add its class to 'groups' list to be selected below
        let classes = $(this).attr("class").split(" ");
        classes.forEach(function(cl) {
          matcher = cl.match("group_(.+)");
          if (matcher) {
            used_groups.add(matcher[1]);
          };
        });
      }
      return;
    });
  
    groups.forEach(function(group) {
      // inital checkbox state is given by last session setting, default value or false (in this order) 
      let checked = false;
      if (typeof(default_columns) !== "undefined") {
        checked = default_columns.includes(group);
      }
      if (view.page_data && typeof(view.page_data.default_columns) == "object") {
        checked = view.page_data.default_columns.includes(group);
      }
      if (typeof(Storage) !== "undefined" && sessionStorage.getItem("group_"+group)) {
        checked = sessionStorage.getItem("group_"+group) == "true";
      }
      // Checking current group if it's used on URL
      checked = used_groups.has(group) ? true : checked
      dropup_menu.append($("<label>").addClass("dropdown-item form-check-label")
                    .text(group)
                    .prepend($("<input>")
                    .addClass("form-check-input")
                    .attr("type","checkbox")
                    .attr("name","group_"+group)
                    .on("change",function() { 
                        // If hide-class is not present (i.e., the column is shown) clear filter, 
                        if(!$("#main_content table").hasClass(`hide-group_${group}`)) {
                          clear_filter(`group_${group}`)
                        }
                        // Toggle hide class on table (to show or hide respective column group)
                        $("#main_content table").toggleClass(`hide-group_${group}`); 
                        // Check if all elements were selected to update "de/select all" checkbox
                        let all_checked = true;
                        $("#column_selection input").slice(1).each((i,el) => {
                          all_checked &&= el.checked;
                        })
                        if (all_checked) { // Mark "select all" box and change tooltip
                          $("#group_all").prop("checked",true)
                                .attr("data-original-title","deselect all");
                        } else { // If there's at least one deselected, unmark "select all" box
                          $("#group_all").prop("checked",false)
                                .attr("data-original-title","select all");
                        }
                        return; 
                      }).prop("checked",checked)));
      return;
    });
    // Adding label with select all box
    // Done after to set correctly the initial value
    dropup_menu.prepend($("<label>").addClass("dropdown-item form-check-label")
                    .append($("<strong>").text("Column selection:"))
                    .prepend($("<input>")
                    .addClass("form-check-input")
                    .attr("title","select all")
                    .attr("data-placement","top")
                    .attr("type","checkbox")
                    .attr("name","group_all")
                    .attr("id","group_all")
                    .on("change",function() { 
                        // Clicking on the select/deselect all button:
                        if (this.checked) {
                          // If the button is being selected, loop over all elements (except itself)
                          $("#column_selection input").slice(1).each((i,el) => {
                            // If they are not selected
                            if (!el.checked) {
                              // Selects it
                              $(el).prop("checked",true).trigger("change");
                            }
                          });
                          $(this).attr("data-original-title","deselect all");
                        } else {
                          // If the button is being deselected, loop over all elements (except itself)
                          $("#column_selection input").slice(1).each((i,el) => {
                            // If they are selected
                            if (el.checked) {
                              // De-selects it
                              $(el).prop("checked",false).trigger("change");
                            }
                          });
                          $(this).attr("data-original-title","select all");
                        }
                        return; 
                      }).prop("checked",() => { // Setting up initial value (if all columns are selected by default, it must be true)
                        // Check if all elements were selected to update "de/select all" checkbox
                        let all_checked = true;
                        dropup_menu.find("input").each((i,el) => {
                          all_checked &&= el.checked;
                        })
                        return all_checked;
                    })));
    view.add_to_footer_infoline(column_selection[0],2);
  }
  // } else {
  //     dropup_menu.append($("<span>").addClass("dropdown-item disabled").text("no entry"));
  // }
  return;
}

/**
 * Get all column groups and create css stylesheet with class to hide columns
 */
function add_column_css() {
  // Getting different groups of columns
  let groups = get_column_groups();
  // Creating stylesheet to hide columns
  let styles = "";
  groups.forEach((group) => {
    styles = `${styles}.hide-group_${group} .group_${group}, `
  });
  styles = `${styles.slice(0,-2)} {\n  display: none;\n}\n`
  // Adding stylesheet to the document
  var styleSheet = document.createElement("style")
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
  return;
}

/**
 * Gets all column groups from table header
 * @returns Set containing all column groups
 */
function get_column_groups() {
  let groups = new Set();
  // Search for available groups
  $("#main_content th[class^='group_'],#main_content th[class*=' group_']").each(function() {
    let classes = $(this).attr("class").split(" ");
    classes.forEach(function(cl) {
      matcher = cl.match("group_(.+)");
      if (matcher) {
        groups.add(matcher[1]);
      };
    });
    return;
  });
  return groups;
}

function set_filter() {
  $("tr.filter th input").keyup(function() {
    key_filter($(this).closest("table")[0]);
    return;
  });
  let clear_filter_link = $("<a>").attr("href","#").attr("aria-label","Clear filter").append($("<span>").addClass("fa fa-filter").attr("title","Clear filter")).click(function(){clear_filter(); return false;});
  if (! $("#num_visible_rows").length) {
    view.add_to_footer_infoline($("<span>").attr("id","num_visible_rows")[0],30);
    view.add_to_footer_infoline(clear_filter_link[0],30);
  }
  // If not there, add the column selector
  if (! $("#column_selection").length) {
    add_column_selector();
  }
  // Run inital display process
  set_initial_columns();
  set_initial_filter();
  return;
}

function update_aggregation() {
  $("tr.aggregate:visible").find("th.aggregate_sum,th.aggregate_avg,th.aggregate_min,th.aggregate_max").each(function() {
    let index = $(this).parent().children().index($(this))+1;
    let table = $(this).closest("table");
    let sum = 0;
    let count = table.find("tbody tr:visible").length;
    let max = null;
    let min = null;
    table.find("tbody tr:visible td:nth-child("+index+")").each(function() {
      let value = parseFloat($(this).text().replace(/[,]/g,''));
      if (! isNaN(value)) {
        sum += value;
        max = (max == null || max < value)?value:max;
        min = (min == null || min > value)?value:min;
      }
      return;
    });
    let fraction_digits = 2;
    if ($(this).hasClass("int")) {
      fraction_digits = 0;
    }
    let value = "";
    if ($(this).hasClass("aggregate_sum")) {
      value = "&sum; "+sum.toLocaleString('en',{minimumFractionDigits: fraction_digits, maximumFractionDigits: fraction_digits});
    } else if ($(this).hasClass("aggregate_avg")) {
      value = "&empty; "+(sum/count).toLocaleString('en',{minimumFractionDigits: fraction_digits, maximumFractionDigits: fraction_digits});
    } else if ($(this).hasClass("aggregate_max")) {
      value = "max. "+parseFloat(max);
    } else if ($(this).hasClass("aggregate_min")) {
      value = "min. "+parseFloat(min);
    }
    if ($(this).hasClass("percentage")) {
      value += "%";
    }
    $(this).html(value);
  });
  return;
}


