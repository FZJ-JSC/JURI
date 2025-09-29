// Importing necessary scripts for handlebars
importScripts('ext/handlebars.min.js');
importScripts('ext/d3.min.js');
importScripts('helpers.worker.js');   // For the helper functions applied using Handlebars on tables
importScripts('helper_functions.js'); // For the helper functions applied using Handlebars on datatables

/**
 * Listens for messages from the main thread containing template text and context data.
 */
self.onmessage = function(event) {
  // Receive message from the main thread
  const { templateText, contextData, helperContext } = event.data;

  // Store context data in the worker's global scope
  // to be used by the helper functions later.
  if (helperContext) {
    self.helperContext = helperContext;
  }

  self.addControlsCalled = false;
  
  try {
    // Compile the template (heavy task)
    const template = Handlebars.compile(templateText);

    // Generate the HTML string (very heavy task)
    const resultHtml = template(contextData);

    // Send the finished HTML string back to the main thread, 
    // indicating that the render is completed
    self.postMessage({
      command: 'render_complete',
      html: resultHtml
    });
  } catch (e) {
    // If an error occurs during compile/render, send it back
    self.postMessage({ command: 'error', error: e.stack });
  }
};

