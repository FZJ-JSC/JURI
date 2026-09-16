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

  // A unique state key is generated combining page and subpage
  let stateKey = view.clicked_subpage ? `${view.clicked_page}_${view.clicked_subpage}` : view.clicked_page;

  /**
   * The Balham theme is configured here using the Theming API (starting on ag-grid v35).
   * CSS variable references are passed as strings so custom palette
   * variables defined elsewhere in the application are respected.
   * The --ag-header-foreground-color property is renamed headerTextColor
   * in the new API 
   * (see: https://www.ag-grid.com/javascript-data-grid/theming-migration/#properties-with-a-direct-replacement).
   */
  const myTheme = agGrid.themeBalham.withParams({
    cellHorizontalPadding: 1,
    headerTextColor: 'white',
    headerBackgroundColor: 'var(--fzj-color-blue)',
    selectedRowBackgroundColor: 'var(--fzj-color-yellow)',
    oddRowBackgroundColor: 'var(--fzj-color-gray)',
    headerRowBorder: { style: 'solid', width: 1, color: 'var(--fzj-color-gray)' },
    headerColumnBorder: { style: 'solid', width: 1, color: 'var(--fzj-color-gray)' },
    pinnedColumnBorder: { style: 'solid', width: 1, color: 'var(--fzj-color-gray)' },
  });

  const gridOptions = {
    theme: myTheme,
    // columnMenu: 'legacy',
    rowData: view.contexts[view.page_context],
    columnDefs: view.columnDefs,
    initialState: view.gridState[stateKey] ?? null, // Recovering state uniquely per tab, if existing
    // Registering filter components
    components: {
      DateTimeParentFilter: DateTimeParentFilter,
      DateFloatingFilterComponent: DateFloatingFilterComponent,
      TimeIntervalParentFilter: TimeIntervalParentFilter,
      TimeIntervalFloatingFilterComponent: TimeIntervalFloatingFilterComponent
    },
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
          if (value == null || value === "") {
            return undefined;
          }
          // Standardize string to ISO format (replacing space with T) 
          // so the native new Date() parser never fails across different browsers
          return new Date(value.replace(' ', 'T'));
        },
        dateFormatter: (value) => {
          if (value == null) {
            return undefined;
          }
          return value.toLocaleString('sv-SE');
        },
      },
      timeInterval: {
        baseDataType: "number",
        extendsDataType: "number",
        
        // Formats the cell UI automatically
        valueFormatter: (params) => hhmm_short(params),
        
        // Parses edits back to seconds
        valueParser: (params) => {
          return params.newValue != null ? parseTimeToSeconds(params.newValue) : null;
        },
        
        // Tells ag-Grid this is numerical data
        // dataTypeMatcher: (value) => typeof value === "number",
      }
    },

    defaultColDef: {          // Default definitions for the columns
      sortable: true,                     // Allow sorting
      sortingOrder: ['desc', 'asc', null],// Change sorting order, since 'desc' is probably more useful
      filter: 'agTextColumnFilter',       // Default filter by text
      resizable: true,                    // Allow resize of this column
      floatingFilter: true,               // Activate the floating filter
      // Ensures the menu icon natively resides in the header instead of beside the floating text box
      suppressFloatingFilterButton: true, 
      suppressHeaderMenuButton: false,    
      cellClass: 'text-center',           // Default class of cells
      flex: 1,                            // Set flex cells that will fill the space
      filterParams: {
        maxNumConditions: 3,
      }
      // minWidth: 50,
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

    // NOTE: The autoSizeStrategy is commented out, as it was "overwriting" the manual resizing done in resizeGrid()
    // autoSizeStrategy: {                 // Automatically resize cells...
    //   type: 'fitCellContents'           // ...to fit contents
    //   // type: 'fitGridWidth',           // ...to fit GridWidth
    //   // defaultMinWidth: 100
    // },

    // suppressColumnVirtualisation: true,  // Supress column virtualisation to take into account non-visible columns in resizing columns, for example
    // suppressRowVirtualisation: true,     // Supress row virtualisation to take into account non-visible rows in resizing columns, for example
    headerHeight: 25,                       // Height of header row
    floatingFiltersHeight: 25,              // Header of floating filter row
    rowHeight: 25,                          // Default height of rows
    rowSelection: { 
      mode: 'singleRow',                    // Select the entire row when clicking (a single one is allowed to be selected)
      enableClickSelection: view.footer_graph_config?true:false, // Enable row selection when there's a footer
      enableSelectionWithoutKeys: true,     // Allow row de-selection
      checkboxes: false,                    // Configure where checkboxes are displayed.
    },
    onRowSelected: onRowSelected,           // Function to run when a row is selected
    onModelUpdated: onChange,               // To run when displayed rows have changed. Triggered after sort, filter or tree expand / collapse events.
    navigateToNextCell: navigateToNextCell, // To navigate using arrow keys
    onFilterChanged: onFilterChanged,       // To run after filtering 
    onSortChanged: onSortChanged,           // To run after sorting
    onVirtualColumnsChanged: onStateUpdated,// To run when the list of rendered columns changed (only columns in the visible scrolled viewport are rendered by default).
    onColumnVisible: onStateUpdated,        // To run when a column, or group of columns, was hidden / shown.
    onColumnGroupOpened: resizeGrid,        // A column group was opened / closed.
    onFirstDataRendered: onFirstData,       // Fired the first time data is rendered into the grid. 
    // onGridReady: onGridReady,            // When the grid is ready
    onStateUpdated: onStateUpdated,         // Grid state has been updated.
    // onRowDataUpdated: onGridReady,
    // suppressCellFocus: true,             // Turn off cell focus (if turning on, can't move selection with arrows)
    // onSelectionChanged: onSelectionChanged, // Function to run when selected row has changed

    // rowClassRules: {           // It is also possible to apply rules for entire rows
    //   // apply red to Ford cars
    //   "rag-red": (params) => params.data.make === "Ford",
    // },
  }; // End gridOptions

  // Getting the Grid element and emptying it before creating a new one
  const gridDiv = $("#myGrid");
  // Creating the grid
  view.gridApi = agGrid.createGrid(gridDiv[0], gridOptions);

  // Getting headers
  view.getHeaders();

  // Adding filter field, when it is not there
  if (!$('#filter > input').length) {
    let filter = $('<div>')
        .attr('id',"filter")
        .addClass('filter')
        .width(230)                    
    let filter_input = $('<input>').attr('type',"text")
                             .attr('id',"filter-text-box") 
                             .attr('placeholder',"Filter")
                             .on('input',() => {onFilterTextBoxChanged(); return;})
    filter.append(filter_input)
    $('#filter_container').append(filter)
    // Adding initial value obtained from URL, when present
    if (view.initial_data.quickfilter) {
      $("#filter-text-box").val(view.initial_data.quickfilter)
    }

    // Parse filter options to add possible dates
    view.page_data.options = parseOptions(view.page_data.options)
    // Add button for options
    view.add_filter_options($('#filter'),view.page_data.options);

  }

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

// function onGridReady(event) {
//   resizeGrid()
// }


// Add a timer variable right above the function
let resizeDebounceTimer = null;
/**
 * Handles grid state updates such as scrolling, column visibility changes, and data loading.
 * Always ensures custom DOM elements (like clear buttons) are synced with the virtualized grid.
 * 
 * @param {Object} event - The ag-Grid event object containing the source of the update.
 * @returns {void}
 */
function onStateUpdated(event) {
  // Column virtualization destroys and recreates DOM elements on scroll.
  // We must always re-inject and sync the clear buttons when the DOM updates.
  init_floating_filter_clear_buttons();
  update_floating_filter_clear_buttons();

  // Ignore manual column resizing and filtering. 
  // If the user is manually dragging a column width, we don't want to fight them and auto-resize it.
  if (event && Array.isArray(event.sources) && ['filter', 'columnSizing'].includes(event.sources[0])) {
    return;
  }

  // Ensuring resizeGrid() only fires once the user has stopped scrolling for 50 milliseconds
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(() => {
    resizeGrid();
  }, 50);
}

/**
 * Resize Grid according to the number of columns and window width
 */
function resizeGrid() {
  if(!view.gridApi) return
  // console.log('resize1',(new Error()).stack?.split("\n")[1]?.trim().split(" ")[1]) 
  let content_width = $('#main_content').width();
  let num_displayed_cols = view.gridApi.getAllDisplayedColumns().length;
  if ((num_displayed_cols*93 > content_width)) {
    view.gridApi.autoSizeAllColumns(false);
  } else {
    view.gridApi.sizeColumnsToFit();
    // view.gridApi.sizeColumnsToFit({defaultMinWidth: content_width/num_displayed_cols});
  }
  init_floating_filter_clear_buttons();
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
  if (value.rawUserInput) {
    return value.rawUserInput;
  }

  let filter;
  if (value.filterType == 'date') {
    filter = `${value.dateFrom??""}${(value.dateFrom&&value.dateTo)?'-':''}${value.dateTo??""}`;
  } else {
    if (value.type == 'greaterThan') {
      filter = `>${value.filter.toString()}`;
    } else if (value.type == 'greaterThanOrEqual') {
      filter = `>=${value.filter.toString()}`;
    } else if (value.type == 'lessThan') {
      filter = `<${value.filter.toString()}`;
    } else if (value.type == 'lessThanOrEqual') {
      filter = `<=${value.filter.toString()}`;
    } else if (value.type == 'inRange') {
      filter = `${value.filter.toString()}-${value.filterTo.toString()}`;
    } else if (value.type == 'blank') {
      filter = 'blank';
    } else if (value.type == 'notBlank') {
      filter = 'notBlank';
    } else {
      // Fallback: guard against undefined filter value for any unexpected type
      filter = value.filter != null ? value.filter.toString() : '';
    }
  }
  return filter;
}


