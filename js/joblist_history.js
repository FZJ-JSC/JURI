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

/**
 * Initializes the tabs for history with the correct links to 
 * select other history days
 * @param {*} page Page that was clicked
 * @param {*} subpage Subpage that was clicked
 * @returns 
 */
View.prototype.initDates = function(page,subpage) {
  const self = this;
  // If 'page' that is changing to now is the same as
  // the previous 'self.selected_page', there's nothing to do
  if (self.selected_page == page) return

  // normalize subpage (fallback to 0 as in your original)
  let a = parseInt(subpage);
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

  // create tabs using existing addTabs (uses this.selected_page as page)
  self.addTabs(page_tabs, page, String(a));

  // Insert the "Jobs ended on:" label to the left of the tabs.
  $("#tabs").prepend($("<span class='tabs-label'>").text("Jobs ended on:"));
}


View.prototype.get_history_context = function(nr) {
  return (nr == 0)?replaceDataPlaceholder("data/" + ((view.navdata.data.demo || view.url_data.demo) ? "DEMO/" : "") + "support/today.json"):replaceDataPlaceholder("data/" + ((view.navdata.data.demo || view.url_data.demo) ? "DEMO/" : "") + "support/jobbyday_" + String(nr).padStart(3, '0') + ".json")
}

