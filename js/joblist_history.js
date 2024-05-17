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

function init_dates(active_date) {
  view.initDates(active_date);
}

View.prototype.initDates = function(active_date) {
  let self = this;
  active_date = (typeof(active_date) === "undefined")?0:active_date;
  $("#day_selection").empty();
  $("#day_selection").append($("<span>").text("Jobs ended on:"));
  for (let i=0; i<=21; ++i) {
    let date = new Date()
    date.setDate(date.getDate() - i);
    let date_str = String(date.getDate()).padStart(2, '0')+"."+String(date.getMonth() + 1).padStart(2, '0')+"."+date.getFullYear();
    let link = $("<a>").attr("href","#").text(date_str).click(function() {self.selectPage([self.selected_page,i]); return false;});
    if (i == active_date) {
      link.addClass("active");
    }
    $("#day_selection").append(link);
  }
}

View.prototype.get_history_context = function(nr) {
  if (nr == 0) {
    context = replaceDataPlaceholder("data/" + ((view.navdata.data.demo || view.url_data.demo) ? "DEMO/" : "") + "support/today.json");
  } else {
    context = replaceDataPlaceholder("data/" + ((view.navdata.data.demo || view.url_data.demo) ? "DEMO/" : "") + "support/jobbyday_" + String(nr).padStart(3, '0') + ".json");
  }
  return context;
}

// View.prototype.select_date = function (nr) {
//     let self = this;
//     context = self.get_history_context(nr);
//     // Remove keydown events, will be resetted in add_job_event_handler()
//     $(document).off("keydown");
//     self.applyTemplates([
//         {
//             "element":"#main_content",
//             "template": self.page_template,
//             "context_location": context
//         },
//          ],function() {
//             $("#footer_infoline_page_options").empty();
//             view.initDates(nr);
//             self.footer_graph.add_event_handler();
//             self.footer_graph.add_resize_controls();
//             set_filter();
//             enable_table_download();
//             resize();
//             view.loading(false);
//             // Set title overlay handling
//             self.apply_tooltip($('[title]'));
//             // Set focus on main content to allow direct scrolling
//             $("#main_content").focus();
//             return;
//          }
//     );
// }
