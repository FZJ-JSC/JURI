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
*/


function extractTableCSV($tbl, sep) {
  const lines = [];

  // header
  const hdr = [];
  $tbl.filter(":visible")
      .find("thead tr:first th")
      .each(function () {
        if ($(this).css("display") !== "none")
          hdr.push(formatData($(this).html()));
      });
  if (hdr.length) lines.push(hdr.join(sep));

  // rows
  $tbl.find("tr").each(function () {
    const r = [];
    $(this).filter(":visible")
          .find("td")
          .each(function () {
            if ($(this).css("display") !== "none")
              r.push(formatData($(this).html()));
          });
    if (r.length) lines.push(r.join(sep));
  });

  return lines.join("\n");
}



function downloadTableCSV(options) {
  const opts = $.extend({ separator: ",", filename: "data.csv" }, options);
  const $tbl = $("#main_content table");
  if (!$tbl.length) return;

  const csvText = extractTableCSV($tbl, opts.separator);
  const blob = new Blob([csvText], { type: "text/csv" });

  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, opts.filename);
  } else {
    const a = document.createElement("a");
    a.download = opts.filename;
    a.href = URL.createObjectURL(blob);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
    document.body.removeChild(a);
  }
}

/*jQuery.fn.table2CSV = function(options) {
  var options = jQuery.extend({
    separator: ',',
    filename: 'data.csv'
  },
  options);

  let csvData = [];
  let tmpRow = [];

  $(this).filter(':visible').find("thead tr:first th").each(function() {
    if ($(this).css('display') != 'none') tmpRow[tmpRow.length] = formatData($(this).html());
  });
  row2CSV(tmpRow);

  $(this).find('tr').each(function() {
    tmpRow = [];
    $(this).filter(':visible').find("td").each(function() {
      if ($(this).css('display') != 'none') tmpRow[tmpRow.length] = formatData($(this).html());
    });
    row2CSV(tmpRow);
  });

  var textFileAsBlob = new Blob([csvData.join('\n')], { type: 'text/csv'});

  if ('msSaveOrOpenBlob' in navigator) {
    navigator.msSaveOrOpenBlob(textFileAsBlob, options.filename);
  } else {
    var downloadLink = document.createElement('a');
    downloadLink.download = options.filename;
    downloadLink.innerHTML = 'Download File';
    if ('webkitURL' in window) {
      // Chrome allows the link to be clicked without actually adding it to the DOM.
      downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    } else {
      // Firefox requires the link to be added to the DOM before it can be clicked.
      downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
      downloadLink.onclick = destroyClickedElement;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
    }
    downloadLink.click();
  }

  function destroyClickedElement(event) {
    document.body.removeChild(event.target);
  }

  function row2CSV(tmpRow) {
    if (tmpRow.length > 0 && tmpRow.join('').trim().length > 0) {
      csvData[csvData.length] = tmpRow.join(options.separator);
    }
  }

  //function formatData(input) {
  //  let output = input.replace(/\<[^\<]+\>/g, ""); //replace HTML
  //  output = output.replace(/&nbsp;/gi,' '); //replace &nbsp;
  //  output=output.replace(/&gt;/g,'>'); //replace &gt;
  //  output=output.replace(/&lt;/g,'<'); //replace &lt;
  //  return output.trim();
  //}

};*/
function formatData(input) {
  return input
    .replace(/\<[^\<]+\>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .trim();
}


jQuery.fn.table2CSV = function (options) {
  downloadTableCSV(options);
};



function download_table() {
  if ($("#main_content table").length) {
    $("#main_content table").table2CSV({
      separator: ';',
      filename: view.selected_page+'.csv'
    });
  } else if (view.gridApi) {
    view.gridApi.exportDataAsCsv()
  }
}

function get_table_to_download_as_pdf() {
  const columns = view.gridApi.getAllDisplayedColumns();
  const headerRow = columns.map((column) => {
    const { field } = column.getColDef();
    const sort = column.getSort();
    const headerNameUppercase = field[0].toUpperCase() + field.slice(1);
    const headerCell = { text: headerNameUppercase + (sort ? ` (${sort})` : ''), };
    return headerCell;
  });
  const rowsToExport = [];
  const getCellToExport = (column, row) => ({ text: view.gridApi.getCellValue(column, row) ?? '' });
  view.gridApi.forEachNodeAfterFilterAndSort((rowNode) => {
    const rowToExport = columns.map((column) => getCellToExport(column, rowNode));
    rowsToExport.push(rowToExport);
  });
  return {
    pageOrientation: 'landscape', // can also be 'portrait'
    content: [
      {
        table: {
          // the number of header rows
          headerRows: 1,
          // the width of each column, can be an array of widths
          widths: `${100 / columns.length}%`,
          // all the rows to display, including the header rows
          body: [headerRow, ...rowsToExport],
          // Header row is 40px, other rows are 15px
          heights: (rowIndex) => (rowIndex === 0 ? 40 : 15),
        },
      },
    ],
  };
}

function download_table_pdf() {
  if (view.gridApi) {
    //const dtd = get_table_to_download_as_pdf();
    //pdfMake.createPdf(dtd).download();

    const csv = view.gridApi.getDataAsCsv();         

    const displayedCols  = view.gridApi.getAllDisplayedColumns();

    const scaleFactor = 0.6;                
    const fixedWidths = displayedCols.map(col => {
      const px = col.getActualWidth();      
      const pt = Math.round(px * 0.75);     
      return Math.max(30, Math.round(pt * scaleFactor)); // never smaller than ~30 pt
    }); 
    
    const rows = csv
      .trim()                                    
      .split('\n')
      .map(line => {
        const cells = line.split(',');
        return cells.map(c => c.replace(/^"|"$/g, ''));
      });

    const docDef = {
      pageOrientation: 'landscape',
      content: [
        {
          table: {
            headerRows: 2,
            widths: fixedWidths, 
            body: rows                      
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E0E0E0',
            vLineColor: () => '#E0E0E0',
            fillColor: (rowIdx) => (rowIdx === 0 ? '#F5F5F5' : (rowIdx % 2 ? null : '#FAFAFA'))
          }
        }
      ],
      styles: {
        header: { bold: true, fontSize: 10 },
        cell:   { fontSize: 9 }
      }
    };
    pdfMake.createPdf(docDef).download();
  }
}



function get_table_data() {
  if ($("#main_content table").length) {
    const $tbl = $("#main_content table");
    return extractTableCSV($tbl, ";");
  } else if (view.gridApi) {
    return view.gridApi.getDataAsCsv();
  }
  return "";
}

function get_visible_table_length() {
  if ($("#main_content table").length) {
    const $tbl = $("#main_content table");
    return $tbl.find("tbody tr:visible").length
  } else if (view.gridApi) {
    return view.gridApi.getDisplayedRowCount();
  }
  return 0;
}

function enable_table_download() {
  if (! $("#download_link").length) {
    let download_link = $("<a>").attr("aria-label","Download as CSV").attr("id","download_link").append($("<span>").addClass("fa fa-download").attr("title","Download as CSV")).click(function(){download_table(); return false;});
    let download_link_pdf = $("<a>").attr("aria-label","Download as PDF").attr("id","download_link_pdf").append($("<span>").addClass("fa fa-file-pdf-o").attr("title","Download as PDF")).click(function(){download_table_pdf(); return false;});
    view.add_to_footer_infoline(download_link[0],40);
    view.add_to_footer_infoline(download_link_pdf[0],80);
  }
}