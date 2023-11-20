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

var elementInfo_batch = null;
var jobInfo_batch = null;

function fillTable(jobInfo) {
    $("#jobs thead tr").empty()
    $("#jobs tbody").empty()
    $("#jobs thead tr").append($("<th>").addClass("hidden")).append($("<th>"));
    $(jobInfo).find("header colhead").each(function(){
        let new_col = $("<th>");
        let sort_type = ($(this).attr("sorttype")=="numeric")?"N":"T";
        new_col.click(function(){sort_table(this,sort_type);});
        new_col.text($(this).text());
        new_col.addClass("clickable");
        new_col.append($("<span>").addClass("fa").attr("aria-hidden","true"));
        $("#jobs thead tr").append(new_col)
    });
    $(jobInfo).find("data job").each(function(){
        let id = $(this).attr("id");
        let color = $(this).attr("color");
        let columns = $(this).find("col");
        let new_row = $("<tr>");
        new_row.mousedown(function(){
            highlight(id);
        });
        new_row.mouseup(release);
        new_row.mouseenter(function(){
            hover_mode(id);
        });
        new_row.mouseleave(release_hover_mode);
        var color_box = $("<div>");
        color_box.addClass("color_box");
        color_box.css("background-color", color);
        new_row.append($("<td>").text(id).addClass("hidden"));
        new_row.append($("<td>").append(color_box));
        for (let i=0; i<columns.length; ++i) {
            let new_col = $("<td>");
            new_col.text($(columns[i]).text().trim());
            new_row.append(new_col);
        }
        $("#jobs tbody").append(new_row);
    });
}

function showInfo_batch(id) {
    $("#job_info_batch").empty();
    if ((elementInfo_batch != null) && ($(elementInfo_batch).find("elem[id=\""+id+"\"]"))) {
        $("#job_info_batch").text($(elementInfo_batch).find("elem[id=\""+id+"\"]").text().trim());
    }
}

function getInfo() {
    let info_url = "llview_"+view.page_data.view+"/llview_jobinfo.xml";
    if (view.navdata.data.demo || view.url_data.demo) {
        info_url = "DEMO/" + info_url;
    }
    $.ajax({
        url:info_url,
        success: function(xml) {
            fillTable(xml);
        },
        method:'GET'
    });
}

function addMouseHandlers() {
    let rects = get_svg_elements("rect");
    let polys = get_svg_elements("polygon");
    var addMouseHandler = function() {
        if (this.hasAttribute('jid')) {
            $(this).mousedown(function() {
                highlight(this.getAttribute('jid'));
            });
            $(this).mouseenter(function() {
                hover_mode(this.getAttribute('jid'));
                scrollTable_batch(this.getAttribute('jid'));
            });
            $(this).mouseleave(release_hover_mode);
            $(this).mouseup(release);
        }

    }
    $(rects).each(addMouseHandler);
    $(polys).each(addMouseHandler);
}

function scrollTable_batch(id) {
    var table_rows_batch = $("#jobs tbody tr");
    for (var i=0; i<table_rows_batch.length; ++i) {
        var td = $(table_rows_batch[i]).find("td:first");
        if (td.text() == id) {
            table_rows_batch[i].scrollIntoView(false);
        }
    }
}

function hover_mode(id) {
    $("#jobs tbody tr").find("td:first").filter(function() {return $(this).text() == id}).parent().addClass("highlight");
    let rects = get_svg_elements("rect");
    for (let i = 0; i < rects.length; i++) {
        if (rects[i].hasAttribute('jid') && rects[i].getAttribute('jid') == id) {
            rects[i].setAttribute("stroke-width","2");
        }
    }
    let polys = get_svg_elements("polygon");
    for (let i = 0; i < polys.length; i++) {
        if (polys[i].hasAttribute('jid') && polys[i].getAttribute('jid') == id) {
            polys[i].setAttribute("stroke-width","2");
        }
    } 
}

function release_hover_mode() {
    $("#jobs tbody tr").removeClass("highlight");
    let rects =  get_svg_elements("rect");
    for (let i = 0; i < rects.length; i++) {
        if (rects[i].hasAttribute('jid')) {
            if (rects[i].hasAttribute('stroke-width')) {
                rects[i].setAttribute("stroke-width","1");
            }
        }
    }
    let polys = get_svg_elements("polygon");
    for (let i = 0; i < polys.length; i++) {
        if(polys[i].hasAttribute('jid')) {
            if (polys[i].hasAttribute('stroke-width')) {
                polys[i].setAttribute("stroke-width","1");
            }
        }
    }
}