function onFilterChanged(event) {
  update_floating_filter_clear_buttons();

  if (!view.initial_data) {
    return;
  }

  view.initial_data.filter = {}
  Object.entries(view.gridApi.getFilterModel()).forEach(([key,value]) => {
    let filter;
    if (value.operator) {
      filter = value.conditions.map((cond) => get_filter_string(cond)).join(value.operator=="AND"?'&&':'||');      
    } else {
      filter = get_filter_string(value);
    }

    view.initial_data.filter[view.nameToHeader[view.clicked_page][key]] = filter;
  })
  view.setHash();
  update_values();
}

function onSortChanged(event) {
  if (!view.gridApi) return;

  // Query the grid API directly to get the current state of all columns
  let sortedCols = view.gridApi.getColumnState().filter(function(s) {
    return s.sort != null;
  });

  if (sortedCols.length > 0) {
    // Map the internal column ID back to your human-readable header name
    let headerName = view.nameToHeader[view.clicked_page][sortedCols[0].colId];
    
    // Fallback just in case the mapping isn't found
    if (!headerName) headerName = sortedCols[0].colId;

    view.initial_data.sort = { 
      colId: headerName, 
      sort: sortedCols[0].sort 
    };
  } else {
    // If the user clicks until the sort is removed, clear it from the URL
    delete view.initial_data.sort;
  }

  view.setHash();
}


function onRowSelected(event) {
  if (view.footer_graph === null) return;
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
  let text = $("#filter-text-box").val()
  view.gridApi.setGridOption(
                              "quickFilterText",
                              text,
                            );
  view.initial_data.quickfilter = text;
  view.setHash();
}

function add_filter_placeholder() {
  Array.from(document.getElementsByClassName('ag-input-field-input')).forEach((obj) => {
    if (obj.attributes['disabled']) { // skip columns with disabled filter
      return;
    }
    obj.setAttribute('placeholder', 'Filter');
  });
}

/**
 * An × button is injected into each floating filter cell so active filters
 * can be cleared without opening the filter popup. Columns that already
 * have a button are skipped so the function is safe to call repeatedly.
 */
function init_floating_filter_clear_buttons() {
  // Clean up orphaned tooltips left in the body by AG Grid virtualization
  // This breaks any memory leak chain.
  $('.tooltip').each(function() {
    let tooltipId = $(this).attr('id');
    // If the grid deleted the button, the 'aria-describedby' link is gone
    if (tooltipId && $(`[aria-describedby="${tooltipId}"]`).length === 0) {
      $(this).remove(); // Safely delete the orphaned DOM node
    }
  });

  $('.ag-floating-filter').each(function() {
    let container = $(this).find('.ag-floating-filter-input');
    if (!container.length || container.find('.floating-filter-clear-btn').length > 0) return;

    let colId = $(this).attr('col-id');
    let btn = $('<button>')
      .addClass('floating-filter-clear-btn')
      .attr('aria-label', 'Clear filter')
      .attr('data-toggle', 'tooltip')
      .attr('data-placement', 'bottom')
      .attr('data-original-title', 'Clear filter')
      .html('&times;');

    btn[0].addEventListener('click', function(e) {
      e.stopPropagation();
      
      // 'dispose' completely destroys the tooltip instance immediately, freeing memory.
      $(this).tooltip('dispose'); 

      view.gridApi.setColumnFilterModel(colId, null).then(() => {
        view.gridApi.onFilterChanged();
      });
    });

    // The button is appended before tooltip init so Bootstrap reads the correct DOM state
    $(this).append(btn);
    
    // Enable the Bootstrap tooltip
    btn.tooltip({ container: 'body' });
  });
}

/**
 * The × button visibility is synced with the current filter model.
 * Columns with an active filter show the button; others hide it.
 */
function update_floating_filter_clear_buttons() {
  let filterModel = view.gridApi.getFilterModel();
  $('.ag-floating-filter').each(function() {
    let colId = $(this).attr('col-id');
    $(this).find('.floating-filter-clear-btn').toggleClass('is-active', !!filterModel[colId]);
  });
}

/**
 * Fired the first time data is rendered into the grid.
 * Initializes the custom floating filter buttons and syncs their active visibility state.
 * 
 * @returns {void}
 */
function onFirstData() {
  init_floating_filter_clear_buttons();
  update_floating_filter_clear_buttons();
}

function onChange(event) {
  if (!view.gridApi) {
    return;
  }
  // If there's a footer and only one row is shown, select it
  if ((view.footer_graph !== null)&&(view.gridApi.getDisplayedRowCount() == 1)) {
    view.gridApi.setNodesSelected({ nodes: [view.gridApi.getDisplayedRowAtIndex(0)], newValue: true });
  }
  let selected = view.gridApi.getSelectedNodes()[0]
  if (selected && selected.displayed) {
    view.gridApi.ensureIndexVisible(selected.rowIndex,'middle');
  }
}


let numberFilterParams = {
  debounceMs: 2000,
  allowedCharPattern: "\\d><\\-\\.",
  // A custom 'contains' option is injected into the native number filter,
  // allowing partial text matching on numerical data.
  filterOptions: [
    'equals', 'notEqual', 'lessThan', 'lessThanOrEqual', 
    'greaterThan', 'greaterThanOrEqual', 'inRange', 'blank', 'notBlank',
    {
      displayKey: 'contains',
      displayName: 'Contains',
      predicate: ([filterValue], cellValue) => {
        if (cellValue == null || filterValue == null) return false;
        // Both values are evaluated as strings to support partial pattern matching
        return cellValue.toString().includes(filterValue.toString());
      }
    }
  ]
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
let uniqueIdCounter = 0; // Counter to create unique custom filters
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
                            .attr('id',`ag-custom-${uniqueIdCounter++}-input`)
                            .attr('aria-label',`${params.column.colDef.headerName} Filter Input`)
                            .attr('autocomplete','off')
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
      // Deal with the separate cases (>=, <=, >, <, - or equal) separately
      if (this.eFilterInput.value.startsWith('>=')) {
        let original = this.eFilterInput.value;
        let number = this.eFilterInput.value.slice(2);
        if (!number.match(/^\d*\.?\d*$/)) return;
        this.currentValue = Number(number);
        params.parentFilterInstance(instance => {
          instance.onFloatingFilterChanged('greaterThanOrEqual', this.currentValue);
          this.eFilterInput.value = original;
        });  
      } else if (this.eFilterInput.value.startsWith('<=')) {
        let original = this.eFilterInput.value;
        let number = this.eFilterInput.value.slice(2);
        if (!number.match(/^\d*\.?\d*$/)) return;
        this.currentValue = Number(number);
        params.parentFilterInstance(instance => {
          instance.onFloatingFilterChanged('lessThanOrEqual', this.currentValue);
          this.eFilterInput.value = original;
        });  
      } else if (this.eFilterInput.value.startsWith('>')) {
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
        });  
      } else if (this.eFilterInput.value.includes(' - ')) {
        let original = this.eFilterInput.value;
        let [from, to] = this.eFilterInput.value.split(' - '); // Prevents breaking on negative numbers like -5
        
        if (!from || !to) return;
        
        params.parentFilterInstance(instance => {
          instance.setModel({
            filterType: 'number',
            type: 'inRange',
            filter: Number(from),
            filterTo: Number(to)
          });
          params.api.onFilterChanged();
          
          this.eFilterInput.value = original;
        });
      } else {
        this.currentValue = Number(this.eFilterInput.value);
        params.parentFilterInstance(instance => {
          instance.onFloatingFilterChanged('contains', this.currentValue);
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
      return;
    }
    if (parentModel.operator) { // Multiple conditions
      // Setting the text into the input
      this.eFilterInput.value = parentModel.conditions
        .map((cond) => get_filter_string(cond))
        .join(` ${parentModel.operator} `);
      // Disabling input of filter when there are multiple conditions
      this.eFilterInput.disabled = true;
    } else { // Single condition
      // Setting the text into the input
      this.eFilterInput.value = get_filter_string(parentModel);
      // Re-enabling input filter when there are no multiple conditions
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

      if (text && text.split('').some(c => !pattern.test(c))) {
        e.preventDefault();
      }
    });
  }
}


/**
 * Class DateTimeParentFilter
 * 
 * ag-Grid's native date filter explicitly destroys exact times.
 * This custom filter engine replaces the native filter entirely so 
 * timestamps can be strictly compared down to the second. A native-looking UI 
 * is rendered in the hamburger menu, utilizing exact ag-Grid DOM structures 
 * to inherit the active theme perfectly.
 */
class DateTimeParentFilter {
  /**
   * Initializes the filter configuration.
   * 
   * @param {Object} params - The ag-Grid filter params configuration object.
   * @returns {void}
   */
  init(params) {
    this.params = params;
    this.filterModel = null;
    this.buildGui();
  }

