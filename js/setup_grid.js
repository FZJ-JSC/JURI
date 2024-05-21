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

function init_grid() {
  const gridOptions = {
    rowData: view.contexts[view.page_context],
    columnDefs: view.columnDefs,
    initialState: view.gridState??null, // Recovering state, if existing
    // perform a regular expression search
    quickFilterMatcher: (quickFilterParts, rowQuickFilterAggregateText) => {
      return quickFilterParts.every(part => rowQuickFilterAggregateText.match(part));
    },
    dataTypeDefinitions: {  // To redefine or define new types
      dateString: {         // Redefining the dateString type to recognize our type of dates
        baseDataType: "dateString",
        extendsDataType: "dateString",
        valueParser: (params) =>{
          return params.newValue != null && params.newValue.match("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}")
            ? params.newValue
            : null;
          },
        valueFormatter: (params) => {
          return params.value == null ? "" : params.value;
        },
        dataTypeMatcher: (value) => {
          return typeof value === "string" && !!value.match("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}");
        },
        dateParser: (value) => {
          const date = new Date(value)
          if (value == null || value === "") {
            return undefined;
          }
          return date;
        },
        dateFormatter: (value) => {
          if (value == null) {
            return undefined;
          }
          return value.toISOString().slice(0,-8).replace("T"," ");
        },
      },
      timeInterval: {         // Redefining the dateString type to recognize our type of dates
        baseDataType: "number",
        extendsDataType: "number",
        valueGetter: (params) => {
          if (params.newValue == null) {
            return null;
          }
          // convert from HHhMMm to minutes 
          const [ hours, min ] = params.newValue.trim().slice(0,-2).split('h');
          return hours*60+min;
        },
        valueParser: (params) => {
          if (params.newValue == null) {
            return null;
          }
          // convert from HHhMMm to minutes 
          const [ hours, min ] = params.newValue.trim().slice(0,-2).split('h');
          return hours*60+min;
        },
        valueFormatter: (params) => {
          return params.value == null ? "" : params.value;
        },
        dataTypeMatcher: (value) => {
          return typeof value === "string" && !! value.match("((\d+)h)?(\d+)m");
        },
      },
    },

    defaultColDef: {          // Default definitions for the columns
      sortable: true,                     // Allow sorting
      filter: 'agTextColumnFilter',       // Default filter by text
      resizable: true,                    // Allow resize of this column
      floatingFilter: true,               // Activate the floating filter
      suppressFloatingFilterButton: true, // Hide the filter button beside the floating filter
      suppressHeaderMenuButton:false,     // Show (false) or hide (true) the filter menu from the header
      cellClass: 'text-center',           // Default class of cells
      flex: 1,
      // cellClass: (params) => {
      //   var default_classes = 'text-center';
      //   default_classes += params.column.originalParent.colGroupDef.headerName? ` group_${params.column.originalParent.colGroupDef.headerName}` : "";
      //   return default_classes;
      // }

      // maxWidth: 400,                      // Maximum width of a cell
      // cellDataType: false,                // Avoid inferring cell data types
      // suppressMovable: true,              // Don't let columns to be reordered
      // cellStyle: {                        // Default cell style
      //   'height': '100%',
      //   'display': 'grid',
      //   'justify-content': 'center',
      //   'align-items': 'center ',
      //   'text-overflow': 'ellipsis',
      //   'white-space': 'nowrap',
      //   'overflow': 'hidden',
      //   // 'display': 'table-cell',
      //   // 'margin': 'auto',
      //   // 'text-align': 'center',
      //   // 'vertical-align': 'middle',
      // },
    },
    tooltipShowDelay: 0,                // Delay to show tooltip on mousehover over header (0 = no delay)
    enableCellTextSelection: true,      // Enable selection of cell contents
    ensureDomOrder: true,               // Make selection in the correct order
    autoSizeStrategy: {                 // Automatically resize cells...
      type: 'fitCellContents'           // ...to fit contents
    },
    // suppressColumnVirtualisation: true, // Supress column virtualisation to take into account non-visible columns in resizing columns, for example
    // suppressRowVirtualisation: true, // Supress row virtualisation to take into account non-visible rows in resizing columns, for example
    headerHeight: 25,                   // Height of header row
    floatingFiltersHeight: 25,          // Header of floating filter row
    rowHeight: 25,                      // Default height of rows
    rowSelection: 'single',             // Select the entire row when clicking (a single one is allowed to be selected)
    rowMultiSelectWithClick: true,      // Allow row de-selection
    onRowSelected: onRowSelected,       // Function to run when a row is selected
    onModelUpdated: onChange,           // To run when displayed rows have changed. Triggered after sort, filter or tree expand / collapse events.
    onVirtualColumnsChanged: onChange,  // To run when the list of rendered columns changed (only columns in the visible scrolled viewport are rendered by default).
    onColumnVisible: onChange,          // To run when a column, or group of columns, was hidden / shown.
    navigateToNextCell: navigateToNextCell, // To navigate using arrow keys
    onFilterChanged: onFilterChanged,   // To run after filtering 
    onSortChanged: onSortChanged,       // To run after sorting
    onColumnGroupOpened: onChange,      // A column group was opened / closed.
    // onGridReady: onGridReady,           // When the grid is ready
    // suppressCellFocus: true,         // Turn off cell focus (if turning on, can't move selection with arrows)
    // onSelectionChanged: onSelectionChanged, // Function to run when selected row has changed

    // rowClassRules: {           // It is also possible to apply rules for entire rows
    //   // apply red to Ford cars
    //   "rag-red": (params) => params.data.make === "Ford",
    // },
  }; // End gridOptions

  const gridDiv = document.querySelector("#myGrid");
  // Creating the grid
  view.gridApi = agGrid.createGrid(gridDiv, gridOptions);
  // Adding filter field, when it is not there
  if (!$('#filter > input').length) {
    let filter = $('<input>').attr('type',"text")
                             .attr('id',"filter-text-box") 
                             .attr('placeholder',"Filter")
                             .on('input',() => {onFilterTextBoxChanged(); return;})
    $('#filter').css('width',"150px")
                .append(filter)

  }

  // Getting headers
  view.getHeaders();

  // Adding a 'clear filter' for the given column
  clear_column_filter_link = $('<a>').css('display','flex')
                                     .attr('aria-label','Clear column filter')
                                     .attr('data-toggle','tooltip')
                                     .attr('data-original-title','Clear column filter')
                                     .attr('title','')
  clear_column_filter_link.click(function(e) {
                                  e.stopPropagation(); // Stopping the event to propagate to the sort
                                  // Gets the column Header from the sibling, transform to 'Name' and clear the filter of the specific column
                                  clear_filter(view.headerToName[$(this).siblings( ".ag-header-cell-text" ).text()])
                                });
  $('.ag-filter-icon').wrap(clear_column_filter_link);

  // view.gridApi.setColumnsVisible(view.gridApi.getColumnGroup('GPU').getLeafColumns(), false)
  // const colDefs = view.gridApi.getColumnDefs();
  // view.gridApi.setGridOption('columnDefs', colDefs);
  
  // add the data to the grid
  // view.gridApi.setGridOption('rowData', view.contexts[view.page_context]);  // Apply data to the grid
  // add_filter_placeholder();
  // view.gridApi.setGridOption('onFilterChanged', view.gridApi.autoSizeAllColumns(false));  // To run after filtering (doesn't seem to work)
  // view.gridApi.setGridOption('onSortChanged', view.gridApi.autoSizeAllColumns(false));    // To run after sorting (doesn't seem to work)
  // view.gridApi.setGridOption('onFilterChanged', onFilterChanged);  // To run after filtering 
  // view.gridApi.setGridOption('onSortChanged', onSortChanged);    // To run after sorting
  // view.gridApi.setGridOption('onModelUpdated', onChange);    // To run when displayed rows have changed. Triggered after sort, filter or tree expand / collapse events.
  // view.gridApi.setGridOption('onViewportChanged', onChange);    // Which rows are rendered in the DOM has changed.
  // view.gridApi.setGridOption('onVirtualColumnsChanged', () => {onChange(); return;} );    // To run when the list of rendered columns changed (only columns in the visible scrolled viewport are rendered by default).
  // view.gridApi.setGridOption('onBodyScrollEnd', onChange);    // To run row Data has changed 
  // view.gridApi.setGridOption('onGridReady', onGridReady);    // When grid is ready
}

