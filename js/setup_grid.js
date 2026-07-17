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
 * to inherit the active theme.
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
   * Constructs the native-looking filter menu utilizing ag-Grid markup,
   * injecting robust V33 fallback styling to prevent layout collapses during lazy-loading.
   * 
   * @returns {void}
   */
  buildGui() {
    this.eGuiWrapper = $('<div>').addClass('ag-filter')[0];
    
    // Explicit flex properties guarantee structural integrity even if ag-Grid's core CSS isn't fully loaded
    this.eGui = $('<form>').addClass('ag-filter-wrapper ag-focus-managed').css({
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      boxSizing: 'border-box'
    })[0];
    
    let bodyWrapper = $('<div>').addClass('ag-filter-body-wrapper ag-simple-filter-body-wrapper');

    let selectContainer = $('<div>').addClass('ag-picker-field ag-labeled ag-label-align-left ag-select ag-filter-select').attr('role', 'presentation');
    let selectLabel = $('<div>').addClass('ag-label ag-hidden').attr('aria-hidden', 'true').attr('role', 'presentation');
    
    // Fallback flex properties ensure the element retains dimensions to correctly calculate dropdown bounds
    this.selectWrapper = $('<div>').addClass('ag-wrapper ag-picker-field-wrapper ag-has-popup-positioned-under')
                                   .attr('tabindex', '0').attr('role', 'combobox').attr('aria-expanded', 'false')
                                   .css({
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'space-between',
                                     width: '100%',
                                     minHeight: 'var(--ag-list-item-height, 30px)',
                                     boxSizing: 'border-box',
                                     cursor: 'pointer',
                                     border: '1px solid var(--ag-input-border-color, var(--ag-border-color, #babfc7))',
                                     borderRadius: 'var(--ag-border-radius, 4px)',
                                     backgroundColor: 'var(--ag-input-background-color, var(--ag-background-color, #ffffff))',
                                     padding: '0 var(--ag-widget-horizontal-spacing, 8px)'
                                   });
    
    this.eDisplayField = $('<div>').addClass('ag-picker-field-display').text('Equals').css({
      flex: '1 1 auto',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
    
    let icon = $('<div>').addClass('ag-picker-field-icon').attr('aria-hidden', 'true')
                         .html('<span class="ag-icon ag-icon-small-down" unselectable="on" role="presentation"></span>');

    this.selectWrapper.append(this.eDisplayField, icon);
    selectContainer.append(selectLabel, this.selectWrapper);

    let filterBody = $('<div>').addClass('ag-filter-body').attr('role', 'presentation').css({
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--ag-widget-vertical-spacing, 8px)',
      marginTop: 'var(--ag-widget-vertical-spacing, 8px)'
    });

    const inputStyleFallback = {
      width: '100%',
      boxSizing: 'border-box',
      minHeight: 'var(--ag-list-item-height, 30px)',
      border: '1px solid var(--ag-input-border-color, var(--ag-border-color, #babfc7))',
      borderRadius: 'var(--ag-border-radius, 4px)',
      backgroundColor: 'var(--ag-input-background-color, var(--ag-background-color, #ffffff))',
      padding: '0 var(--ag-widget-horizontal-spacing, 8px)',
      color: 'var(--ag-text-color, inherit)'
    };

    let input1Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-from ag-filter-filter').attr('aria-hidden', 'false').css({ width: '100%' });
    let input1Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
    let input1Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation').css({ width: '100%' });
    this.eInput1 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                               .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'Filter...').css(inputStyleFallback)[0];
    input1Wrapper.append(this.eInput1);
    input1Container.append(input1Label, input1Wrapper);

    this.eInput2Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-to ag-filter-filter ag-hidden').attr('aria-hidden', 'true').css({ width: '100%' })[0];
    let input2Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
    let input2Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation').css({ width: '100%' });
    this.eInput2 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                               .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'To').css(inputStyleFallback)[0];
    input2Wrapper.append(this.eInput2);
    $(this.eInput2Container).append(input2Label, input2Wrapper);

    filterBody.append(input1Container, this.eInput2Container);
    bodyWrapper.append(selectContainer, filterBody);
    $(this.eGui).append(bodyWrapper);
    $(this.eGuiWrapper).append(this.eGui);

    this.ePopup = $('<div>').addClass('ag-popup').css({ display: 'none' })[0];
    
    // Explicitly uses variables matching ag-Grid V33 theming framework conventions
    this.eList = $('<div>').addClass('ag-list ag-select-list ag-ltr ag-popup-child ag-popup-positioned-under')
                           .attr('role', 'listbox').css({
                             position: 'fixed', 
                             background: 'var(--ag-menu-background-color, var(--ag-background-color, #ffffff))',
                             border: '1px solid var(--ag-border-color, #babfc7)',
                             boxShadow: 'var(--ag-popup-shadow, 0 1px 4px rgba(0,0,0,0.2))',
                             borderRadius: 'var(--ag-border-radius, 4px)',
                             maxHeight: '250px', overflowY: 'auto', zIndex: 999999,
                             padding: 'var(--ag-widget-vertical-spacing, 4px) 0'
                           })[0];
    $(this.ePopup).append(this.eList);

    $(this.ePopup).on('mousedown mouseup click touchstart', (e) => {
      e.stopPropagation();
    });

    this.options = {
      'contains': 'Contains',
      'equals': 'Equals',
      'greaterThan': 'Greater Than',
      'greaterThanOrEqual': 'Greater Than or Equal',
      'lessThan': 'Less Than',
      'lessThanOrEqual': 'Less Than or Equal',
      'inRange': 'In Range'
    };

    this.currentType = 'equals';

    Object.entries(this.options).forEach(([val, label]) => {
      let item = $('<div>').addClass('ag-list-item ag-select-list-item').attr('role', 'option')
                           .html(`<span>${label}</span>`)
                           .css({
                              padding: 'var(--ag-widget-vertical-spacing, 6px) var(--ag-widget-horizontal-spacing, 12px)',
                              cursor: 'pointer',
                              color: 'var(--ag-data-color, var(--ag-text-color, #181d1f))',
                              display: 'flex',
                              alignItems: 'center',
                              lineHeight: 'normal'
                           });
      item.on('click', (e) => {
        e.stopPropagation();
        this.currentType = val;
        $(this.eDisplayField).text(label);
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
        this.onChange();
      });
      item.on('mouseenter', () => item.css('background-color', 'var(--ag-menu-option-active-background-color, var(--ag-row-hover-color, rgba(0,0,0,0.05)))'));
      item.on('mouseleave', () => item.css('background-color', 'transparent'));
      $(this.eList).append(item);
    });

    this.selectWrapper.on('click', (e) => {
      e.stopPropagation();
      let isExpanded = this.selectWrapper.hasClass('ag-picker-expanded');
      
      if (isExpanded) {
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
      } else {
        // Appending strictly to `.ag-root-wrapper` automatically ensures all v33 Theme CSS Variables cascade properly
        if (!this.ePopup.parentNode || this.ePopup.parentNode.tagName === 'BODY') {
            let rootWrapper = $(this.eGuiWrapper).closest('.ag-root-wrapper');
            if (rootWrapper.length > 0) {
                rootWrapper.append(this.ePopup);
            } else {
                $('body').append(this.ePopup);
                let themeParent = $(this.eGuiWrapper).closest('[class*="ag-theme-"]');
                if (themeParent.length > 0) {
                    let cls = themeParent.attr('class').split(' ').find(c => c.startsWith('ag-theme-'));
                    if (cls) $(this.ePopup).addClass(cls);
                }
            }
        }

        let rect = this.selectWrapper[0].getBoundingClientRect();
        
        // Guard against unpredictable width collapses
        let calculatedWidth = Math.max(rect.width, 180);
        $(this.eList).css({
          top: rect.bottom + 'px',
          left: rect.left + 'px',
          width: calculatedWidth + 'px',
          minWidth: calculatedWidth + 'px'
        });
        
        $(this.ePopup).show();
        this.selectWrapper.addClass('ag-picker-expanded').attr('aria-expanded', 'true');
      }
    });

    this.closeDropdown = (e) => {
      if (!e.target || !(e.target instanceof Node)) {
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
        return;
      }
      if (this.ePopup && this.selectWrapper) {
        if (!this.ePopup.contains(e.target) && !this.selectWrapper[0].contains(e.target)) {
          $(this.ePopup).hide();
          this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
        }
      }
    };
    
    document.addEventListener('mousedown', this.closeDropdown, true);
    window.addEventListener('blur', this.closeDropdown);

    this.onChange = () => {
      let type = this.currentType;
      let val1 = this.eInput1.value.trim();
      let val2 = this.eInput2.value.trim();

      if (type === 'inRange') {
        $(this.eInput2Container).removeClass('ag-hidden').attr('aria-hidden', 'false');
      } else {
        $(this.eInput2Container).addClass('ag-hidden').attr('aria-hidden', 'true');
      }

      if (!val1) {
        this.filterModel = null;
        this.params.filterChangedCallback();
        return;
      }

      let syntheticString = '';
      if (type === 'contains' || type === 'equals') {
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

      this.filterModel = parseDateFilterText(syntheticString);
      
      if (this.filterModel && type === 'contains') {
        this.filterModel.type = 'contains';
        this.filterModel.filterText = val1;
      }

      this.params.filterChangedCallback();
    };

    this.eInput1.addEventListener('input', this.onChange);
    this.eInput2.addEventListener('input', this.onChange);
  }

  /**
   * Automates focusing behavior to input fields on open event.
   * 
   * @returns {void}
   */
  afterGuiAttached() {
    if (this.eInput1) {
      setTimeout(() => this.eInput1.focus(), 50);
    }
  }

  /**
   * Retrieves the wrapper element containing all child nodes.
   * 
   * @returns {HTMLElement}
   */
  getGui() {
    return this.eGuiWrapper;
  }

  /**
   * Evaluates if a specified row passes the defined date boundaries.
   * 
   * @param {Object} params - The row evaluation context.
   * @returns {boolean} 
   */
  doesFilterPass(params) {
    if (!this.filterModel) return true;

    let cellValue = this.params.getValue(params.node);
    if (!cellValue) return false;

    if (this.filterModel.type === 'contains') {
      return cellValue.toLowerCase().includes(this.filterModel.filterText.toLowerCase());
    }

    const toTimestamp = (val) => {
      if (!val || typeof val !== 'string') return null;
      return new Date(val.replace(' ', 'T')).getTime();
    };

    let cellTime = toTimestamp(cellValue);
    let fromTime = toTimestamp(this.filterModel.dateFrom);
    
    if (!fromTime || !cellTime) return true;
    
    if (this.filterModel.type === 'equals') {
      if (this.filterModel.dateTo) {
        let toTime = toTimestamp(this.filterModel.dateTo);
        if (!toTime) return cellTime === fromTime;
        return cellTime >= fromTime && cellTime <= toTime;
      }
      return cellTime === fromTime;
    }
    
    if (this.filterModel.type === 'greaterThan') return cellTime > fromTime;
    if (this.filterModel.type === 'greaterThanOrEqual') return cellTime >= fromTime;
    if (this.filterModel.type === 'lessThan') return cellTime < fromTime;
    if (this.filterModel.type === 'lessThanOrEqual') return cellTime <= fromTime;
    if (this.filterModel.type === 'inRange') {
      let toTime = toTimestamp(this.filterModel.dateTo);
      if (!toTime) return cellTime >= fromTime;
      return cellTime >= fromTime && cellTime <= toTime;
    }
    
    return true;
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
    if (!this.filterModel) return null;
    return {
      filterType: 'date',
      type: this.filterModel.type,
      dateFrom: this.filterModel.dateFrom,
      dateTo: this.filterModel.dateTo,
      filterText: this.filterModel.filterText,
      rawUserInput: this.filterModel.rawUserInput
    };
  }

  /**
   * Allows external programmatic overrides matching grid load state.
   * 
   * @param {Object|null} model - The injected model override values.
   * @returns {void}
   */
  setModel(model) {
    this.filterModel = model;
    
    if (!model) {
      this.currentType = 'equals';
      $(this.eDisplayField).text(this.options['equals']);
      this.eInput1.value = '';
      this.eInput2.value = '';
      $(this.eInput2Container).addClass('ag-hidden').attr('aria-hidden', 'true');
      return;
    }

    this.currentType = model.type;
    $(this.eDisplayField).text(this.options[model.type] || 'Equals');
    
    if (model.type === 'inRange') {
      $(this.eInput2Container).removeClass('ag-hidden').attr('aria-hidden', 'false');
    } else {
      $(this.eInput2Container).addClass('ag-hidden').attr('aria-hidden', 'true');
    }

    let raw = model.rawUserInput || '';
    if (model.type === 'inRange') {
      let parts = raw.split(' - ');
      this.eInput1.value = parts[0] ? parts[0].trim() : '';
      this.eInput2.value = parts[1] ? parts[1].trim() : '';
    } else if (model.type === 'contains') {
      this.eInput1.value = model.filterText || raw;
    } else {
      this.eInput1.value = raw.replace(/^[><=]+\s*/, '').trim();
    }
  }

  /**
   * Gracefully removes global dom observers to avoid memory leaking.
   * 
   * @returns {void}
   */
  destroy() {
    document.removeEventListener('mousedown', this.closeDropdown, true);
    window.removeEventListener('blur', this.closeDropdown);
    // Explicitly tell jQuery to wipe the memory cache for this component and all its children
    if (this.eGuiWrapper) $(this.eGuiWrapper).remove();
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
   * 
   * @param {Object} parentModel - Modified filter data model object.
   * @returns {void}
   */
  onParentModelChanged(parentModel) {
    if (!parentModel || (parentModel.dateFrom == null && parentModel.type !== 'contains')) {
      this.eFilterInput.value = '';
      return;
    }

    if (document.activeElement === this.eFilterInput) return;

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
   * 
   * @returns {void}
   */
  buildGui() {
    this.eGuiWrapper = $('<div>').addClass('ag-filter')[0];
    
    // Core flex requirements embedded sequentially against lazy load failures
    this.eGui = $('<form>').addClass('ag-filter-wrapper ag-focus-managed').css({
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      boxSizing: 'border-box'
    })[0];
    
    let bodyWrapper = $('<div>').addClass('ag-filter-body-wrapper ag-simple-filter-body-wrapper');

    let selectContainer = $('<div>').addClass('ag-picker-field ag-labeled ag-label-align-left ag-select ag-filter-select').attr('role', 'presentation');
    let selectLabel = $('<div>').addClass('ag-label ag-hidden').attr('aria-hidden', 'true').attr('role', 'presentation');
    
    this.selectWrapper = $('<div>').addClass('ag-wrapper ag-picker-field-wrapper ag-has-popup-positioned-under')
                                   .attr('tabindex', '0').attr('role', 'combobox').attr('aria-expanded', 'false')
                                   .css({
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'space-between',
                                     width: '100%',
                                     minHeight: 'var(--ag-list-item-height, 30px)',
                                     boxSizing: 'border-box',
                                     cursor: 'pointer',
                                     border: '1px solid var(--ag-input-border-color, var(--ag-border-color, #babfc7))',
                                     borderRadius: 'var(--ag-border-radius, 4px)',
                                     backgroundColor: 'var(--ag-input-background-color, var(--ag-background-color, #ffffff))',
                                     padding: '0 var(--ag-widget-horizontal-spacing, 8px)'
                                   });
    
    this.eDisplayField = $('<div>').addClass('ag-picker-field-display').text('Equals').css({
      flex: '1 1 auto',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
    
    let icon = $('<div>').addClass('ag-picker-field-icon').attr('aria-hidden', 'true')
                         .html('<span class="ag-icon ag-icon-small-down" unselectable="on" role="presentation"></span>');

    this.selectWrapper.append(this.eDisplayField, icon);
    selectContainer.append(selectLabel, this.selectWrapper);

    let filterBody = $('<div>').addClass('ag-filter-body').attr('role', 'presentation').css({
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--ag-widget-vertical-spacing, 8px)',
      marginTop: 'var(--ag-widget-vertical-spacing, 8px)'
    });

    const inputStyleFallback = {
      width: '100%',
      boxSizing: 'border-box',
      minHeight: 'var(--ag-list-item-height, 30px)',
      border: '1px solid var(--ag-input-border-color, var(--ag-border-color, #babfc7))',
      borderRadius: 'var(--ag-border-radius, 4px)',
      backgroundColor: 'var(--ag-input-background-color, var(--ag-background-color, #ffffff))',
      padding: '0 var(--ag-widget-horizontal-spacing, 8px)',
      color: 'var(--ag-text-color, inherit)'
    };

    let input1Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-from ag-filter-filter').attr('aria-hidden', 'false').css({ width: '100%' });
    let input1Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
    let input1Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation').css({ width: '100%' });
    this.eInput1 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                               .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'Filter...').css(inputStyleFallback)[0];
    input1Wrapper.append(this.eInput1);
    input1Container.append(input1Label, input1Wrapper);

    this.eInput2Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-to ag-filter-filter ag-hidden').attr('aria-hidden', 'true').css({ width: '100%' })[0];
    let input2Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
    let input2Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation').css({ width: '100%' });
    this.eInput2 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                               .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'To').css(inputStyleFallback)[0];
    input2Wrapper.append(this.eInput2);
    $(this.eInput2Container).append(input2Label, input2Wrapper);

    filterBody.append(input1Container, this.eInput2Container);
    bodyWrapper.append(selectContainer, filterBody);
    $(this.eGui).append(bodyWrapper);
    $(this.eGuiWrapper).append(this.eGui);

    this.ePopup = $('<div>').addClass('ag-popup').css({ display: 'none' })[0];
    
    // Explicit V33 tokens replacing legacy inline configurations
    this.eList = $('<div>').addClass('ag-list ag-select-list ag-ltr ag-popup-child ag-popup-positioned-under')
                           .attr('role', 'listbox').css({
                             position: 'fixed', 
                             background: 'var(--ag-menu-background-color, var(--ag-background-color, #ffffff))',
                             border: '1px solid var(--ag-border-color, #babfc7)',
                             boxShadow: 'var(--ag-popup-shadow, 0 1px 4px rgba(0,0,0,0.2))',
                             borderRadius: 'var(--ag-border-radius, 4px)',
                             maxHeight: '250px', overflowY: 'auto', zIndex: 999999,
                             padding: 'var(--ag-widget-vertical-spacing, 4px) 0'
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

    this.currentType = 'equals';

    Object.entries(this.options).forEach(([val, label]) => {
      let item = $('<div>').addClass('ag-list-item ag-select-list-item').attr('role', 'option')
                           .html(`<span>${label}</span>`)
                           .css({
                              padding: 'var(--ag-widget-vertical-spacing, 6px) var(--ag-widget-horizontal-spacing, 12px)',
                              cursor: 'pointer',
                              color: 'var(--ag-data-color, var(--ag-text-color, #181d1f))',
                              display: 'flex',
                              alignItems: 'center',
                              lineHeight: 'normal'
                           });
      item.on('click', (e) => {
        e.stopPropagation();
        this.currentType = val;
        this.eDisplayField.text(label);
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
        this.onChange();
      });
      item.on('mouseenter', () => item.css('background-color', 'var(--ag-menu-option-active-background-color, var(--ag-row-hover-color, rgba(0,0,0,0.05)))'));
      item.on('mouseleave', () => item.css('background-color', 'transparent'));
      $(this.eList).append(item);
    });

    this.selectWrapper.on('click', (e) => {
      e.stopPropagation();
      let isExpanded = this.selectWrapper.hasClass('ag-picker-expanded');
      
      if (isExpanded) {
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
      } else {
        // Appending strictly to `.ag-root-wrapper` automatically ensures all v33 Theme CSS Variables cascade properly
        if (!this.ePopup.parentNode || this.ePopup.parentNode.tagName === 'BODY') {
            let rootWrapper = $(this.eGuiWrapper).closest('.ag-root-wrapper');
            if (rootWrapper.length > 0) {
                rootWrapper.append(this.ePopup);
            } else {
                $('body').append(this.ePopup);
                let themeParent = $(this.eGuiWrapper).closest('[class*="ag-theme-"]');
                if (themeParent.length > 0) {
                    let cls = themeParent.attr('class').split(' ').find(c => c.startsWith('ag-theme-'));
                    if (cls) $(this.ePopup).addClass(cls);
                }
            }
        }

        let rect = this.selectWrapper[0].getBoundingClientRect();
        
        // Guard against unpredictable width collapses
        let calculatedWidth = Math.max(rect.width, 180);
        $(this.eList).css({
          top: rect.bottom + 'px',
          left: rect.left + 'px',
          width: calculatedWidth + 'px',
          minWidth: calculatedWidth + 'px'
        });
        
        $(this.ePopup).show();
        this.selectWrapper.addClass('ag-picker-expanded').attr('aria-expanded', 'true');
      }
    });

    this.closeDropdown = (e) => {
      if (!e.target || !(e.target instanceof Node)) {
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
        return;
      }
      if (this.ePopup && this.selectWrapper) {
        if (!this.ePopup.contains(e.target) && !this.selectWrapper[0].contains(e.target)) {
          $(this.ePopup).hide();
          this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
        }
      }
    };
    
    document.addEventListener('mousedown', this.closeDropdown, true);
    window.addEventListener('blur', this.closeDropdown);

    this.onChange = () => {
      let type = this.currentType;
      let val1 = this.eInput1.value.trim();
      let val2 = this.eInput2.value.trim();

      if (type === 'inRange') {
        $(this.eInput2Container).removeClass('ag-hidden').attr('aria-hidden', 'false');
      } else {
        $(this.eInput2Container).addClass('ag-hidden').attr('aria-hidden', 'true');
      }

      if (!val1) {
        this.filterModel = null;
        this.params.filterChangedCallback();
        return;
      }

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

      this.filterModel = parseTimeFilterText(syntheticString);
      this.params.filterChangedCallback();
    };

    this.eInput1.addEventListener('input', this.onChange);
    this.eInput2.addEventListener('input', this.onChange);
  }

  /**
   * Targets input on instantiation directly to elevate usage convenience.
   * 
   * @returns {void}
   */
  afterGuiAttached() {
    if (this.eInput1) {
      setTimeout(() => this.eInput1.focus(), 50);
    }
  }

  /**
   * Retrieves the UI bounding component to integrate it back into dom hierarchies.
   * 
   * @returns {HTMLElement}
   */
  getGui() {
    return this.eGuiWrapper;
  }

  /**
   * Applies the core boolean calculation comparing mathematical data elements.
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

    let filterSecs = this.filterModel.filter;

    if (this.filterModel.type === 'equals') return cellSecs === filterSecs;
    if (this.filterModel.type === 'greaterThan') return cellSecs > filterSecs;
    if (this.filterModel.type === 'greaterThanOrEqual') return cellSecs >= filterSecs;
    if (this.filterModel.type === 'lessThan') return cellSecs < filterSecs;
    if (this.filterModel.type === 'lessThanOrEqual') return cellSecs <= filterSecs;
    if (this.filterModel.type === 'inRange') {
      let toSecs = this.filterModel.filterTo;
      if (toSecs == null) return cellSecs >= filterSecs;
      return cellSecs >= filterSecs && cellSecs <= toSecs;
    }
    return true;
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
    if (!this.filterModel) return null;
    return {
      filterType: 'number',
      type: this.filterModel.type,
      filter: this.filterModel.filter,
      filterTo: this.filterModel.filterTo,
      rawUserInput: this.filterModel.rawUserInput
    };
  }

  /**
   * Syncs and overwrites internal logic natively accommodating saved grids loading routines.
   * 
   * @param {Object|null} model - Input configuration map restoring logic.
   * @returns {void} 
   */
  setModel(model) {
    this.filterModel = model;
    
    if (!model) {
      this.currentType = 'equals';
      this.eDisplayField.text(this.options['equals']);
      this.eInput1.value = '';
      this.eInput2.value = '';
      $(this.eInput2Container).addClass('ag-hidden').attr('aria-hidden', 'true');
      return;
    }

    this.currentType = model.type;
    this.eDisplayField.text(this.options[model.type] || 'Equals');
    
    if (model.type === 'inRange') {
      $(this.eInput2Container).removeClass('ag-hidden').attr('aria-hidden', 'false');
    } else {
      $(this.eInput2Container).addClass('ag-hidden').attr('aria-hidden', 'true');
    }

    let raw = model.rawUserInput || '';
    if (model.type === 'inRange') {
      let parts = raw.split(' - ');
      this.eInput1.value = parts[0] ? parts[0].trim() : '';
      this.eInput2.value = parts[1] ? parts[1].trim() : '';
    } else {
      this.eInput1.value = raw.replace(/^[><=]+\s*/, '').trim();
    }
  }

  /**
   * Safely eliminates bindings manually avoiding heavy DOM footprints passively persisting.
   * 
   * @returns {void}
   */
  destroy() {
    document.removeEventListener('mousedown', this.closeDropdown, true);
    window.removeEventListener('blur', this.closeDropdown);
    // Explicitly tell jQuery to wipe the memory cache for this component and all its children
    if (this.eGuiWrapper) $(this.eGuiWrapper).remove();
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
   * 
   * @param {Object} parentModel - Configuration state object dynamically provided.
   * @returns {void}
   */
  onParentModelChanged(parentModel) {
    if (!parentModel || parentModel.filter == null) {
      this.eFilterInput.value = '';
      return;
    }

    if (document.activeElement === this.eFilterInput) return;

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
 * Partial dates (like "04-14") or invalid dates are detected and automatically 
 * trigger a 'contains' string search instead of strict mathematical bounds.
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

  let isGreaterThanOrEqual = val.startsWith('>=');
  let isLessThanOrEqual = val.startsWith('<=');
  let isGreaterThan = !isGreaterThanOrEqual && val.startsWith('>');
  let isLessThan = !isLessThanOrEqual && val.startsWith('<');
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
    let rawDate = val.replace(/^[><=]+\s*/, '').trim();
    let hasTime = rawDate.includes(':');

    let testDateStr = hasTime ? rawDate : `${rawDate} 00:00:00`;
    let testDate = new Date(testDateStr.replace(' ', 'T')).getTime();

    if (isNaN(testDate) || !rawDate.match(/^\d{4}/)) {
      return { type: 'contains', filterText: rawDate, rawUserInput: val };
    }

    if (isGreaterThanOrEqual) {
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