  /**
   * Constructs the native-looking filter menu utilizing ag-Grid markup.
   * Dynamic condition blocks are generated natively without hardcoded CSS.
   * 
   * @returns {void}
   */
  buildGui() {
    this.eGui = $('<form>').addClass('ag-filter-wrapper ag-focus-managed')[0];
    
    // The main wrapper is established leveraging native ag-Grid class hierarchies
    let bodyWrapper = $('<div>').addClass('ag-filter-body-wrapper ag-simple-filter-body-wrapper ag-focus-managed');
    const filterParams = this.params.filterParams || this.params.colDef?.filterParams || {};
    this.maxConditions = filterParams.maxNumConditions || 3;
    this.globalOperator = 'AND';

    this.conditionBlocks = [];
    this.joinOperators = [];
    this.currentTypes = [];
    this.eSelects = [];       
    this.eInput1s = [];
    this.eInput2s = [];
    this.eInput2Containers = [];

    // The ephemeral popup dropdown is spawned with strict structural definitions
    this.ePopup = $('<div>').addClass('ag-popup').css({ display: 'none' })[0];
    this.eList = $('<div>').addClass('ag-list ag-select-list ag-ltr ag-popup-child ag-popup-positioned-under')
                           .attr('role', 'listbox').css({
                             position: 'fixed', 
                             background: 'var(--ag-menu-background-color, var(--ag-background-color, #ffffff))',
                             border: '1px solid var(--ag-border-color, #babfc7)',
                             boxShadow: 'var(--ag-popup-shadow, 0 1px 4px rgba(0,0,0,0.2))',
                             borderRadius: 'var(--ag-border-radius, 4px)',
                             maxHeight: '250px', overflowY: 'auto', zIndex: 999999
                           })[0];
    $(this.ePopup).append(this.eList);

    $(this.ePopup).on('mousedown mouseup click touchstart', (e) => {
      e.stopPropagation();
    });

    this.options = {
      'contains': 'Contains',
      'equals': 'Equals',
      'notEqual': 'Does not equal',
      'greaterThan': 'Greater Than',
      'greaterThanOrEqual': 'Greater Than or Equal',
      'lessThan': 'Less Than',
      'lessThanOrEqual': 'Less Than or Equal',
      'inRange': 'In Range'
    };

    let activeSelectIndex = 0;

    const populateList = (index) => {
      $(this.eList).empty();
      Object.entries(this.options).forEach(([val, label]) => {
        let item = $('<div>').addClass('ag-list-item ag-select-list-item').attr('role', 'option')
                             .html(`<span>${label}</span>`)
                             .css({ cursor: 'pointer', padding: '6px 12px' });
        item.on('click', (e) => {
          e.stopPropagation();
          this.currentTypes[index] = val;
          $(this.conditionBlocks[index].displayField).text(label);
          $(this.ePopup).hide();
          this.conditionBlocks[index].selectWrapper.removeClass('ag-picker-expanded').addClass('ag-picker-collapsed').attr('aria-expanded', 'false');
          this.onChange();
        });
        item.on('mouseenter', () => item.css('background-color', 'var(--ag-menu-option-active-background-color, var(--ag-row-hover-color, rgba(0,0,0,0.05)))'));
        item.on('mouseleave', () => item.css('background-color', 'transparent'));
        $(this.eList).append(item);
      });
    };

    // Filter structures are injected sequentially per the defined limits
    for (let i = 0; i < this.maxConditions; i++) {
      this.currentTypes.push('equals');
      
      let joinOperatorContainer = null;

      // Operator radio nodes are cleanly mapped matching native component signatures
      if (i > 0) {
        joinOperatorContainer = $('<div>').addClass('ag-filter-condition');
        
        let buildRadio = (val, labelStr) => {
          let radioClass = `ag-filter-condition-operator-${val.toLowerCase()}`;
          let radioContainer = $('<div>').addClass(`ag-labeled ag-label-align-right ag-radio-button ag-input-field ag-filter-condition-operator ${radioClass}`).attr('role', 'presentation');
          let label = $('<div>').addClass('ag-input-field-label ag-label ag-radio-button-label').text(labelStr);
          let wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-radio-button-input-wrapper');
          let input = $('<input>').attr('type', 'radio').attr('name', `ag-simple-filter-and-or-${this.params.column.getColId()}-${i}`).val(val).addClass('ag-input-field-input ag-radio-button-input');
          
          if (i > 1) {
             radioContainer.addClass('ag-disabled');
             wrapper.addClass('ag-disabled');
             input.prop('disabled', true);
          }
          
          wrapper.append(input);
          radioContainer.append(label, wrapper);

          input.on('change', () => {
             if (i === 1) { 
                this.globalOperator = val;
                this.onChange();
             }
          });

          return { container: radioContainer, input: input, wrapper: wrapper };
        };

        let andRadio = buildRadio('AND', 'AND');
        let orRadio = buildRadio('OR', 'OR');
        
        joinOperatorContainer.append(andRadio.container, orRadio.container);
        this.joinOperators.push({ and: andRadio, or: orRadio, container: joinOperatorContainer });
        
        joinOperatorContainer.hide();
        bodyWrapper.append(joinOperatorContainer);
      }

      let selectContainer = $('<div>').addClass('ag-picker-field ag-labeled ag-label-align-left ag-select ag-filter-select').attr('role', 'presentation');
      let selectLabel = $('<div>').addClass('ag-label ag-hidden').attr('aria-hidden', 'true').attr('role', 'presentation');
      
      // Native picker variables and layout parameters are matched identically
      let selectWrapper = $('<div>').addClass('ag-wrapper ag-picker-field-wrapper ag-picker-collapsed ag-has-popup-positioned-under')
                                     .attr('tabindex', '0').attr('role', 'combobox').attr('aria-expanded', 'false')
                                     .css({
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'space-between',
                                       width: '100%',
                                       minHeight: 'max(var(--ag-list-item-height, 22px), calc(var(--ag-spacing, 4px) * 4))',
                                       boxSizing: 'border-box',
                                       cursor: 'pointer',
                                       border: 'var(--ag-picker-button-border, solid var(--ag-border-width, 1px) var(--ag-border-color, #babfc7))',
                                       borderRadius: 'var(--ag-border-radius, 5px)',
                                       backgroundColor: 'var(--ag-picker-button-background-color, var(--ag-background-color, #ffffff))',
                                       paddingLeft: 'var(--ag-spacing, 4px)',
                                       paddingRight: 'var(--ag-spacing, 4px)',
                                     });
      
      let displayField = $('<div>').addClass('ag-picker-field-display').text('Equals');
      let icon = $('<div>').addClass('ag-picker-field-icon').attr('aria-hidden', 'true')
                           .html('<span class="ag-icon ag-icon-small-down" unselectable="on" role="presentation"></span>');

      selectWrapper.append(displayField, icon);
      selectContainer.append(selectLabel, selectWrapper);

      selectWrapper.on('click', (e) => {
        e.stopPropagation();
        let isExpanded = selectWrapper.hasClass('ag-picker-expanded');
        
        if (isExpanded) {
          $(this.ePopup).hide();
          selectWrapper.removeClass('ag-picker-expanded').addClass('ag-picker-collapsed').attr('aria-expanded', 'false');
        } else {
          this.conditionBlocks.forEach(b => b.selectWrapper.removeClass('ag-picker-expanded').addClass('ag-picker-collapsed').attr('aria-expanded', 'false'));
          
          activeSelectIndex = i;
          populateList(i);

          if (!this.ePopup.parentNode || this.ePopup.parentNode.tagName === 'BODY') {
            let rootWrapper = $(this.eGui).closest('.ag-root-wrapper');
            if (rootWrapper.length > 0) {
              rootWrapper.append(this.ePopup);
            } else {
              $('body').append(this.ePopup);
              let themeParent = $(this.eGui).closest('[class*="ag-theme-"]');
              if (themeParent.length > 0) {
                let cls = themeParent.attr('class').split(' ').find(c => c.startsWith('ag-theme-'));
                if (cls) $(this.ePopup).addClass(cls);
              }
            }
          }

          let rect = selectWrapper[0].getBoundingClientRect();
          let calculatedWidth = Math.max(rect.width, 180);
          
          $(this.eList).css({
            top: rect.bottom + 'px',
            left: rect.left + 'px',
            width: calculatedWidth + 'px',
            minWidth: calculatedWidth + 'px'
          });
          
          $(this.ePopup).show();
          selectWrapper.removeClass('ag-picker-collapsed').addClass('ag-picker-expanded').attr('aria-expanded', 'true');
        }
      });

      let filterBody = $('<div>').addClass('ag-filter-body').attr('role', 'presentation');

      let input1Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-from ag-filter-filter').attr('aria-hidden', 'false');
      let input1Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
      let input1Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation');
      let input1 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                                 .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'Filter...')[0];
      input1Wrapper.append(input1);
      input1Container.append(input1Label, input1Wrapper);

      let input2Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-to ag-filter-filter ag-hidden').attr('aria-hidden', 'true')[0];
      let input2Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
      let input2Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation');
      let input2 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                                 .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'To')[0];
      input2Wrapper.append(input2);
      $(input2Container).append(input2Label, input2Wrapper);

      input1.addEventListener('input', () => this.onChange());
      input2.addEventListener('input', () => this.onChange());

      filterBody.append(input1Container, input2Container);
      
      // Native components are injected directly as siblings
      if (i > 0) {
        selectContainer.hide();
        filterBody.hide();
      }
      
      bodyWrapper.append(selectContainer, filterBody);