function get_svg_elements(name) {
    let svg = document.getElementById("svg_img");
    if (svg != null) {
        let svgDoc = svg.contentDocument;
        if (svgDoc != null) {
            return svgDoc.getElementsByTagName(name);
        }
    }
    return null;
}

function highlight(id) {
    //showInfo_batch(id);
    let rects =  get_svg_elements("rect");
    for (let i = 0; i < rects.length; i++) {
        if (rects[i].hasAttribute("jid")) {
            if (! rects[i].hasAttribute("stored_fill")) {
                rects[i].setAttribute("stored_fill",rects[i].getAttribute("fill"));
            }
            if (rects[i].getAttribute("jid") != id)  {
                rects[i].setAttribute("fill","#CCCCCC");
            }
        }
    }
    let polys = get_svg_elements("polygon");
    for (let i = 0; i < polys.length; i++) { 
        if(polys[i].hasAttribute("jid")) {
            if (! polys[i].hasAttribute("stored_style")) {
                polys[i].setAttribute("stored_style",polys[i].getAttribute("style"));
            }
            if (polys[i].getAttribute("jid") != id)  {
                polys[i].setAttribute("style","fill: #CCCCCC; stroke: rgb(0,0,0); strokewidth: 0");
            }
        }
    }
}

function release() {
    let rects = get_svg_elements("rect");
    for (let i = 0; i < rects.length; i++) {
        if (rects[i].hasAttribute("stored_fill")) {
            rects[i].setAttribute("fill",rects[i].getAttribute("stored_fill"));
            rects[i].removeAttribute("stored_fill");
        }
    }
    let polys = get_svg_elements("polygon");
    for (let i = 0; i < polys.length; i++) {
        if (polys[i].hasAttribute("stored_style")) {
            polys[i].setAttribute("style",polys[i].getAttribute("stored_style"));
            polys[i].removeAttribute("stored_style");
        }
    }
}

function load_svg() {
    let new_object = $("<object>");
    new_object[0].addEventListener('load',load_svg_done,true);
    var queryString = '?reload=' + new Date().getTime();
    let svg_url = `llview_${view.page_data.view}/llview.svg${queryString}`;
    if (view.navdata.data.demo || view.url_data.demo) {
        svg_url = "DEMO/" + svg_url;
    }
    new_object.attr("data",svg_url);
    new_object.attr("id","svg_img_tmp");
    new_object.attr("type","image/svg+xml");
    new_object.css("position","absolute").css("left","-9999px");
    $("#svg_wrapper").append(new_object);
    getInfo();
}

function scale_svg(svg) {
    if (svg != null) {
        let svgDoc = svg.contentDocument;
        if (svgDoc != null && svgDoc.getElementsByTagName("svg")[0]) {
            let svg_width = svgDoc.getElementsByTagName("svg")[0].getAttribute("width");
            let svg_height = svgDoc.getElementsByTagName("svg")[0].getAttribute("height");
            let scale = ($("#main_content").width()-($("#info_area").is(":visible")?0.3*$("#main_content").width():0))/svg_width;
            scale = Math.min(scale,($(window).height()-$("#header").height()-$("footer").height()-20)/svg_height);
            $(svg).width(svg_width*scale);
            $(svg).height(svg_height*scale);
            let nodes = svgDoc.getElementsByTagName("svg")[0].childNodes;
            for (let i=0; i<nodes.length; ++i) {
                let elem = nodes[i];
                if (!(elem instanceof Text) && !(elem instanceof Comment)) {
                    try {
                        elem.setAttribute("transform", "scale("+scale+")");
                    } catch (e) {}
                }
            }
        }
    }
    $("#info_area").css("margin-left", $(svg).width()+5);
    $("#jobs_wrapper").css("height",$(svg).height());
}

function load_svg_done() {
    this.removeEventListener('load',load_svg_done,true);
    scale_svg(document.getElementById("svg_img_tmp"));
    $("#svg_img").remove();
    $("#svg_img_tmp").attr("id","svg_img");
    $("#svg_img").css("position","").css("left","");
    addMouseHandlers();
    set_initial_sort();
    view.loading(false);
}

function init_llview() {
    load_svg();
    view.resize_function.push(function(){scale_svg(document.getElementById("svg_img"));});
    // view.runningTimer.push(setInterval(load_svg, 60000));
}

