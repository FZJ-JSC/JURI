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
  const self = this;

  // normalize active_date (fallback to 0 as in your original)
  let a = parseInt(active_date);
  a = (typeof a === "undefined" || isNaN(a)) ? 0 : a;

  // build tabs array: { name: date_str, section: "0"|"1"|... }
  const page_tabs = [];
  for (let i = 0; i <= 21; ++i) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr =
      String(d.getDate()).padStart(2, "0") + "." +
      String(d.getMonth() + 1).padStart(2, "0") + "." +
      d.getFullYear();
    page_tabs.push({ name: dateStr, section: String(i) });
  }

  // // remove any previous tabs_scroll to avoid duplicates
  // $("#tabs_scroll").remove();

  // create tabs using existing addTabs (uses this.selected_page as page)
  this.addTabs(page_tabs, this.selected_page, String(a));

  // Insert the "Jobs ended on:" label to the left of the tabs.
  // Remove any previous label first (safety), then prepend the label element.
  // $("#tabs").find(".tabs-label").remove();
  $("#tabs").prepend($("<span class='tabs-label'>").text("Jobs ended on:"));
}


View.prototype.get_history_context = function(nr) {
  return (nr == 0)?replaceDataPlaceholder("data/" + ((view.navdata.data.demo || view.url_data.demo) ? "DEMO/" : "") + "support/today.json"):replaceDataPlaceholder("data/" + ((view.navdata.data.demo || view.url_data.demo) ? "DEMO/" : "") + "support/jobbyday_" + String(nr).padStart(3, '0') + ".json")
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