function navigateToNextCell(params) {
  var suggestedNextCell = params.nextCellPosition;

  var KEY_UP = "ArrowUp";
  var KEY_DOWN = "ArrowDown";

  var noUpOrDownKey = params.key !== KEY_DOWN && params.key !== KEY_UP;
  if (noUpOrDownKey || !suggestedNextCell) {
    return suggestedNextCell;
  }

  const nodeToSelect = params.api.getDisplayedRowAtIndex(
    suggestedNextCell.rowIndex,
  );
  if (nodeToSelect) {
    nodeToSelect.setSelected(true);
  }

  return suggestedNextCell;
}

function get_filter_string(value) {
  let filter;
  if (value.type == 'greaterThan') {
    filter = `>${value.filter.toString()}`
  } else if (value.type == 'lessThan') {
    filter = `<${value.filter.toString()}`
  } else if (value.type == 'inRange') {
    filter = `${value.filter.toString()}-${value.filterTo.toString()}`
  } else {
    filter = `${value.filter.toString()}`
  }
  return filter;
}

function onFilterChanged(event) {
  view.inital_data.filter = {}
  Object.entries(view.gridApi.getFilterModel()).forEach(([key,value]) => {
    let filter;
    if (value.operator) {
      filter = value.conditions.map((cond) => get_filter_string(cond)).join(value.operator=="AND"?'&&':'||');      
    } else {
      filter = get_filter_string(value);
    }

    view.inital_data.filter[view.nameToHeader[key]] = filter;
  })
  view.setHash();
  update_values();
}