      this.eSelects.push(selectContainer);
      this.eInput1s.push(input1);
      this.eInput2s.push(input2);
      this.eInput2Containers.push(input2Container);
      this.conditionBlocks.push({ 
        operatorContainer: joinOperatorContainer, 
        selectContainer: selectContainer, 
        filterBody: filterBody, 
        selectWrapper: selectWrapper, 
        displayField: displayField 
      });
    }

    // An empty resizer wrapper is appended as the final flex child.
    // This forces the flexbox container to render the bottom gap identically to native filters.
    let resizerWrapper = $('<div>').addClass('ag-resizer-wrapper');
    bodyWrapper.append(resizerWrapper);

    $(this.eGui).append(bodyWrapper);

    this.closeDropdown = (e) => {
      if (!e.target || !(e.target instanceof Node)) return;
      if ($(this.ePopup).is(':visible')) {
        let clickedInsideAnySelect = this.conditionBlocks.some(b => b.selectWrapper[0].contains(e.target));
        if (!this.ePopup.contains(e.target) && !clickedInsideAnySelect) {
          $(this.ePopup).hide();
          this.conditionBlocks.forEach(b => b.selectWrapper.removeClass('ag-picker-expanded').addClass('ag-picker-collapsed').attr('aria-expanded', 'false'));
        }
      }
    };
    
    document.addEventListener('mousedown', this.closeDropdown, true);
    window.addEventListener('blur', this.closeDropdown);

    this.onChange = () => {
      let validConditions = [];

      for (let i = 0; i < this.maxConditions; i++) {
        let type = this.currentTypes[i];
        let val1 = this.eInput1s[i].value.trim();
        let val2 = this.eInput2s[i].value.trim();

        if (type === 'inRange') {
          $(this.eInput2Containers[i]).removeClass('ag-hidden').attr('aria-hidden', 'false');
        } else {
          $(this.eInput2Containers[i]).addClass('ag-hidden').attr('aria-hidden', 'true');
        }

        if (val1) {
          let syntheticString = '';
          if (type === 'contains' || type === 'equals') {
            syntheticString = val1;
          } else if (type === 'notEqual') {
            syntheticString = `!= ${val1}`;
          } else if (type === 'greaterThan') {
            syntheticString = `> ${val1}`;
          } else if (type === 'greaterThanOrEqual') {
            syntheticString = `>= ${val1}`;
          } else if (type === 'lessThan') {
            syntheticString = `< ${val1}`;
          } else if (type === 'lessThanOrEqual') {
            syntheticString = `<= ${val1}`;
          } else if (type === 'inRange') {
            syntheticString = `${val1} - ${val2}`;
          }

          let parsed = parseDateFilterText(syntheticString);
          
          if (parsed && type === 'contains') {
            parsed.type = 'contains';
            parsed.filterText = val1;
          }

          if (parsed) validConditions.push(parsed);
        }
      }

      // Cascading visual blocks are correctly revealed upon prior entry presence
      for (let i = 1; i < this.maxConditions; i++) {
        if (this.eInput1s[i-1].value.trim() !== '') {
          if (this.conditionBlocks[i].operatorContainer) this.conditionBlocks[i].operatorContainer.show();
          this.conditionBlocks[i].selectContainer.show();
          this.conditionBlocks[i].filterBody.show();
        } else {
          this.eInput1s[i].value = '';
          this.eInput2s[i].value = '';
          if (this.conditionBlocks[i].operatorContainer) this.conditionBlocks[i].operatorContainer.hide();
          this.conditionBlocks[i].selectContainer.hide();
          this.conditionBlocks[i].filterBody.hide();
        }
      }

      this.joinOperators.forEach((ops) => {
         if (this.globalOperator === 'AND') {
           ops.and.input.prop('checked', true);
           ops.and.wrapper.addClass('ag-checked');
           ops.or.input.prop('checked', false);
           ops.or.wrapper.removeClass('ag-checked');
         } else {
           ops.or.input.prop('checked', true);
           ops.or.wrapper.addClass('ag-checked');
           ops.and.input.prop('checked', false);
           ops.and.wrapper.removeClass('ag-checked');
         }
      });

      if (validConditions.length === 0) {
        this.filterModel = null;
      } else if (validConditions.length === 1) {
        this.filterModel = validConditions[0];
      } else {
        this.filterModel = {
          filterType: 'date',
          operator: this.globalOperator,
          conditions: validConditions
        };
      }

      this.params.filterChangedCallback();
    };
  }

  /**
   * Automates focusing behavior to input fields on open event.
   * 
   * @returns {void}
   */
  afterGuiAttached() {
    if (this.eInput1s && this.eInput1s.length > 0) {
      setTimeout(() => this.eInput1s[0].focus(), 50);
    }
  }

  /**
   * Retrieves the wrapper element containing all child nodes.
   * 
   * @returns {HTMLElement}
   */
  getGui() {
    return this.eGui;
  }

  /**
   * Single condition evaluation helper.
   * Invalid dates (such as "Unknown") are strictly excluded from mathematical inequalities,
   * and day-level boundaries are applied to "notEqual".
   * 
   * @param {Object} model - The single filter condition object
   * @param {string} cellValue - The raw cell value
   * @returns {boolean}
   */
  checkCondition(model, cellValue) {
    if (cellValue == null) {
      return model.type === 'notEqual';
    }

    if (model.type === 'contains') {
      return cellValue.toLowerCase().includes((model.filterText || '').toLowerCase());
    }

    const toTimestamp = (val) => {
      if (!val || typeof val !== 'string') return null;
      let t = new Date(val.replace(' ', 'T')).getTime();
      return isNaN(t) ? null : t;
    };

    let cellTime = toTimestamp(cellValue);
    let fromTime = toTimestamp(model.dateFrom);

    // If the cell contains non-date text (e.g., "Unknown"), string equality is used
    if (!cellTime) {
      let target = (model.filterText || model.dateFrom || '').toLowerCase();
      if (model.type === 'equals') return cellValue.toLowerCase() === target;
      if (model.type === 'notEqual') return cellValue.toLowerCase() !== target;
      // Non-date values are strictly excluded from mathematical inequalities
      return false;
    }

    // If the filter target itself is non-date text (e.g., filtering for "!= Unknown")
    if (!fromTime) {
      let target = (model.filterText || model.dateFrom || '').toLowerCase();
      if (model.type === 'notEqual') return cellValue.toLowerCase() !== target;
      if (model.type === 'equals') return cellValue.toLowerCase() === target;
      return false;
    }

    // Both values are valid dates: mathematical comparison is performed
    if (model.type === 'equals') {
      if (model.dateTo) {
        let toTime = toTimestamp(model.dateTo);
        if (!toTime) return cellTime === fromTime;
        return cellTime >= fromTime && cellTime <= toTime;
      }
      return cellTime === fromTime;
    }

    if (model.type === 'notEqual') {
      // If dateTo exists, the entire day range (00:00:00 to 23:59:59) is excluded
      if (model.dateTo) {
        let toTime = toTimestamp(model.dateTo);
        if (!toTime) return cellTime !== fromTime;
        return cellTime < fromTime || cellTime > toTime;
      }
      return cellTime !== fromTime;
    }
    
    if (model.type === 'greaterThan') return cellTime > fromTime;
    if (model.type === 'greaterThanOrEqual') return cellTime >= fromTime;
    if (model.type === 'lessThan') return cellTime < fromTime;
    if (model.type === 'lessThanOrEqual') return cellTime <= fromTime;
    if (model.type === 'inRange') {
      let toTime = toTimestamp(model.dateTo);
      if (!toTime) return cellTime >= fromTime;
      return cellTime >= fromTime && cellTime <= toTime;
    }
    
    return true;
  }

  /**
   * Evaluates if a specified row passes the defined date boundaries.
   * Supports both single conditions and multi-condition OR/AND operators.
   * 
   * @param {Object} params - The row evaluation context.
   * @returns {boolean} 
   */
  doesFilterPass(params) {
    if (!this.filterModel) return true;

    let cellValue = this.params.getValue(params.node);
    if (!cellValue) return false;

    // Evaluate multiple conditions if operator exists
    if (this.filterModel.operator) {
      if (this.filterModel.operator === 'OR') {
        return this.filterModel.conditions.some(cond => this.checkCondition(cond, cellValue));
      } else if (this.filterModel.operator === 'AND') {
        return this.filterModel.conditions.every(cond => this.checkCondition(cond, cellValue));
      }
    }

    // Default to single condition evaluation
    return this.checkCondition(this.filterModel, cellValue);
  }

  /**
   * Validates if a specific filter action is currently active.
   * 
   * @returns {boolean}
   */
  isFilterActive() {
    return this.filterModel != null;
  }

  /**
   * Outputs the formatted data filter model applied by the user.
   * 
   * @returns {Object|null}
   */
  getModel() {
    return this.filterModel;
  }

  /**
   * Allows external programmatic overrides matching grid load state.
   * Safely unpacks multi-condition logic (OR/AND) into the expanding Hamburger Menu UI.
   * 
   * @param {Object|null} model - The injected model override values.
   * @returns {void}
   */
  setModel(model) {
    this.filterModel = model;
    
    // The hamburger UI is entirely reset if the active model is null
    for (let i = 0; i < this.maxConditions; i++) {
      this.currentTypes[i] = 'equals';
      $(this.conditionBlocks[i].displayField).text(this.options['equals']);
      this.eInput1s[i].value = '';
      this.eInput2s[i].value = '';
      $(this.eInput2Containers[i]).addClass('ag-hidden').attr('aria-hidden', 'true');
      
      // Explicitly hide secondary blocks on reset
      if (i > 0) {
        if (this.conditionBlocks[i].operatorContainer) this.conditionBlocks[i].operatorContainer.hide();
        this.conditionBlocks[i].selectContainer.hide();
        this.conditionBlocks[i].filterBody.hide();
      }
    }

    if (!model) return;

    let conditions = model.operator && model.conditions ? model.conditions : [model];
    
    if (model.operator) {
      this.globalOperator = model.operator;
    }

    // Input blocks are populated sequentially depending on condition payload length
    for (let i = 0; i < Math.min(conditions.length, this.maxConditions); i++) {
      let cond = conditions[i];
      this.currentTypes[i] = cond.type;
      $(this.conditionBlocks[i].displayField).text(this.options[cond.type] || 'Equals');
      
      if (cond.type === 'inRange') {
        $(this.eInput2Containers[i]).removeClass('ag-hidden').attr('aria-hidden', 'false');
      } else {
        $(this.eInput2Containers[i]).addClass('ag-hidden').attr('aria-hidden', 'true');
      }

      let raw = cond.rawUserInput || '';
      if (cond.type === 'inRange') {
        let parts = raw.split(' - ');
        this.eInput1s[i].value = parts[0] ? parts[0].trim() : '';
        this.eInput2s[i].value = parts[1] ? parts[1].trim() : '';
      } else if (cond.type === 'contains') {
        this.eInput1s[i].value = cond.filterText || raw;
      } else {
        this.eInput1s[i].value = raw.replace(/^[><=]+\s*/, '').trim();
      }

      if (i > 0) {
        if (this.conditionBlocks[i].operatorContainer) this.conditionBlocks[i].operatorContainer.show();
      }
      this.conditionBlocks[i].selectContainer.show();
      this.conditionBlocks[i].filterBody.show();
    }

    // The cascading UI reveals an empty block natively following populated lines
    if (conditions.length < this.maxConditions) {
      let nextIdx = conditions.length;
      if (this.conditionBlocks[nextIdx].operatorContainer) {
        this.conditionBlocks[nextIdx].operatorContainer.show();
      }
      this.conditionBlocks[nextIdx].selectContainer.show();
      this.conditionBlocks[nextIdx].filterBody.show();
    }

    // Operators are checked uniformly according to the global operator assignment
    this.joinOperators.forEach((ops) => {
       if (this.globalOperator === 'AND') {
         ops.and.input.prop('checked', true);
         ops.and.wrapper.addClass('ag-checked');
         ops.or.input.prop('checked', false);
         ops.or.wrapper.removeClass('ag-checked');
       } else {
         ops.or.input.prop('checked', true);
         ops.or.wrapper.addClass('ag-checked');
         ops.and.input.prop('checked', false);
         ops.and.wrapper.removeClass('ag-checked');
       }
    });
  }

  /**
   * Gracefully removes global dom observers to avoid memory leaking.
   * 
   * @returns {void}
   */
  destroy() {
    document.removeEventListener('mousedown', this.closeDropdown, true);
    window.removeEventListener('blur', this.closeDropdown);
    if (this.eGui) $(this.eGui).remove();
    if (this.ePopup) $(this.ePopup).remove();
  }
}

