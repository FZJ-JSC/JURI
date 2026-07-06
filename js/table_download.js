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
    view.gridApi.exportDataAsCsv({columnSeparator: ';'})
  }
}

function download_table_pdf() {

  if (get_visible_table_length() > 1000) { 
    alert("The table is too long to be downloaded as PDF. Please filter the table to reduce the number of rows <= 1000.");
    return;
  }
  var dlm = ";";
  const csvData = get_table_data();
  if (!view.gridApi) dlm = ";";
  if (!csvData) { alert("No data to download!"); return; }
  // check if csvData has valid csv data (at least 2 rows and 2 columns)
  const csvDatalines = csvData.trim().split('\n');
  if (csvDatalines.length < 3) { alert("No data to download!"); return; }
  const firstRow = csvDatalines[0].split(dlm);
  if (firstRow.length < 2) { alert("No data to download!"); return; }

  //const displayedCols  = view.gridApi.getAllDisplayedColumns();
  const rows = csvDatalines
    .map(line => { const cells = line.trim().split(dlm); return cells.map(c => c.replace(/^"|"$/g, '')); })
    .map((row, i) => {
      if (i === 0) {
        const out = [];
        for (let idx = 0; idx < row.length; idx++) {
          const txt = row[idx];
          if(txt=="" && idx==0) { out.push({ text: '', style: 'tableHeader', '_colSpan': 1, 'alignment': 'center' }); continue; }
          else if (txt == "") { out.push({});continue;}
          let colSpan = 1, j = idx + 1;
          while (j < row.length && (row[j]== "")) { colSpan++; j++; }
          out.push({ text: txt, style: 'tableHeader', '_colSpan': colSpan,'alignment': 'center' });
          for (let k = 1; k < colSpan; k++) { out.push({}); }
          idx = j - 1; 
        }
        return out;
      }
      if (i === 1) { return row.map(txt => ({ text: txt, style: 'tableHeader', 'alignment': 'center'})); }
      else { return row.map(txt => ({ text: txt, style: 'cell'})); }
    });

    //filter out last three cols if they are reports for html/pdf .. etc
    const n = rows[0].length;
    // in case ai reports are disabled, last 2, otherwise last 3 cols
    if (rows[0][n-2].text == "Reports") { for (let i = 0; i < rows.length; i++) { rows[i].splice(n-2, 2); } }
    else if (rows[0][n-3].text == "Reports") { for (let i = 0; i < rows.length; i++) { rows[i].splice(n-3, 3); } }

    // const colCount = rows[1].length;
    // const maxLen = new Array(colCount).fill(0);

    // const scaleFactor = 0.6;                
    // const fixedWidths = displayedCols.map(col => {
    //   const px = col.getActualWidth();      
    //   const pt = Math.round(px * 0.75);     
    //   return Math.max(30, Math.round(pt * scaleFactor)); // never smaller than ~30 pt
    // }); 

    const docDef = {
      pageOrientation: 'landscape',
      pageSize: 'A2',
      pageMargins: [10, 10, 10, 10],
      content: [
        {
          layout: 'headerLineOnly', 
          style: 'table',
          table: {
            headerRows: 2,
            //widths: fixedWidths, 
            widths: rows[1].map(() => '*'), // auto width for all columns 
            body: rows                      
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E0E0E0',
            vLineColor: () => '#E0E0E0',
            fillColor: (rowIdx) => (rowIdx % 2 ? null : '#dfdddd'),
          }
        }
      ],
      styles: {
        cell:   { fontSize: 8 },
        tableHeader: { bold: true, fontSize: 8, color: '#ffffff', fillColor: '#023d6b' },
        table: { margin: [0, 0, 0, 0]}
      }
    };
    pdfMake.createPdf(docDef).download(view.selected_page + '_LLview.pdf');

}



function get_table_data() {
  if ($("#main_content table").length) {
    const $tbl = $("#main_content table");
    return extractTableCSV($tbl, ";");
  } else if (view.gridApi) {
    return view.gridApi.getDataAsCsv({columnSeparator : ';'});
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
    let download_link_pdf = $("<a>").attr("aria-label","Download as PDF").attr("id","download_link_pdf").append($("<span>").addClass("fa fa-file-pdf-o").attr("title","Download as PDF (up to 1000 rows)")).click(function(){download_table_pdf(); return false;});
    view.add_to_footer_infoline(download_link[0],40);
    view.add_to_footer_infoline(download_link_pdf[0],80);
  }
}