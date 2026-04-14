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
    initialState: view.gridState[view.clicked_page]??null, // Recovering state, if existing
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
        dataTypeMatcher: (value) => typeof value === "number",
      }
    },

    defaultColDef: {          // Default definitions for the columns
      sortable: true,                     // Allow sorting
      filter: 'agTextColumnFilter',       // Default filter by text
      resizable: true,                    // Allow resize of this column
      floatingFilter: true,               // Activate the floating filter
      suppressFloatingFilterButton: true, // Hide the filter button beside the floating filter
      suppressHeaderMenuButton:false,     // Show (false) or hide (true) the filter menu from the header
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
    //   // type: 'fitGridWidth',             // ...to fit GridWidth
    //   // defaultMinWidth: 100
    // },

    // suppressColumnVirtualisation: true, // Supress column virtualisation to take into account non-visible columns in resizing columns, for example
    // suppressRowVirtualisation: true, // Supress row virtualisation to take into account non-visible rows in resizing columns, for example
    headerHeight: 25,                   // Height of header row
    floatingFiltersHeight: 25,          // Header of floating filter row
    rowHeight: 25,                      // Default height of rows
    rowSelection: 'single',             // Select the entire row when clicking (a single one is allowed to be selected)
    suppressRowClickSelection: view.footer_graph_config?false:true, // Disable row selection when there's no footer
    rowMultiSelectWithClick: true,      // Allow row de-selection
    onRowSelected: onRowSelected,       // Function to run when a row is selected
    onModelUpdated: onChange,           // To run when displayed rows have changed. Triggered after sort, filter or tree expand / collapse events.
    navigateToNextCell: navigateToNextCell, // To navigate using arrow keys
    onFilterChanged: onFilterChanged,   // To run after filtering 
    onSortChanged: onSortChanged,       // To run after sorting
    onVirtualColumnsChanged: resizeGrid,  // To run when the list of rendered columns changed (only columns in the visible scrolled viewport are rendered by default).
    onColumnVisible: resizeGrid,          // To run when a column, or group of columns, was hidden / shown.
    onColumnGroupOpened: resizeGrid,      // A column group was opened / closed.
    // onFirstDataRendered: onFirstData,   // Fired the first time data is rendered into the grid. 
    // onGridReady: onGridReady,           // When the grid is ready
    onStateUpdated: onStateUpdated,     // Grid state has been updated.
    // onRowDataUpdated: onGridReady,
    // suppressCellFocus: true,            // Turn off cell focus (if turning on, can't move selection with arrows)
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
  
  // Adding a 'clear filter' for the given column
  clear_column_filter_link = $('<a>').css('display','flex')
                                     .attr('aria-label','Clear column filter')
                                     .attr('data-toggle','tooltip')
                                     .attr('data-original-title','Clear column filter')
                                     .attr('title','')
  clear_column_filter_link.click(function(e) {
                                  e.stopPropagation(); // Stopping the event to propagate to the sort
                                  // Gets the column Header from the sibling, transform to 'Name' and clear the filter of the specific column
                                  clear_filter(view.headerToName[view.clicked_page][$(this).siblings( ".ag-header-cell-text" ).text()])
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

// function onGridReady(event) {
//   resizeGrid()
// }

function onStateUpdated(event) {
  // Autosizing columns to fit content when there are too many of them (except when it's a horizontal scroll that changes the virtual columns)
  if ((typeof event.sources == 'array')&&(!['scroll','filter','columnSizing'].includes(event.sources[0]))) {
    resizeGrid()
  }
}

/**
 * Resize Grid according to the number of columns and window width
 */
function resizeGrid() {
  let content_width = $('#main_content').width();
  let num_displayed_cols = view.gridApi.getAllDisplayedColumns().length;
  if ((num_displayed_cols*93 > content_width)) {
    view.gridApi.autoSizeAllColumns(false);
  } else {
    view.gridApi.sizeColumnsToFit();
    // view.gridApi.sizeColumnsToFit({defaultMinWidth: content_width/num_displayed_cols});
  }
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
  view.initial_data.sort = event.columns.filter(function (s) {
                              return s.sort != null;
                            }).map(function (s) {
                              return { colId: view.nameToHeader[view.clicked_page][s.colId], sort: s.sort };
                            })[0];
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

// function onFirstData() {
//   view.gridApi.resetColumnState();
// }

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
          if (typeof onFilterChanged === "function") onFilterChanged();
        });  
      } else if (this.eFilterInput.value.startsWith('<=')) {
        let original = this.eFilterInput.value;
        let number = this.eFilterInput.value.slice(2);
        if (!number.match(/^\d*\.?\d*$/)) return;
        this.currentValue = Number(number);
        params.parentFilterInstance(instance => {
          instance.onFloatingFilterChanged('lessThanOrEqual', this.currentValue);
          this.eFilterInput.value = original;
          if (typeof onFilterChanged === "function") onFilterChanged();
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

      if (text && text.split('').some((c) => {if (c instanceof string) !pattern.test(c)})) {
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
  init(params) {
    this.params = params;
    this.filterModel = null;
    this.buildGui();
  }

  /**
   * A native-looking filter menu is constructed using identical ag-Grid markup
   */
  buildGui() {
    // The main wrapper is built strictly using native classes without manual sizing constraints
    this.eGuiWrapper = $('<div>').addClass('ag-filter')[0];
    this.eGui = $('<form>').addClass('ag-filter-wrapper ag-focus-managed')[0];
    let bodyWrapper = $('<div>').addClass('ag-filter-body-wrapper ag-simple-filter-body-wrapper');

    let selectContainer = $('<div>').addClass('ag-picker-field ag-labeled ag-label-align-left ag-select ag-filter-select').attr('role', 'presentation');
    let selectLabel = $('<div>').addClass('ag-label ag-hidden').attr('aria-hidden', 'true').attr('role', 'presentation');
    this.selectWrapper = $('<div>').addClass('ag-wrapper ag-picker-field-wrapper ag-has-popup-positioned-under')
                                   .attr('tabindex', '0').attr('role', 'combobox').attr('aria-expanded', 'false');
    
    this.eDisplayField = $('<div>').addClass('ag-picker-field-display').text('Equals');
    let icon = $('<div>').addClass('ag-picker-field-icon').attr('aria-hidden', 'true')
                         .html('<span class="ag-icon ag-icon-small-down" unselectable="on" role="presentation"></span>');

    this.selectWrapper.append(this.eDisplayField, icon);
    selectContainer.append(selectLabel, this.selectWrapper);

    let filterBody = $('<div>').addClass('ag-filter-body').attr('role', 'presentation');

    let input1Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-from ag-filter-filter').attr('aria-hidden', 'false');
    let input1Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
    let input1Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation');
    this.eInput1 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                               .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'Filter...')[0];
    input1Wrapper.append(this.eInput1);
    input1Container.append(input1Label, input1Wrapper);

    this.eInput2Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-to ag-filter-filter ag-hidden').attr('aria-hidden', 'true')[0];
    let input2Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
    let input2Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation');
    this.eInput2 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                               .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'To')[0];
    input2Wrapper.append(this.eInput2);
    $(this.eInput2Container).append(input2Label, input2Wrapper);

    filterBody.append(input1Container, this.eInput2Container);
    bodyWrapper.append(selectContainer, filterBody);
    $(this.eGui).append(bodyWrapper);
    $(this.eGuiWrapper).append(this.eGui);

    // The popup wrapper is appended directly to the body to prevent layout clipping
    this.ePopup = $('<div>').addClass('ag-theme-balham ag-popup').css({
      display: 'none'
    })[0];
    
    // Fixed positioning is used so the popup maps perfectly to viewport coordinates
    this.eList = $('<div>').addClass('ag-list ag-select-list ag-ltr ag-popup-child ag-popup-positioned-under')
                           .attr('role', 'listbox').css({
                             position: 'fixed', background: 'white',
                             border: '1px solid var(--ag-borders-color, #bdc3c7)',
                             boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                             maxHeight: '250px', overflowY: 'auto', zIndex: 999999
                           })[0];
    $(this.ePopup).append(this.eList);
    $('body').append(this.ePopup);

    // Event propagation is halted on the detached popup so ag-Grid is unaware of interactions
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

    // The dropdown options are generated and click events are assigned
    Object.entries(this.options).forEach(([val, label]) => {
      let item = $('<div>').addClass('ag-list-item ag-select-list-item').attr('role', 'option')
                           .html(`<span>${label}</span>`);
      item.on('click', (e) => {
        e.stopPropagation();
        this.currentType = val;
        $(this.eDisplayField).text(label);
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
        this.onChange();
      });
      item.on('mouseenter', () => item.css('background-color', 'var(--ag-row-hover-color, #f5f7f7)'));
      item.on('mouseleave', () => item.css('background-color', 'transparent'));
      $(this.eList).append(item);
    });

    // The popup display is toggled on click and positioned explicitly via screen coordinates
    this.selectWrapper.on('click', (e) => {
      e.stopPropagation();
      let isExpanded = this.selectWrapper.hasClass('ag-picker-expanded');
      
      if (isExpanded) {
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
      } else {
        // Viewport bounding rectangle guarantees exact screen positioning for the fixed element
        let rect = this.selectWrapper[0].getBoundingClientRect();
        
        $(this.eList).css({
          top: rect.bottom + 'px',
          left: rect.left + 'px',
          width: rect.width + 'px',
          minWidth: rect.width + 'px'
        });
        
        $(this.ePopup).show();
        this.selectWrapper.addClass('ag-picker-expanded').attr('aria-expanded', 'true');
      }
    });

    // The event target is verified as a DOM Node to prevent crashes on window blur events
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

    // Changes in the inputs trigger a sync with the grid
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
   * The cursor is automatically placed in the input box when the menu is opened
   */
  afterGuiAttached() {
    if (this.eInput1) {
      setTimeout(() => this.eInput1.focus(), 50);
    }
  }

  getGui() {
    return this.eGuiWrapper;
  }

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
    
    if (this.filterModel.type === 'equals') return cellTime === fromTime;
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

  isFilterActive() {
    return this.filterModel != null;
  }

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
      let parts = raw.split('-');
      this.eInput1.value = parts[0] ? parts[0].trim() : '';
      this.eInput2.value = parts[1] ? parts[1].trim() : '';
    } else if (model.type === 'contains') {
      this.eInput1.value = model.filterText || raw;
    } else {
      this.eInput1.value = raw.replace(/^[><=]+\s*/, '').trim();
    }
  }

  destroy() {
    document.removeEventListener('mousedown', this.closeDropdown, true);
    window.removeEventListener('blur', this.closeDropdown);
    if (this.ePopup) $(this.ePopup).remove();

    if (this.params && this.params.api && this.params.column) {
      let currentModel = this.params.api.getFilterModel();
      let myColId = this.params.column.getColId();
      if (currentModel[myColId]) {
        delete currentModel[myColId];
        this.params.api.setFilterModel(currentModel);
      }
    }
  }
}

/**
 * Class DateFloatingFilterComponent
 * 
 * The default ag-Grid date picker is replaced with a smart text-based input field. 
 * This allows dates, times, and complex operators (like >=, <=, >, <, and ranges) 
 * to be quickly typed using pure text.
 * 
 * User text is explicitly translated into exact temporal boundaries:
 * - Day Exact:  "2026-04-07"    -> InRange (2026-04-07 00:00:00 to 2026-04-07 23:59:59)
 * - Day >=:     ">= 2026-04-07" -> GreaterThanOrEqual (2026-04-07 00:00:00)
 * - Day >:      "> 2026-04-07"  -> GreaterThan (2026-04-07 23:59:59)
 * - Day <=:     "<= 2026-04-07" -> LessThanOrEqual (2026-04-07 23:59:59)
 * - Day <:      "< 2026-04-07"  -> LessThan (2026-04-07 00:00:00)
 * - string:     "04-07"         -> contains the string
 */
let uniqueDateIdCounter = 0; 

class DateFloatingFilterComponent {
  
  init(params) {
    this.params = params;
    
    this.eGui = $('<div>').addClass('ag-floating-filter-input').attr('role', 'presentation');
    let div = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field');
    let eWrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper');
    
    let input = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                            .attr('type', 'text')
                            // .attr('placeholder', 'YYYY-MM-DD or >...') 
                            .attr('id', `ag-custom-date-${uniqueDateIdCounter++}-input`)
                            .attr('autocomplete', 'off');
    
    eWrapper.append(input);
    div.append(eWrapper);
    this.eGui.append(div);
    this.eFilterInput = this.eGui.find('input')[0];

    this.customTooltip = $('<div>')
        .css({
            position: 'absolute', 
            zIndex: '999999',      
            backgroundColor: 'rgba(0, 0, 0, 0.85)', 
            color: '#ffffff',                       
            border: 'none',                         
            padding: '8px 12px',                    
            borderRadius: '4px',                    
            boxShadow: '0px 4px 8px rgba(0,0,0,0.2)',
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
            
            if (typeof onFilterChanged === "function") {
                onFilterChanged();
            }
          });
        }
      }, 500); 
    };

    this.eFilterInput.addEventListener('input', onInputBoxChanged);
  }

  onParentModelChanged(parentModel) {
    let activeModels = this.params.api.getFilterModel();
    let myColId = this.params.column.getColId();
    
    if (!activeModels[myColId] || !parentModel || (parentModel.dateFrom == null && parentModel.type !== 'contains')) {
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

  getGui() {
    return this.eGui[0];
  }

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
  init(params) {
    this.params = params;
    this.filterModel = null;
    this.buildGui();
  }

  /**
   * A native-looking filter menu is constructed using identical ag-Grid markup
   */
  buildGui() {
    // The main wrapper is built strictly using native classes without manual sizing constraints
    this.eGuiWrapper = $('<div>').addClass('ag-filter')[0];
    this.eGui = $('<form>').addClass('ag-filter-wrapper ag-focus-managed')[0];
    let bodyWrapper = $('<div>').addClass('ag-filter-body-wrapper ag-simple-filter-body-wrapper');

    let selectContainer = $('<div>').addClass('ag-picker-field ag-labeled ag-label-align-left ag-select ag-filter-select').attr('role', 'presentation');
    let selectLabel = $('<div>').addClass('ag-label ag-hidden').attr('aria-hidden', 'true').attr('role', 'presentation');
    this.selectWrapper = $('<div>').addClass('ag-wrapper ag-picker-field-wrapper ag-has-popup-positioned-under')
                                   .attr('tabindex', '0').attr('role', 'combobox').attr('aria-expanded', 'false');
    
    this.eDisplayField = $('<div>').addClass('ag-picker-field-display').text('Equals');
    let icon = $('<div>').addClass('ag-picker-field-icon').attr('aria-hidden', 'true')
                         .html('<span class="ag-icon ag-icon-small-down" unselectable="on" role="presentation"></span>');

    this.selectWrapper.append(this.eDisplayField, icon);
    selectContainer.append(selectLabel, this.selectWrapper);

    let filterBody = $('<div>').addClass('ag-filter-body').attr('role', 'presentation');

    let input1Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-from ag-filter-filter').attr('aria-hidden', 'false');
    let input1Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
    let input1Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation');
    this.eInput1 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                               .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'Filter...')[0];
    input1Wrapper.append(this.eInput1);
    input1Container.append(input1Label, input1Wrapper);

    this.eInput2Container = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field ag-filter-to ag-filter-filter ag-hidden').attr('aria-hidden', 'true')[0];
    let input2Label = $('<div>').addClass('ag-input-field-label ag-label ag-hidden ag-text-field-label').attr('aria-hidden', 'true').attr('role', 'presentation');
    let input2Wrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper').attr('role', 'presentation');
    this.eInput2 = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                               .attr('type', 'text').attr('tabindex', '0').attr('placeholder', 'To')[0];
    input2Wrapper.append(this.eInput2);
    $(this.eInput2Container).append(input2Label, input2Wrapper);

    filterBody.append(input1Container, this.eInput2Container);
    bodyWrapper.append(selectContainer, filterBody);
    $(this.eGui).append(bodyWrapper);
    $(this.eGuiWrapper).append(this.eGui);

    // The popup wrapper is appended directly to the body to prevent layout clipping
    this.ePopup = $('<div>').addClass('ag-theme-balham ag-popup').css({
      display: 'none'
    })[0];
    
    // Fixed positioning is used so the popup maps perfectly to viewport coordinates
    this.eList = $('<div>').addClass('ag-list ag-select-list ag-ltr ag-popup-child ag-popup-positioned-under')
                           .attr('role', 'listbox').css({
                             position: 'fixed', background: 'white',
                             border: '1px solid var(--ag-borders-color, #bdc3c7)',
                             boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                             maxHeight: '250px', overflowY: 'auto', zIndex: 999999
                           })[0];
    $(this.ePopup).append(this.eList);
    $('body').append(this.ePopup);

    // Event propagation is halted on the detached popup so ag-Grid is unaware of interactions
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

    // The dropdown options are generated and click events are assigned
    Object.entries(this.options).forEach(([val, label]) => {
      let item = $('<div>').addClass('ag-list-item ag-select-list-item').attr('role', 'option')
                           .html(`<span>${label}</span>`);
      item.on('click', (e) => {
        e.stopPropagation();
        this.currentType = val;
        this.eDisplayField.text(label);
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
        this.onChange();
      });
      item.on('mouseenter', () => item.css('background-color', 'var(--ag-row-hover-color, #f5f7f7)'));
      item.on('mouseleave', () => item.css('background-color', 'transparent'));
      $(this.eList).append(item);
    });

    // The popup display is toggled on click and positioned explicitly via screen coordinates
    this.selectWrapper.on('click', (e) => {
      e.stopPropagation();
      let isExpanded = this.selectWrapper.hasClass('ag-picker-expanded');
      
      if (isExpanded) {
        $(this.ePopup).hide();
        this.selectWrapper.removeClass('ag-picker-expanded').attr('aria-expanded', 'false');
      } else {
        // Viewport bounding rectangle guarantees exact screen positioning for the fixed element
        let rect = this.selectWrapper[0].getBoundingClientRect();
        
        $(this.eList).css({
          top: rect.bottom + 'px',
          left: rect.left + 'px',
          width: rect.width + 'px',
          minWidth: rect.width + 'px'
        });
        
        $(this.ePopup).show();
        this.selectWrapper.addClass('ag-picker-expanded').attr('aria-expanded', 'true');
      }
    });

    // The event target is verified as a DOM Node to prevent crashes on window blur events
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

    // Changes in the inputs trigger a sync with the grid
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
   * The cursor is automatically placed in the input box when the menu is opened
   */
  afterGuiAttached() {
    if (this.eInput1) {
      setTimeout(() => this.eInput1.focus(), 50);
    }
  }

  getGui() {
    return this.eGuiWrapper;
  }

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

  isFilterActive() {
    return this.filterModel != null;
  }

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
      let parts = raw.split('-');
      this.eInput1.value = parts[0] ? parts[0].trim() : '';
      this.eInput2.value = parts[1] ? parts[1].trim() : '';
    } else {
      this.eInput1.value = raw.replace(/^[><=]+\s*/, '').trim();
    }
  }

  destroy() {
    document.removeEventListener('mousedown', this.closeDropdown, true);
    window.removeEventListener('blur', this.closeDropdown);
    if (this.ePopup) $(this.ePopup).remove();

    if (this.params && this.params.api && this.params.column) {
      let currentModel = this.params.api.getFilterModel();
      let myColId = this.params.column.getColId();
      if (currentModel[myColId]) {
        delete currentModel[myColId];
        this.params.api.setFilterModel(currentModel);
      }
    }
  }
}