/**
 * Class DateFloatingFilterComponent
 * 
 * The default ag-Grid date picker is replaced with a smart text-based input field. 
 * This allows dates, times, and complex operators to be quickly typed using pure text.
 */
let uniqueDateIdCounter = 0; 

class DateFloatingFilterComponent {
  
  /**
   * Constructs components encapsulating standard grid logic.
   * 
   * @param {Object} params - The ag-Grid generic floating filter definitions.
   * @returns {void}
   */
  init(params) {
    this.params = params;
    
    this.eGui = $('<div>').addClass('ag-floating-filter-input').attr('role', 'presentation');
    let div = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field').css({ width: '100%', boxSizing: 'border-box' });
    let eWrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').css({ width: '100%', boxSizing: 'border-box' });
    
    let input = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                            .attr('type', 'text')
                            .attr('id', `ag-custom-date-${uniqueDateIdCounter++}-input`)
                            .attr('autocomplete', 'off')
                            .css({ width: '100%', boxSizing: 'border-box' });
    
    eWrapper.append(input);
    div.append(eWrapper);
    this.eGui.append(div);
    this.eFilterInput = this.eGui.find('input')[0];

    // Theme Variables updated gracefully where available targeting body injection overlays
    this.customTooltip = $('<div>')
        .css({
            position: 'absolute', 
            zIndex: '999999',      
            backgroundColor: 'var(--ag-tooltip-background-color, rgba(0, 0, 0, 0.85))', 
            color: 'var(--ag-tooltip-text-color, #ffffff)',                       
            border: 'none',                         
            padding: '8px 12px',                    
            borderRadius: 'var(--ag-border-radius, 4px)',                    
            boxShadow: 'var(--ag-popup-shadow, 0px 4px 8px rgba(0,0,0,0.2))',
            display: 'none',       
            width: 'max-content',
            fontSize: '12px',
            lineHeight: '1.5',
            textAlign: 'left',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
        })
        .html(`
            <strong style="color: #66afe9;">Date Filter Tips:</strong><br>
            <b>Date (Optional Time):</b> YYYY-MM-DD (HH:MM)<br>
            <b>Does Not Equal:</b> != YYYY-MM-DD or != Unknown<br>
            <b>After (Inclusive):</b> &gt;= YYYY-MM-DD (HH:MM)<br>
            <b>After:</b> &gt; YYYY-MM-DD (HH:MM)<br>
            <b>Before (Inclusive):</b> &lt;= YYYY-MM-DD (HH:MM)<br>
            <b>Before:</b> &lt; YYYY-MM-DD (HH:MM)<br>
            <b>Range:</b> YYYY-MM-DD (HH:MM) - YYYY-MM-DD (HH:MM)<br>
            <span style="color: #ffb3b3; font-size: 11px;"><i>(Must use spaces around the dash!)</i></span>
        `);

    $('body').append(this.customTooltip);

    this.eFilterInput.addEventListener('focus', () => {
        if (this.eFilterInput.value === '') {
            let rect = this.eFilterInput.getBoundingClientRect();
            this.customTooltip.css({
                top: (rect.bottom + window.scrollY + 5) + 'px',
                left: (rect.left + window.scrollX) + 'px',
                display: 'block'
            });
        }
    });

    this.eFilterInput.addEventListener('blur', () => {
        setTimeout(() => { this.customTooltip.css('display', 'none'); }, 150);
    });

    this.eFilterInput.addEventListener('keydown', () => {
        this.customTooltip.css('display', 'none');
    });
    
    this.debounceTimer = null;

    const onInputBoxChanged = () => {
      clearTimeout(this.debounceTimer);
      
      this.debounceTimer = setTimeout(() => {
        let val = this.eFilterInput.value.trim();
        
        if (val === '') {
          params.parentFilterInstance(instance => {
            instance.setModel(null);        
            params.api.onFilterChanged();   
          });
          return;
        }

        let parsedModel = parseDateFilterText(val);

        if (parsedModel) {
          params.parentFilterInstance(instance => {
            instance.setModel(parsedModel);
            params.api.onFilterChanged(); 
          });
        }
      }, 500); 
    };

    this.eFilterInput.addEventListener('input', onInputBoxChanged);
  }

  /**
   * Detects and synchronizes any model modifications back down to internal filter scopes.
   * Supports multi-condition arrays (OR/AND) by disabling the input and displaying the joined query.
   * 
   * @param {Object} parentModel - Modified filter data model object.
   * @returns {void}
   */
  onParentModelChanged(parentModel) {
    this.eFilterInput.disabled = false;

    let activeModels = this.params.api.getFilterModel();
    let myColId = this.params.column.getColId();
    
    // The input is cleared only if the column filter is genuinely inactive in the grid
    if (!activeModels[myColId] || !parentModel) {
      this.eFilterInput.value = '';
      return;
    }

    if (document.activeElement === this.eFilterInput) return;

    // MULTI-CONDITION SYNC LOGIC
    // If the model contains an operator, raw strings are merged for visual feedback and the input is locked
    if (parentModel.operator && parentModel.conditions) {
      let conditionsText = parentModel.conditions.map(cond => cond.rawUserInput || cond.dateFrom || cond.filterText).join(` ${parentModel.operator === 'AND' ? '&&' : '||'} `);
      this.eFilterInput.value = conditionsText;
      this.eFilterInput.disabled = true;
      return;
    }

    // SINGLE CONDITION SYNC LOGIC
    if (parentModel.rawUserInput) {
      this.eFilterInput.value = parentModel.rawUserInput;
      return;
    }

    const cleanStr = (str, isEnd) => {
      if (!str) return '';
      if (isEnd && str.endsWith('23:59:59')) return str.slice(0, 10);
      if (!isEnd && str.endsWith('00:00:00')) return str.slice(0, 10);
      return str;
    };

    let fromStr = parentModel.dateFrom || '';
    let toStr = parentModel.dateTo || '';

    if (parentModel.type === 'inRange') {
      let cFrom = cleanStr(fromStr, false);
      let cTo = cleanStr(toStr, true);
       
      if (cFrom === cTo && cFrom !== '') {
        this.eFilterInput.value = cFrom;
      } else {
        this.eFilterInput.value = `${cFrom} - ${cTo}`;
      }
    } else if (parentModel.type === 'notEqual') {
      this.eFilterInput.value = `!= ${parentModel.filterText || cleanStr(fromStr, false)}`;
    } else if (parentModel.type === 'contains') {
      this.eFilterInput.value = parentModel.filterText || '';
    } else if (parentModel.type === 'greaterThanOrEqual') {
      this.eFilterInput.value = `>= ${cleanStr(fromStr, false)}`;
    } else if (parentModel.type === 'lessThanOrEqual') {
      this.eFilterInput.value = `<= ${cleanStr(fromStr, true)}`;
    } else if (parentModel.type === 'greaterThan') {
      this.eFilterInput.value = `> ${cleanStr(fromStr, true)}`;
    } else if (parentModel.type === 'lessThan') {
      this.eFilterInput.value = `< ${cleanStr(fromStr, false)}`;
    } else {
      this.eFilterInput.value = fromStr;
    }
  }

  /**
   * Retrieves dom entry nodes targeting the grid framework component injector.
   * 
   * @returns {HTMLElement}
   */
  getGui() {
    return this.eGui[0];
  }

  /**
   * Deallocates dynamic custom objects to avert DOM accumulation.
   * 
   * @returns {void}
   */
  destroy() {
    if (this.customTooltip) {
      this.customTooltip.remove();
    }
  }
}


/**
 * Class TimeIntervalParentFilter
 * 
 * Strict mathematical comparisons on raw seconds are enforced.
 * A native-looking UI is rendered in the hamburger menu, utilizing exact ag-Grid 
 * DOM structures to inherit the active theme perfectly. This allows raw seconds 
 * to be filtered using human-readable time strings perfectly synced with the floating text box.
 */
class TimeIntervalParentFilter {
  /**
   * Initializes the parent node structural framework.
   * 
   * @param {Object} params - The component constructor framework configurations.
   * @returns {void}
   */
  init(params) {
    this.params = params;
    this.filterModel = null;
    this.buildGui();
  }