function onSortChanged(event) {
  view.inital_data.sort = event.columns.filter(function (s) {
                              return s.sort != null;
                            }).map(function (s) {
                              return { colId: view.nameToHeader[s.colId], sort: s.sort };
                            })[0];
  view.setHash();
}


function onRowSelected(event) {
  // For the selected row (the one that is de-selected also throws an event with event.node.isSelected()=false)
  if (event.node.isSelected()) {
    // Getting the parameter values for each column in the form of {headerName: value} for the current row
    const params = {};
    Object.keys(event.node.data).forEach( (key) => {
      const column = view.gridApi.getColumn(key);
      if (!column) return;
      params[view.gridApi.getDisplayNameForColumn(column)] = event.node.data[key]
    })
    view.footer_graph.apply_data(params)
  }
}

/* Function for quickfilter */
function onFilterTextBoxChanged() {
  view.gridApi.setGridOption(
                              "quickFilterText",
                              document.getElementById("filter-text-box").value,
                            );
}

function add_filter_placeholder() {
  Array.from(document.getElementsByClassName('ag-input-field-input')).forEach((obj) => {
    if (obj.attributes['disabled']) { // skip columns with disabled filter
      return;
    }
    obj.setAttribute('placeholder', 'Filter');
  });
}

function onChange() {
  view.gridApi.autoSizeAllColumns(false);
  // If only one row is shown, select it
  if (view.gridApi.getDisplayedRowCount() == 1) {
    view.gridApi.setNodesSelected({ nodes: [view.gridApi.getDisplayedRowAtIndex(0)], newValue: true });
  }
  let selected = view.gridApi.getSelectedNodes()[0]
  if (selected) {
    view.gridApi.ensureIndexVisible(selected.rowIndex,'middle');
  }
}


let numberFilterParams = {
  debounceMs: 2000,
  allowedCharPattern: "\\d><\\-\\.",
  // numberParser: (text) => {
  //   return text == null
  //     ? null
  //     : parseFloat(text.replace(",", ".").replace("$", ""));
  // },
  // numberFormatter: (value) => {
  //   return value == null ? null : value.toString().replace(".", ",");
  // },
};

// autoSizeAll() {
//   const allColumnIds = view.gridApi.getAllColumns().map((column) => column.getColId());
//   this.gridColumnApi.autoSizeColumns(allColumnIds);
// }


/**
 * Class that defines the number floating filter
 * Updated from https://www.ag-grid.com/javascript-data-grid/component-floating-filter/
 * It can use '>(number)', '<(number)' or '(number)-(number)' (for InRange)
 * 
 */