/**
 * Class TimeIntervalFloatingFilterComponent
 * 
 * The default numeric floating filter is replaced with a smart text-based input field.
 * This allows raw seconds to be filtered using human-readable time strings.
 * 
 * SUPPORTED FORMATS:
 * - Exact Match:    "1d 2h 3m 4s" or "1h30m"
 * - Default (Sec):  "300" (Automatically parsed as 300 seconds)
 * - Inequalities:   "> 1h", "< 5m", ">= 1d", "<= 30s"
 * - In Range:       "10m - 1h" (MUST have spaces around the dash!)
 */
let uniqueTimeIdCounter = 0; 

class TimeIntervalFloatingFilterComponent {
  
  init(params) {
    this.params = params; 

    this.eGui = $('<div>').addClass('ag-floating-filter-input').attr('role', 'presentation');
    let div = $('<div>').addClass('ag-labeled ag-label-align-left ag-text-field ag-input-field');
    let eWrapper = $('<div>').addClass('ag-wrapper ag-input-wrapper ag-text-field-input-wrapper');
    
    let input = $('<input>').addClass('ag-input-field-input ag-text-field-input')
                            .attr('type', 'text')
                            // .attr('placeholder', '1h30m or < 5m...') 
                            .attr('id', `ag-custom-time-${uniqueTimeIdCounter++}-input`)
                            .attr('autocomplete', 'off');
    
    eWrapper.append(input);
    div.append(eWrapper);
    this.eGui.append(div);
    this.eFilterInput = this.eGui.find('input')[0];

    this.customTooltip = $('<div>')
        .css({
            position: 'absolute', 
            zIndex: '999999',                       
            backgroundColor: 'rgba(0, 0, 0, 0.85)', 
            color: '#ffffff',                       
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            boxShadow: '0px 4px 8px rgba(0,0,0,0.2)',
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
            
            if (typeof onFilterChanged === "function") {
              onFilterChanged();
            }
          });
        }
      }, 500); 
    };

    this.eFilterInput.addEventListener('input', onInputBoxChanged);
  }

  onParentModelChanged(parentModel) {
    let activeModels = this.params.api.getFilterModel();
    let myColId = this.params.column.getColId();
    
    if (!activeModels[myColId] || !parentModel || parentModel.filter == null) {
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

  getGui() {
    return this.eGui[0];
  }

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

    // Invalid or partial dates are detected to fallback to a 'contains' search.
    // A strict check ensures it at least starts with a 4-digit year.
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
        type = 'inRange';
        dateFrom = `${rawDate} 00:00:00`;
        dateTo = `${rawDate} 23:59:59`;
      }
    }
  }

  // The raw string is injected so the URL generator can retrieve it later
  return { type, dateFrom, dateTo, rawUserInput: val };
}

/**
 * User input text is parsed into a mathematical TimeInterval filter object.
 * Returns null if the input is invalid or empty.
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

  // The raw string is injected so the URL generator can retrieve it later
  return { type, filter: secFrom, filterTo: secTo, rawUserInput: val };
}
