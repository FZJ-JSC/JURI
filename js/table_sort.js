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

/**
 *   Based on:
 *       Willmaster Table Sort
 *       Version 1.1
 *       August 17, 2016
 *       Updated GetDateSortingKey() to correctly sort two-digit months and days numbers with leading 0.
 *       Version 1.0, July 3, 2011
 *
 *       Will Bontrager
 *       http://www.willmaster.com/
 *       Copyright 2011,2016 Will Bontrager Software, LLC
 *
 *       This software is provided "AS IS," without 
 *       any warranty of any kind, without even any 
 *       implied warranty such as merchantability 
 *       or fitness for a particular purpose.
 *       Will Bontrager Software, LLC grants 
 *       you a royalty free license to use or 
 *       modify this software provided this 
 *       notice appears on all copies.
 * @param {object} caller table header of column to be sorted
 * @param {string} type type of sorting to use ('N': number, 'D': standard date, 'D2' non-standard date, '': text)
 * @param {string} dateformat format for non-standard date (obsolete?)
 */
function sort_table(caller, type, dateformat) {
  // Getting type of sorting ('T'ext if not set)
  type = (typeof type !== 'undefined') ? type.toUpperCase() : "T";
  // Getting date format for date sorting (obsolete?)
  dateformat = (typeof dateformat !== 'undefined') ? dateformat : "";
  // Getting index of column to be sorted
  var sortColumn = $(caller).parent().children().index($(caller));
  // Direction (default: descending): if already is descending, change to ascending
  var direction = $(caller).hasClass("desc") ? "asc" : "desc";
  // Remove existing classes
  $(caller).parent().children().removeClass("asc").removeClass("desc");
  // Adding current class
  $(caller).addClass(direction);
  // Getting body of table to sort
  var tbody = $(caller).parents("table:first").children("tbody");
  // Getting all rows of table to sort
  var rows = tbody.children("tr");
  var arrayOfRows = new Array();
  for (var i = 0, len = rows.length; i < len; ++i) {
    arrayOfRows[i] = new Object();
    arrayOfRows[i].oldIndex = i;
    var celltext = rows.eq(i).children("td").eq(sortColumn).html()
               .replace(/<[^>]*>/g, "");
    if (type == 'D' || type == 'D2') {
      arrayOfRows[i].value = celltext;
    } else {
      var re = type == "N" ? /[^\.\-\+\d]/g : /[^a-zA-Z0-9]/g;
      arrayOfRows[i].value = celltext.replace(re, "").substring(0, 25)
        .toLowerCase();
    }
  }
  switch (type) {
    case "N": // number
      arrayOfRows.sort(CompareRowOfNumbers);
      break;
    case "D": // date (standard format)
      arrayOfRows.sort(CompareRowOfDates);
      break;
    case "D2": // date (non-standard format)
      arrayOfRows.sort(CompareRowOfDates2);
      break;
    default: //text
      arrayOfRows.sort(CompareRowOfText);
  }
  if (direction == "desc") {
    arrayOfRows.reverse();
  }
  var newTableBody = $("<tbody>");
  for (var i = 0, len = arrayOfRows.length; i < len; ++i) {
    newTableBody.append(rows[arrayOfRows[i].oldIndex]);
  }
  tbody.replaceWith(newTableBody);
  view.initial_data.sort = {
    colId: $(caller).text(),
    sort: direction,
  };
  view.setHash();
  // Default bootstrap table striping does not work for filtered tables.
  // Reapply manual stripes also after sorting, to avoid problem if the data was filtered before
  $(caller).parents("table:first").find("tbody tr:visible").each(function (index) {
    $(this).css("background-color", !!(index & 1) ? "rgba(0,0,0,.05)" : "rgba(0,0,0,0)");
  });
  return;
}

/* 
 * Checks any given inital sort information from the URL and simulates a click on the given column, 
 * to recreate the last sort ordering.
 */
function set_initial_sort() {
  if (view.initial_data.sort && Object.keys(view.initial_data.sort).length) {
    if($("#main_content > table").length){
      let element = $("th").filter(function () { return $(this).text().toLowerCase() == view.initial_data.sort.colId.toLowerCase(); }).first();
      if (view.initial_data.sort.sort) {
        element.addClass((view.initial_data.sort.sort == "asc") ? "desc" : "asc");
      }
      element.trigger("click");
    } else if (view.gridApi) {
      view.gridApi.applyColumnState({
        state: [{ 
                  colId: view.headerToName[view.clicked_page][view.initial_data.sort.colId], 
                  sort: view.initial_data.sort.sort 
                }],
        defaultState: { sort: null },
      });
    }
  }
}

/* Sort function, string comparision */
function CompareRowOfText(a, b) {
  let aval = a.value;
  let bval = b.value;
  return aval == bval ? 0 : (aval > bval ? 1 : -1);
}

/* Sort function, number comparision */
function CompareRowOfNumbers(a, b) {
  let aval = /\d/.test(a.value) ? parseFloat(a.value) : 0;
  let bval = /\d/.test(b.value) ? parseFloat(b.value) : 0;
  return aval == bval ? 0 : (aval > bval ? 1 : -1);
}

/* Sort function, takes care of date format YYYY-MM-DD[T]HH:mm[:ss] */
function CompareRowOfDates(a, b) {
  let date_values = a.value.match(/(.+?)[ T](.+)/);
  let aval = NaN;
  if (date_values) {
    aval = new Date(date_values[1] + "T" + date_values[2]);
  }
  date_values = b.value.match(/(.+?)[ T](.+)/);
  let bval = NaN;
  if (date_values) {
    bval = new Date(date_values[1] + "T" + date_values[2]);
  }
  return aval == bval ? 0 : (isNaN(bval) || aval > bval ? 1 : -1);
}

/* Sort function, takes care of date format DD.MM.YY[YY][ HH:mm:ss] */
function CompareRowOfDates2(a, b) {
  let values = a.value.match(/(.+?)(?:\s|$)(.+)?/);
  let aval = NaN;
  if (values) {
    let date_values = values[1].split(".");
    aval = new Date(((parseInt(date_values[2]) < 2000) ? parseInt(date_values[2]) + 2000 : date_values[2]) +
      "-" + date_values[1] + "-" + date_values[0] + ((typeof (values[2]) != "undefined") ? "T" + values[2] : ""));
  }
  values = b.value.match(/(.+?)(?:\s|$)(.+)?/);
  let bval = NaN;
  if (values) {
    let date_values = values[1].split(".");
    bval = new Date(((parseInt(date_values[2]) < 2000) ? parseInt(date_values[2]) + 2000 : date_values[2]) +
      "-" + date_values[1] + "-" + date_values[0] + ((typeof (values[2]) != "undefined") ? "T" + values[2] : ""));
  }
  return aval == bval ? 0 : (aval > bval ? 1 : -1);
}