  /**
   * Dynamically constructs DOM identical to v33 standards injecting structural invariants natively.
   * Dynamic condition blocks are generated based on the maxNumConditions parameter.
   * 
   * @returns {void}
   */
  buildGui() {
    // Core flex requirements embedded sequentially against lazy load failures
    this.eGui = $('<form>').addClass('ag-filter-wrapper ag-focus-managed')[0];
    
    let bodyWrapper = $('<div>').addClass('ag-filter-body-wrapper ag-simple-filter-body-wrapper ag-focus-managed');

    this.maxConditions = (this.params.filterParams && this.params.filterParams.maxNumConditions) ? this.params.filterParams.maxNumConditions : 2;
    this.globalOperator = 'AND';

    this.conditionBlocks = [];
    this.joinOperators = [];
    this.currentTypes = [];
    this.eSelects = [];
    this.eInput1s = [];
    this.eInput2s = [];
    this.eInput2Containers = [];

    this.ePopup = $('<div>').addClass('ag-popup').css({ display: 'none' })[0];
    
    // Explicit V33 tokens replacing legacy inline configurations
    this.eList = $('<div>').addClass('ag-list ag-select-list ag-ltr ag-popup-child ag-popup-positioned-under')
                           .attr('role', 'listbox').css({
                             position: 'fixed', 
                             background: 'var(--ag-menu-background-color, var(--ag-background-color, #ffffff))',
                             border: '1px solid var(--ag-border-color, #babfc7)',
                             boxShadow: 'var(--ag-popup-shadow, 0 1px 4px rgba(0,0,0,0.2))',
                             borderRadius: 'var(--ag-border-radius, 4px)',
                             maxHeight: '250px', overflowY: 'auto', zIndex: 999999
                           })[0];
    $(this.ePopup).append(this.eList);

    $(this.ePopup).on('mousedown mouseup click touchstart', (e) => {
      e.stopPropagation();
    });

    this.options = {
      'equals': 'Equals',
      'greaterThan': 'Greater Than',
      'greaterThanOrEqual': 'Greater Than or Equal',
      'lessThan': 'Less Than',
      'lessThanOrEqual': 'Less Than or Equal',
      'inRange': 'In Range'
    };

    let activeSelectIndex = 0;

    const populateList = (index) => {
      $(this.eList).empty();
      Object.entries(this.options).forEach(([val, label]) => {
        let item = $('<div>').addClass('ag-list-item ag-select-list-item').attr('role', 'option')
                             .html(`<span>${label}</span>`)
                             .css({ cursor: 'pointer', padding: '6px 12px' });
        item.on('click', (e) => {
          e.stopPropagation();
          this.currentTypes[index] = val;
          $(this.conditionBlocks[index].displayField).text(label);
          $(this.ePopup).hide();
          this.conditionBlocks[index].selectWrapper.removeClass('ag-picker-expanded').addClass('ag-picker-collapsed').attr('aria-expanded', 'false');
          this.onChange();
        });
        item.on('mouseenter', () => item.css('background-color', 'var(--ag-menu-option-active-background-color, var(--ag-row-hover-color, rgba(0,0,0,0.05)))'));
        item.on('mouseleave', () => item.css('background-color', 'transparent'));
        $(this.eList).append(item);
      });
    };

    for (let i = 0; i < this.maxConditions; i++) {
      this.currentTypes.push('equals');
      
      let joinOperatorContainer = null;

      if (i > 0) {
        joinOperatorContainer = $('<div>').addClass('ag-filter-condition');
        
        let buildRadio = (val, labelStr) => {
          let radioClass = `ag-filter-condition-operator-${val.toLowerCase()}`;
          let radioContainer = $('<div>').addClass(`ag-labeled ag-label-align-right ag-radio-button ag-input-field ag-filter-condition-operator ${radioClass}`).attr('role', 'presentation');
          let label = $('<div>').addClass('ag-input-field-label ag-label ag-radio-button-label').text(labelStr);
          let wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-radio-button-input-wrapper');
          let input = $('<input>').attr('type', 'radio').attr('name', `ag-simple-filter-and-or-${this.params.column.getColId()}-${i}`).val(val).addClass('ag-input-field-input ag-radio-button-input');
          
          if (i > 1) {
             radioContainer.addClass('ag-disabled');
             wrapper.addClass('ag-disabled');
             input.prop('disabled', true);
          }
          
          wrapper.append(input);
          radioContainer.append(label, wrapper);

          input.on('change', () => {
             if (i === 1) { 
                this.globalOperator = val;
                this.onChange();
             }
          });

          return { container: radioContainer, input: input, wrapper: wrapper };
        };

        let andRadio = buildRadio('AND', 'AND');
        let orRadio = buildRadio('OR', 'OR');
        
        joinOperatorContainer.append(andRadio.container, orRadio.container);
        this.joinOperators.push({ and: andRadio, or: orRadio, container: joinOperatorContainer });
        
        joinOperatorContainer.hide();
        bodyWrapper.append(joinOperatorContainer);
      }

      let selectContainer = $('<div>').addClass('ag-picker-field ag-labeled ag-label-align-left ag-select ag-filter-select').attr('role', 'presentation');
      let selectLabel = $('<div>').addClass('ag-label ag-hidden').attr('aria-hidden', 'true').attr('role', 'presentation');
      
      // Native picker variables and layout parameters are matched identically
      let selectWrapper = $('<div>').addClass('ag-wrapper ag-picker-field-wrapper ag-picker-collapsed ag-has-popup-positioned-under')
                                     .attr('tabindex', '0').attr('role', 'combobox').attr('aria-expanded', 'false')
                                     .css({
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'space-between',
                                       width: '100%',
                                       minHeight: 'max(var(--ag-list-item-height, 22px), calc(var(--ag-spacing, 4px) * 4))',
                                       boxSizing: 'border-box',
                                       cursor: 'pointer',
                                       border: 'var(--ag-picker-button-border, solid var(--ag-border-width, 1px) var(--ag-border-color, #babfc7))',
                                       borderRadius: 'var(--ag-border-radius, 5px)',
                                       backgroundColor: 'var(--ag-picker-button-background-color, var(--ag-background-color, #ffffff))',
                                       paddingLeft: 'var(--ag-spacing, 4px)',
                                       paddingRight: 'var(--ag-spacing, 4px)',
                                     });
      
      let displayField = $('<div>').addClass('ag-picker-field-display').text('Equals');
      let icon = $('<div>').addClass('ag-picker-field-icon').attr('aria-hidden', 'true')
                           .html('<span class="ag-icon ag-icon-small-down" unselectable="on" role="presentation"></span>');

      selectWrapper.append(displayField, icon);
      selectContainer.append(selectLabel, selectWrapper);

      selectWrapper.on('click', (e) => {
        e.stopPropagation();
        let isExpanded = selectWrapper.hasClass('ag-picker-expanded');
        
        if (isExpanded) {
          $(this.ePopup).hide();
          selectWrapper.removeClass('ag-picker-expanded').addClass('ag-picker-collapsed').attr('aria-expanded', 'false');
        } else {
          this.conditionBlocks.forEach(b => b.selectWrapper.removeClass('ag-picker-expanded').addClass('ag-picker-collapsed').attr('aria-expanded', 'false'));
          
          activeSelectIndex = i;
          populateList(i);

          if (!this.ePopup.parentNode || this.ePopup.parentNode.tagName === 'BODY') {
            let rootWrapper = $(this.eGui).closest('.ag-root-wrapper');
            if (rootWrapper.length > 0) {
              rootWrapper.append(this.ePopup);
            } else {
              $('body').append(this.ePopup);
              let themeParent = $(this.eGui).closest('[class*="ag-theme-"]');
              if (themeParent.length > 0) {
                let cls = themeParent.attr('class').split(' ').find(c => c.startsWith('ag-theme-'));
                if (cls) $(this.ePopup).addClass(cls);
              }
            }
          }

          let rect = selectWrapper[0].getBoundingClientRect();
          let calculatedWidth = Math.max(rect.width, 180);
          
          $(this.eList).css({
            top: rect.bottom + 'px',
            left: rect.left + 'px',
            width: calculatedWidth + 'px',
            minWidth: calculatedWidth + 'px'
          });
          
          $(this.ePopup).show();
          selectWrapper.removeClass('ag-picker-collapsed').addClass('ag-picker-expanded').attr('aria-expanded', 'true');
        }
      });

      let filterBody = $('<div>').addClass('ag-filter-body').attr('role', 'presentation');

      let input1Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-from ag-filter-filter').attr('aria-hidden', 'false');
      let input1Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
      let input1Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation');
      let input1 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                                 .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'Filter...')[0];
      input1Wrapper.append(input1);
      input1Container.append(input1Label, input1Wrapper);

      let input2Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-to ag-filter-filter ag-hidden').attr('aria-hidden', 'true')[0];
      let input2Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
      let input2Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation');
      let input2 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                                 .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'To')[0];
      input2Wrapper.append(input2);
      $(input2Container).append(input2Label, input2Wrapper);

      input1.addEventListener('input', () => this.onChange());
      input2.addEventListener('input', () => this.onChange());

      filterBody.append(input1Container, input2Container);
      
      // Native components are injected directly as siblings
      if (i > 0) {
        selectContainer.hide();
        filterBody.hide();
      }
      
      bodyWrapper.append(selectContainer, filterBody);

