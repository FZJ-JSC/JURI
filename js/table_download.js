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

jQuery.fn.table2CSV = function(options) {
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

    function formatData(input) {
        let output = input.replace(/\<[^\<]+\>/g, ""); //replace HTML
        output = output.replace(/&nbsp;/gi,' '); //replace &nbsp;
        output=output.replace(/&gt;/g,'>'); //replace &gt;
        output=output.replace(/&lt;/g,'<'); //replace &lt;
        return output.trim();
    }
};

function download_table() {
    $("#main_content table").table2CSV({
        separator: ';',
        filename: view.selected_page+'.csv'
    });
}

function enable_table_download() {
    if (! $("#download_link").length) {
        let download_link = $("<a>").attr("href","#").attr("id","download_link").append($("<span>").addClass("fa fa-download").attr("title","Download as CSV")).click(function(){download_table(); return false;});
        view.add_to_footer_infoline(download_link[0],40);
    }
}