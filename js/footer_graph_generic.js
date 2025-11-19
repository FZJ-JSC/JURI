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

var fixed_params = {};
var graphs = {};

function resize_graph(size) {
    switch (size) {
    case "small":
        $("#footer_graphs").show();
        $("#footer_graphs").removeClass("large");
        show_graph({},false);
        break;
    case "large":
        $("#footer_graphs").show();
        $("#footer_graphs").addClass("large");
        show_graph({},false);
        break;
    case "hidden":
        $("#footer_graphs").hide();
        break;
    }
    resize();
}

function add_event_handler_generic(keys) {
    let indices = {}
    for (let key in keys) {
        indices[keys[key]] = -1;
    }
    for (let key in indices) {
        $("#main_content table thead tr:first").find("th").each(function(idx) {
            if($(this).text() == key) {
                indices[key] = idx;
                return false;
            }
        });
    }
    $("#main_content table tbody tr").click(function() {
        $("#main_content table tbody tr").removeClass("selected");
        $(this).addClass("selected");
        let params = {};
        for (let key in keys) {
            params[key] = $($(this).find("td")[indices[keys[key]]]).text()
        }
        show_graph(params);
    });

    function scroll(event) {
        if([38, 40].indexOf(event.keyCode) == -1) {
            return
        }
        let current_selected = $("#main_content table tbody tr.selected");
        if (current_selected.length == 0) {
            return;
        }
        event.preventDefault();
        if (event.keyCode == 38) {
            var new_selected = current_selected.prevAll(":visible").first();
        } else {
            var new_selected = current_selected.nextAll(":visible").first();
        }
        if (new_selected.length > 0) {
            current_selected.removeClass("selected");
            new_selected.addClass("selected");
            let speed = 0;
            let newpos = Math.max(0,new_selected.position().top-$("#main_content").height()/2);
            // By default use no animation only for larger jumps use timed animation. Animation at the end of
            // the scrollbar is skipped as well.
            if ((Math.abs($("#main_content").scrollTop() - newpos)>new_selected.height()*2) &&
               ($("#main_content")[0].scrollHeight-new_selected.position().top-$("#main_content").height()/2 > 0)) {
                speed = 400;
            }
            $("#main_content").animate({ scrollTop: newpos}, speed);
            let params = {};
            for (let key in keys) {
                params[key] = $(new_selected.find("td")[indices[keys[key]]]).text()
            }
            show_graph(params);
        }
    }

    $(document).keydown(scroll);
    $("#main_content table tbody tr").addClass("clickable");
    if (! $("#graph_size").length) {
        let control = $("<span>").text("Graph size:").attr("id","graph_size");
        control.append($("<a>").append($("<span>").attr("title","large").addClass("fa fa-angle-up")).click(function(){resize_graph("large"); return false;}));
        control.append($("<a>").append($("<span>").attr("title","small").addClass("fa fa-angle-down")).click(function(){resize_graph("small"); return false;}));
        control.append($("<a>").append($("<span>").attr("title","hidden").addClass("fa fa-angle-double-down")).click(function(){resize_graph("hidden"); return false;}));
        view.add_to_footer_infoline(control[0],20);
    }
}

function clear_graphs_generic(clear_infos) {
    let graphs_exist = true;
    for (let key in graphs) {
        if (! graphs[key]) {
            graphs_exist = false;
        }
    }
    if (graphs_exist) {
        for (let key in graphs) {
            graphs[key].destroy();
        }
        graphs = {};
    }
    clear_infos();
    init_graphs();
}

function legend_formatter(data,show_date) {
    show_date = (typeof show_date === 'undefined')?true:show_date;
    let html = "";
    if (show_date) {
        html += $("<tr>").append($("<td>").text(this.getLabels()[0])).append($("<td>").text(data.xHTML)).wrap('<tbody/>').parent().html();
    }
    data.series.forEach(function(series) {
        if (series.isVisible) {
            let labeledData = $("<tr>").append($("<td>").html(series.dashHTML+" "+series.labelHTML))
            if (data.x == null) {
                labeledData.append($("<td>"));
            } else {
                labeledData.append($("<td>").html(series.yHTML));
            }
            if (series.isHighlighted) {
                labeledData.addClass("active");
            }
            html += labeledData.wrap('<tbody/>').parent().html();
        }
    });
    return html;
}

function show_graph_generic(update_graphs,params,reset_zoom) {
    reset_zoom = (typeof reset_zoom === 'undefined')?true:reset_zoom;
    params = (typeof params === 'undefined')?{}:params;
    for (let key in fixed_params) {
        if (!(key in params)) {
            params[key] = fixed_params[key];
        }
    }
    for (let key in params) {
        fixed_params[key] = params[key];
    }
    let graph_names = Object.keys(graphs);
    if (graph_names.length > 0 && graphs[graph_names[0]]) {
        var zoom = graphs[graph_names[0]].xAxisRange();
    }
    clear_graphs();
    let graphs_exist = true;
    for (let key in graphs) {
        if (! graphs[key]) {
            graphs_exist = false;
        }
    }
    if ((! reset_zoom) && zoom) {
        graphs[graph_names[0]].updateOptions({dateWindow: zoom});
    }
    if (graphs_exist) {
        update_graphs(params);
    }
}