      this.eSelects.push(selectContainer);
      this.eInput1s.push(input1);
      this.eInput2s.push(input2);
      this.eInput2Containers.push(input2Container);
      this.conditionBlocks.push({ 
        operatorContainer: joinOperatorContainer, 
        selectContainer: selectContainer, 
        filterBody: filterBody, 
        selectWrapper: selectWrapper, 
        displayField: displayField 
      });
    }

    // An empty resizer wrapper is appended as the final flex child.
    // This forces the flexbox container to render the bottom gap identically to native filters.
    let resizerWrapper = $('<div>').addClass('ag-resizer-wrapper');
    bodyWrapper.append(resizerWrapper);

    $(this.eGui).append(bodyWrapper);

    this.closeDropdown = (e) => {
      if (!e.target || !(e.target instanceof Node)) return;
      if ($(this.ePopup).is(':visible')) {
        let clickedInsideAnySelect = this.conditionBlocks.some(b => b.selectWrapper[0].contains(e.target));
        if (!this.ePopup.contains(e.target) && !clickedInsideAnySelect) {
          $(this.ePopup).hide();
          this.conditionBlocks.forEach(b => b.selectWrapper.removeClass('ag-picker-expanded').addClass('ag-picker-collapsed').attr('aria-expanded', 'false'));
        }
      }
    };
    
    document.addEventListener('mousedown', this.closeDropdown, true);
    window.addEventListener('blur', this.closeDropdown);

    this.onChange = () => {
      let validConditions = [];

      for (let i = 0; i < this.maxConditions; i++) {
        let type = this.currentTypes[i];
        let val1 = this.eInput1s[i].value.trim();
        let val2 = this.eInput2s[i].value.trim();

        if (type === 'inRange') {
          $(this.eInput2Containers[i]).removeClass('ag-hidden').attr('aria-hidden', 'false');
        } else {
          $(this.eInput2Containers[i]).addClass('ag-hidden').attr('aria-hidden', 'true');
        }

        if (val1) {
          let syntheticString = '';
          if (type === 'equals') {
            syntheticString = val1;
          } else if (type === 'greaterThan') {
            syntheticString = `> ${val1}`;
          } else if (type === 'greaterThanOrEqual') {
            syntheticString = `>= ${val1}`;
          } else if (type === 'lessThan') {
            syntheticString = `< ${val1}`;
          } else if (type === 'lessThanOrEqual') {
            syntheticString = `<= ${val1}`;
          } else if (type === 'inRange') {
            syntheticString = `${val1} - ${val2}`;
          }

          let parsed = parseTimeFilterText(syntheticString);
          if (parsed) validConditions.push(parsed);
        }
      }

      // Cascading visual blocks are correctly revealed upon prior entry presence
      for (let i = 1; i < this.maxConditions; i++) {
        if (this.eInput1s[i-1].value.trim() !== '') {
          if (this.conditionBlocks[i].operatorContainer) this.conditionBlocks[i].operatorContainer.show();
          this.conditionBlocks[i].selectContainer.show();
          this.conditionBlocks[i].filterBody.show();
        } else {
          this.eInput1s[i].value = '';
          this.eInput2s[i].value = '';
          if (this.conditionBlocks[i].operatorContainer) this.conditionBlocks[i].operatorContainer.hide();
          this.conditionBlocks[i].selectContainer.hide();
          this.conditionBlocks[i].filterBody.hide();
        }
      }

      this.joinOperators.forEach((ops) => {
         if (this.globalOperator === 'AND') {
           ops.and.input.prop('checked', true);
           ops.and.wrapper.addClass('ag-checked');
           ops.or.input.prop('checked', false);
           ops.or.wrapper.removeClass('ag-checked');
         } else {
           ops.or.input.prop('checked', true);
           ops.or.wrapper.addClass('ag-checked');
           ops.and.input.prop('checked', false);
           ops.and.wrapper.removeClass('ag-checked');
         }
      });

      if (validConditions.length === 0) {
        this.filterModel = null;
      } else if (validConditions.length === 1) {
        this.filterModel = validConditions[0];
      } else {
        this.filterModel = {
          filterType: 'number',
          operator: this.globalOperator,
          conditions: validConditions
        };
      }

      this.params.filterChangedCallback();
    };
  }

  /**
   * Targets input on instantiation directly to elevate usage convenience.
   * 
   * @returns {void}
   */
  afterGuiAttached() {
    if (this.eInput1s && this.eInput1s.length > 0) {
      setTimeout(() => this.eInput1s[0].focus(), 50);
    }
  }

  /**
   * Retrieves the UI bounding component to integrate it back into dom hierarchies.
   * 
   * @returns {HTMLElement}
   */
  getGui() {
    return this.eGui;
  }

  /**
   * Single condition evaluation helper
   * 
   * @param {Object} model - The single filter condition object
   * @param {number} cellSecs - The formatted numerical seconds value
   * @returns {boolean}
   */
  checkCondition(model, cellSecs) {
    let filterSecs = model.filter;

    if (model.type === 'equals') return cellSecs === filterSecs;
    if (model.type === 'greaterThan') return cellSecs > filterSecs;
    if (model.type === 'greaterThanOrEqual') return cellSecs >= filterSecs;
    if (model.type === 'lessThan') return cellSecs < filterSecs;
    if (model.type === 'lessThanOrEqual') return cellSecs <= filterSecs;
    if (model.type === 'inRange') {
      let toSecs = model.filterTo;
      if (toSecs == null) return cellSecs >= filterSecs;
      return cellSecs >= filterSecs && cellSecs <= toSecs;
    }
    return true;
  }

  /**
   * Evaluates if a specified row passes the defined date boundaries.
   * Supports both single conditions and multi-condition OR/AND operators.
   * 
   * @param {Object} params - External row definition map.
   * @returns {boolean}
   */
  doesFilterPass(params) {
    if (!this.filterModel) return true;

    let cellValue = this.params.getValue(params.node);
    if (cellValue == null || cellValue === '') return false;

    let cellSecs = Number(cellValue);
    if (isNaN(cellSecs)) return false;

    // Evaluate multiple conditions if operator exists
    if (this.filterModel.operator) {
      if (this.filterModel.operator === 'OR') {
        return this.filterModel.conditions.some(cond => this.checkCondition(cond, cellSecs));
      } else if (this.filterModel.operator === 'AND') {
        return this.filterModel.conditions.every(cond => this.checkCondition(cond, cellSecs));
      }
    }

    // Default to single condition evaluation
    return this.checkCondition(this.filterModel, cellSecs);
  }

  /**
   * Assesses global active constraints internally to coordinate visual cues dynamically.
   * 
   * @returns {boolean}
   */
  isFilterActive() {
    return this.filterModel != null;
  }

  /**
   * Delivers serialized active properties supporting grid extraction natively.
   * 
   * @returns {Object|null}
   */
  getModel() {
    return this.filterModel;
  }

  /**
   * Syncs and overwrites internal logic natively accommodating saved grids loading routines.
   * Supports complex multi-condition arrays spanning dynamic UI blocks.
   * 
   * @param {Object|null} model - Input configuration map restoring logic.
   * @returns {void} 
   */
  setModel(model) {
    this.filterModel = model;
    
    // Reset all inputs before populating
    for (let i = 0; i < this.maxConditions; i++) {
      this.currentTypes[i] = 'equals';
      $(this.conditionBlocks[i].displayField).text(this.options['equals']);
      this.eInput1s[i].value = '';
      this.eInput2s[i].value = '';
      $(this.eInput2Containers[i]).addClass('ag-hidden').attr('aria-hidden', 'true');
      
      // Explicitly hide secondary blocks on reset
      if (i > 0) {
        if (this.conditionBlocks[i].operatorContainer) this.conditionBlocks[i].operatorContainer.hide();
        this.conditionBlocks[i].selectContainer.hide();
        this.conditionBlocks[i].filterBody.hide();
      }
    }

    if (!model) return;

    let conditions = model.operator && model.conditions ? model.conditions : [model];
    
    if (model.operator) {
      this.globalOperator = model.operator;
    }

    for (let i = 0; i < Math.min(conditions.length, this.maxConditions); i++) {
      let cond = conditions[i];
      this.currentTypes[i] = cond.type;
      $(this.conditionBlocks[i].displayField).text(this.options[cond.type] || 'Equals');
      
      if (cond.type === 'inRange') {
        $(this.eInput2Containers[i]).removeClass('ag-hidden').attr('aria-hidden', 'false');
      } else {
        $(this.eInput2Containers[i]).addClass('ag-hidden').attr('aria-hidden', 'true');
      }

      let raw = cond.rawUserInput || '';
      if (cond.type === 'inRange') {
        let parts = raw.split(' - ');
        this.eInput1s[i].value = parts[0] ? parts[0].trim() : '';
        this.eInput2s[i].value = parts[1] ? parts[1].trim() : '';
      } else {
        this.eInput1s[i].value = raw.replace(/^[><=]+\s*/, '').trim();
      }

      if (i > 0) {
        if (this.conditionBlocks[i].operatorContainer) this.conditionBlocks[i].operatorContainer.show();
      }
      this.conditionBlocks[i].selectContainer.show();
      this.conditionBlocks[i].filterBody.show();
    }

    if (conditions.length < this.maxConditions) {
       if (this.conditionBlocks[conditions.length].operatorContainer) this.conditionBlocks[conditions.length].operatorContainer.show();
       this.conditionBlocks[conditions.length].selectContainer.show();
       this.conditionBlocks[conditions.length].filterBody.show();
    }

    this.joinOperators.forEach((ops) => {
       if (this.globalOperator === 'AND') {
         ops.and.input.prop('checked', true);
         ops.and.wrapper.addClass('ag-checked');
         ops.or.input.prop('checked', false);
         ops.or.wrapper.removeClass('ag-checked');
       } else {
         ops.or.input.prop('checked', true);
         ops.or.wrapper.addClass('ag-checked');
         ops.and.input.prop('checked', false);
         ops.and.wrapper.removeClass('ag-checked');
       }
    });
  }

  /**
   * Safely eliminates bindings manually avoiding heavy DOM footprints passively persisting.
   * 
   * @returns {void}
   */
  destroy() {
    document.removeEventListener('mousedown', this.closeDropdown, true);
    window.removeEventListener('blur', this.closeDropdown);
    if (this.eGui) $(this.eGui).remove();
    if (this.ePopup) $(this.ePopup).remove();
  }
}


/**
 * Class TimeIntervalFloatingFilterComponent
 * 
 * The default numeric floating filter is replaced with a smart text-based input field.
 * This allows raw seconds to be filtered using human-readable time strings.
 */
let uniqueTimeIdCounter = 0; 

class TimeIntervalFloatingFilterComponent {
  