class NumberFloatingFilterComponent {
  init(params) {
    // Creating the eGUI as in a regular Number filter
    this.eGui = $('<div>').addClass('ag-floating-filter-input')
                          .attr('role', 'presentation')
                          .attr('ref', 'eFloatingFilterInputContainer');
    let div = $('<div>').attr('role','presentation')
                                  .addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field')
    let eLabel = $('<div>').attr('ref','eLabel')
                            .addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label')
                            .attr('aria-hidden',"true")
                            .attr('role','presentation')
    let eWrapper = $('<div>').attr('ref','eWrapper')
                              .addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper')
                              .attr('role','presentation')
    let input = $('<input>').attr('ref','eInput')
                            .addClass('ag-input-field-input ag-text-field-input')
                            .attr('type','text')
                            .attr('tabindex','0')
    eWrapper.append(input)
    div.append(eLabel).append(eWrapper)
    this.eGui.append(div)
    this.currentValue = null;
    // Selecting the DOM input of the floating filter
    this.eFilterInput = this.eGui.find('input')[0];
    this.config = params.filterParams

    // Disallow character pattern (to allow only digits or '>'/'<')
    if (this.config.allowedCharPattern) {
      this.preventDisallowedCharacters();
    }

    const onInputBoxChanged = () => {
      if (this.eFilterInput.value === '') {
        // Remove the filter
        params.parentFilterInstance(instance => {
            instance.onFloatingFilterChanged(null, null);
        });
        return;
      }
      // Deal with the separate cases (>, < or equal) separately
      if (this.eFilterInput.value.startsWith('>')) {
        // Storing original value to recover at the end (as onFloatingFilterChanged changes the value to the number)
        let original = this.eFilterInput.value
        let number = this.eFilterInput.value.slice(1)
        // If what is left after removing the > is not a number, do nothing
        if (!number.match(/^\d*\.?\d*$/)) {return;}
        // Getting the number
        this.currentValue = Number(number);
        // Applying the filter with 'greaterThan' option
        params.parentFilterInstance(instance => {
          instance.onFloatingFilterChanged('greaterThan', this.currentValue);
          // Rewriting the original value with '>' sign
          this.eFilterInput.value = original
          // Storing the values on the URL by applying the function onFilterChanged
          onFilterChanged()
        });  
      } else if (this.eFilterInput.value.startsWith('<')) {
        // Storing original value to recover at the end (as onFloatingFilterChanged changes the value to the number)
        let original = this.eFilterInput.value
        let number = this.eFilterInput.value.slice(1)
        // If what is left after removing the > is not a number, do nothing
        if (!number.match(/^\d*\.?\d*$/)) {return;}
        // Getting the number
        this.currentValue = Number(number);
        // Applying the filter with 'lessThan' option
        params.parentFilterInstance(instance => {
          instance.onFloatingFilterChanged('lessThan', this.currentValue);
          // Rewriting the original value with '>' sign
          this.eFilterInput.value = original
          // Storing the values on the URL by applying the function onFilterChanged
          onFilterChanged()
        });  
      } else if (this.eFilterInput.value.includes('-')) {
        // Storing original value to recover at the end (as onFloatingFilterChanged changes the value to the number)
        let original = this.eFilterInput.value
        let [from, to] = this.eFilterInput.value.split('-')
        if (!from || !to) {return;}
        params.parentFilterInstance(instance => {
          // instance.onFloatingFilterChanged('equals', this.currentValue);
          instance.setTypeFromFloatingFilter('inRange');
          instance.eValuesFrom[0].setValue(Number(from));
          instance.eValuesTo[0].setValue(Number(to));
          instance.onUiChanged(true);
          // Rewriting the original value with '>' sign
          this.eFilterInput.value = original
          // Storing the values on the URL by applying the function onFilterChanged
          onFilterChanged()
        });
      } else {
        this.currentValue = Number(this.eFilterInput.value);
        params.parentFilterInstance(instance => {
          instance.onFloatingFilterChanged('equals', this.currentValue);
        });
      }
    }
    this.eFilterInput.addEventListener('input', onInputBoxChanged);
  }

  onParentModelChanged(parentModel) {
    // When the filter is empty we will receive a null message here
    this.eFilterInput.disabled = false;
    if (!parentModel) {
      this.eFilterInput.value = '';
    } else {
      if (parentModel.operator) { // Multiple conditions
        // Setting the text into the input
        this.eFilterInput.value = parentModel.conditions.map((cond) => get_filter_string(cond)).join(` ${parentModel.operator} `);
        // Disabling input of filter when there are multiple conditions
        this.eFilterInput.disabled = true;
      } else { // Single condition
        // Setting the text into the input
        this.eFilterInput.value = get_filter_string(parentModel);
        // Re-enabling input filter when there are no multiple conditions
      }
    }
  }

  getGui() {
    return this.eGui[0];
  }
  
  preventDisallowedCharacters() {
    const pattern = new RegExp(`[${this.config.allowedCharPattern}]`);

    function isEventFromPrintableCharacter(event)  {
      if (!(event instanceof KeyboardEvent)) { return false; }

      // no allowed printable chars have alt or ctrl key combinations
      if (event.altKey || event.ctrlKey || event.metaKey) { return false; }
  
      // if key is length 1, eg if it is 'a' for the a key, or '2' for the '2' key.
      // non-printable characters have names, eg 'Enter' or 'Backspace'.
      const printableCharacter = event.key.length === 1;
  
      return printableCharacter;
    }

    const preventCharacters = (event) => {
      if (!(event instanceof KeyboardEvent)) { return; }
      if (!isEventFromPrintableCharacter(event)) { return; }

      if (event.key && !pattern.test(event.key)) {
        event.preventDefault();
      }
    };

    this.eFilterInput.addEventListener('keydown', preventCharacters);

    this.eFilterInput.addEventListener('paste', (e) => {
      if (!(e instanceof ClipboardEvent)) { return; }
      const text = e.clipboardData?.getData('text');

      if (text && text.split('').some((c) => {if (c instanceof string) !pattern.test(c)})) {
        e.preventDefault();
      }
    });
  }
}