  /**
   * Binds component structure correctly mapping logical functions.
   * 
   * @param {Object} params - External variable implementations map.
   * @returns {void}
   */
  init(params) {
    this.params = params; 

    this.eGui = $('<div>').addClass('ag-floating-filter-input').attr('role', 'presentation');
    let div = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field').css({ width: '100%', boxSizing: 'border-box' });
    let eWrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').css({ width: '100%', boxSizing: 'border-box' });
    
    let input = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                            .attr('type', 'text')
                            .attr('id', `ag-custom-time-${uniqueTimeIdCounter++}-input`)
                            .attr('autocomplete', 'off')
                            .css({ width: '100%', boxSizing: 'border-box' });
    
    eWrapper.append(input);
    div.append(eWrapper);
    this.eGui.append(div);
    this.eFilterInput = this.eGui.find('input')[0];

    this.customTooltip = $('<div>')
        .css({
            position: 'absolute', 
            zIndex: '999999',                       
            backgroundColor: 'var(--ag-tooltip-background-color, rgba(0, 0, 0, 0.85))', 
            color: 'var(--ag-tooltip-text-color, #ffffff)',                       
            border: 'none',
            padding: '8px 12px',
            borderRadius: 'var(--ag-border-radius, 4px)',
            boxShadow: 'var(--ag-popup-shadow, 0px 4px 8px rgba(0,0,0,0.2))',
            display: 'none',                        
            width: 'max-content',
            fontSize: '12px',
            lineHeight: '1.5',
            textAlign: 'left',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
        })
        .html(`
            <strong style="color: #66afe9;">Time Filter Tips:</strong><br>
            <b>Format:</b> 1d 2h 3m 4s (Letters required for units)<br>
            <b>Default (No letters):</b> 300 = 300s (5m)<br>
            <b>Max/Min:</b> &lt; 5m  |  &gt;= 1h<br>
            <b>Range:</b> 10m - 1h<br>
            <span style="color: #ffb3b3; font-size: 11px;"><i>(Must use spaces around the dash!)</i></span>
        `);

    $('body').append(this.customTooltip);

    this.eFilterInput.addEventListener('focus', () => {
        if (this.eFilterInput.value === '') {
            let rect = this.eFilterInput.getBoundingClientRect();
            this.customTooltip.css({
                top: (rect.bottom + window.scrollY + 5) + 'px',
                left: (rect.left + window.scrollX) + 'px',
                display: 'block'
            });
        }
    });

    this.eFilterInput.addEventListener('blur', () => {
        setTimeout(() => { this.customTooltip.css('display', 'none'); }, 150);
    });

    this.eFilterInput.addEventListener('keydown', () => {
        this.customTooltip.css('display', 'none');
    });

    this.debounceTimer = null;

    const onInputBoxChanged = () => {
      clearTimeout(this.debounceTimer);
      
      this.debounceTimer = setTimeout(() => {
        let val = this.eFilterInput.value.trim();
        
        if (val === '') {
          params.parentFilterInstance(instance => {
            instance.setModel(null);
            params.api.onFilterChanged();
          });
          return;
        }

        let parsedModel = parseTimeFilterText(val);

        if (parsedModel) {
          params.parentFilterInstance(instance => {
            instance.setModel(parsedModel);
            params.api.onFilterChanged(); 
          });
        }
      }, 500); 
    };

    this.eFilterInput.addEventListener('input', onInputBoxChanged);
  }

  /**
   * Handles propagating updates generated externally mirroring properties internally identically.
   * Supports multi-condition arrays (OR/AND) by disabling the input and displaying the joined query.
   * 
   * @param {Object} parentModel - Configuration state object dynamically provided.
   * @returns {void}
   */
  onParentModelChanged(parentModel) {
    this.eFilterInput.disabled = false;

    let activeModels = this.params.api.getFilterModel();
    let myColId = this.params.column.getColId();
    
    if (!activeModels[myColId] || !parentModel || (!parentModel.operator && parentModel.filter == null)) {
      this.eFilterInput.value = '';
      return;
    }

    if (document.activeElement === this.eFilterInput) return;

    // MULTI-CONDITION SYNC LOGIC
    // If the model contains an operator, it merges the raw strings for visual feedback and locks the input
    if (parentModel.operator && parentModel.conditions) {
      let conditionsText = parentModel.conditions.map(cond => cond.rawUserInput || cond.filter).join(` ${parentModel.operator} `);
      this.eFilterInput.value = conditionsText;
      this.eFilterInput.disabled = true;
      return;
    }

    // SINGLE CONDITION SYNC LOGIC
    if (parentModel.rawUserInput) {
      this.eFilterInput.value = parentModel.rawUserInput;
      return;
    }

    const format = (sec) => sec != null ? hhmm_short({ value: sec }) : '';

    if (parentModel.type === 'inRange') {
       this.eFilterInput.value = `${format(parentModel.filter)} - ${format(parentModel.filterTo)}`;
    } else if (parentModel.type === 'greaterThanOrEqual') {
       this.eFilterInput.value = `>= ${format(parentModel.filter)}`;
    } else if (parentModel.type === 'lessThanOrEqual') {
       this.eFilterInput.value = `<= ${format(parentModel.filter)}`;
    } else if (parentModel.type === 'greaterThan') {
       this.eFilterInput.value = `> ${format(parentModel.filter)}`;
    } else if (parentModel.type === 'lessThan') {
       this.eFilterInput.value = `< ${format(parentModel.filter)}`;
    } else {
       this.eFilterInput.value = format(parentModel.filter);
    }
  }

  /**
   * Retrieves the raw compiled component UI element structure mapping.
   * 
   * @returns {HTMLElement} 
   */
  getGui() {
    return this.eGui[0];
  }

  /**
   * Purges floating popups avoiding accumulation.
   * 
   * @returns {void}
   */
  destroy() {
    if (this.customTooltip) {
      this.customTooltip.remove();
    }
  }
}



/**
 * User input text is parsed into a mathematical Date filter object.
 * Partial dates or text (like "Unknown") are detected and mapped to string matching.
 * "!= " inputs are mapped to notEqual with whole-day coverage when no time is supplied.
 * 
 * @param {string} val - Unformatted date payload entered dynamically.
 * @returns {Object|null}
 */
function parseDateFilterText(val) {
  if (!val) return null;
  val = val.trim();

  let type = 'equals';
  let dateFrom = null;
  let dateTo = null;

  let isNotEqual = val.startsWith('!=');
  let isGreaterThanOrEqual = !isNotEqual && val.startsWith('>=');
  let isLessThanOrEqual = !isNotEqual && val.startsWith('<=');
  let isGreaterThan = !isNotEqual && !isGreaterThanOrEqual && val.startsWith('>');
  let isLessThan = !isNotEqual && !isLessThanOrEqual && val.startsWith('<');
  let isRange = val.includes(' - ');

  if (isRange) {
    let parts = val.split(' - ');
    let fromStr = parts[0].trim();
    let toStr = parts[1] ? parts[1].trim() : null;
    
    type = 'inRange';
    dateFrom = fromStr.includes(':') ? fromStr : `${fromStr} 00:00:00`;
    if (toStr) {
      dateTo = toStr.includes(':') ? toStr : `${toStr} 23:59:59`;
    }
  } else {
    let rawDate = val.replace(/^[><!=]+\s*/, '').trim();
    // Premature evaluation is avoided while typing operators before a value is entered
    if (!rawDate) return null;

    let hasTime = rawDate.includes(':');

    let testDateStr = hasTime ? rawDate : `${rawDate} 00:00:00`;
    let testDate = new Date(testDateStr.replace(' ', 'T')).getTime();

    // If it does not start with a 4-digit year, it is treated as a text match (e.g. "Unknown" or "04-14")
    if (isNaN(testDate) || !rawDate.match(/^\d{4}/)) {
      if (isNotEqual) {
        return { type: 'notEqual', filterText: rawDate, rawUserInput: val };
      }
      return { type: 'contains', filterText: rawDate, rawUserInput: val };
    }

    if (isNotEqual) {
      type = 'notEqual';
      dateFrom = hasTime ? rawDate : `${rawDate} 00:00:00`;
      dateTo = hasTime ? null : `${rawDate} 23:59:59`;
    } else if (isGreaterThanOrEqual) {
      type = 'greaterThanOrEqual';
      dateFrom = hasTime ? rawDate : `${rawDate} 00:00:00`;
    } else if (isLessThanOrEqual) {
      type = 'lessThanOrEqual';
      dateFrom = hasTime ? rawDate : `${rawDate} 23:59:59`;
    } else if (isGreaterThan) {
      type = 'greaterThan';
      dateFrom = hasTime ? rawDate : `${rawDate} 23:59:59`;
    } else if (isLessThan) {
      type = 'lessThan';
      dateFrom = hasTime ? rawDate : `${rawDate} 00:00:00`;
    } else {
      if (hasTime) {
        type = 'equals';
        dateFrom = rawDate;
      } else {
        type = 'equals'; 
        dateFrom = `${rawDate} 00:00:00`;
        dateTo = `${rawDate} 23:59:59`;
      }
    }
  }

  return { type, dateFrom, dateTo, rawUserInput: val };
}

/**
 * User input text is parsed into a mathematical TimeInterval filter object.
 * Returns null if the input is invalid or empty.
 * 
 * @param {string} val - Unformatted mathematical equation entered dynamically.
 * @returns {Object|null}
 */
function parseTimeFilterText(val) {
  if (!val) return null;
  val = val.trim();

  let type = 'equals';
  let secFrom = null;
  let secTo = null;

  let isGreaterThanOrEqual = val.startsWith('>=');
  let isLessThanOrEqual = val.startsWith('<=');
  let isGreaterThan = !isGreaterThanOrEqual && val.startsWith('>');
  let isLessThan = !isLessThanOrEqual && val.startsWith('<');
  let isRange = val.includes(' - ');

  if (isRange) {
    type = 'inRange';
    let parts = val.split(' - ');
    secFrom = parseTimeToSeconds(parts[0]);
    secTo = parseTimeToSeconds(parts[1]);
  } else {
    let rawTimeText = val.replace(/^[><=]+\s*/, '').trim();
    secFrom = parseTimeToSeconds(rawTimeText);

    if (isGreaterThanOrEqual) type = 'greaterThanOrEqual';
    else if (isLessThanOrEqual) type = 'lessThanOrEqual';
    else if (isGreaterThan) type = 'greaterThan';
    else if (isLessThan) type = 'lessThan';
  }

  if (secFrom === null) return null;

  return { type, filter: secFrom, filterTo: secTo, rawUserInput: val };
}
