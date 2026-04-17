/* 
* Copyright (c) 2026 Forschungszentrum Juelich GmbH.
* This file is part of JURI. 
*
* This is an open source software distributed under the GPLv3 license. More information see the LICENSE file at the top level.
*
* Contributions must follow the Contributor License Agreement. More information see the CONTRIBUTING.md file at the top level.
*
* Contributors:
*    Nabil Abubaker   (Forschungszentrum Juelich GmbH)   
*/

const md = window.markdownit({ html: false, linkify: true, typographer: true });

function markdownToHtml(mdText) {
  const raw = md.render(mdText);
  return DOMPurify.sanitize(raw);
}

async function generate_ai_report(pdfilepath, userPrompt = '') {

  const airep_api_url = self.uiConfig && self.uiConfig.llviewai.aiReportEndpoint ? self.uiConfig.llviewai.aiReportEndpoint : '/api/llview-ai';
  const api_url = airep_api_url.replace(/\/+$/, ''); // remove trailing slash if any 
  const headers = {
    'Content-Type': 'application/json',
  };

  const loadingHtml = `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="description" content="Juelich Reporting Interface displaying information about system usage">
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
<link id="favicon" rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256' version='1.1'%3E%3Cpath d='M 110.500 11.109 C 94.779 13.374, 75.164 21.107, 60.658 30.759 C 50.733 37.363, 36.492 51.828, 29.492 62.414 C 16.391 82.226, 13.698 101.377, 21.753 117.446 C 25.156 124.235, 33.885 133.109, 40.405 136.407 C 60.588 146.619, 87.174 138.161, 97.849 118.131 C 101.879 110.570, 140.064 11.913, 139.386 10.815 C 138.740 9.770, 118.353 9.977, 110.500 11.109 M 207.141 44.084 C 206.627 45.413, 198.062 67.581, 188.108 93.347 C 167.656 146.287, 166.213 149.561, 157.771 162.182 C 141.071 187.148, 115.598 203.810, 85.275 209.602 C 76.061 211.362, 56.120 211.934, 47.500 210.686 L 42.500 209.962 48 215.024 C 62.868 228.708, 82.688 238.807, 104.162 243.643 C 114.906 246.062, 139.831 246.050, 151 243.620 C 174.374 238.535, 193.867 228.023, 210.558 211.500 C 246.673 175.749, 255.819 122.071, 233.559 76.500 C 228.007 65.134, 219.186 52.411, 212.126 45.584 L 208.076 41.669 207.141 44.084' stroke='none' fill='%231e3c67' fill-rule='evenodd' /%3E%3Cpath d='M 115 0.612 C 58.708 7.547, 14.986 47.079, 2.865 102 C -0.150 115.664, -0.394 138.988, 2.344 152 C 7.839 178.123, 19.723 200.535, 37.490 218.279 C 92.698 273.417, 183.300 267.405, 230.099 205.500 C 243.631 187.600, 250.958 169.969, 255.042 145.483 C 257.438 131.113, 257.320 121.600, 254.563 107 C 244.432 53.343, 205.426 13.404, 152.500 2.494 C 144.703 0.887, 122.013 -0.252, 115 0.612 M 110.500 11.109 C 94.779 13.374, 75.164 21.107, 60.658 30.759 C 50.733 37.363, 36.492 51.828, 29.492 62.414 C 16.391 82.226, 13.698 101.377, 21.753 117.446 C 25.156 124.235, 33.885 133.109, 40.405 136.407 C 60.588 146.619, 87.174 138.161, 97.849 118.131 C 101.879 110.570, 140.064 11.913, 139.386 10.815 C 138.740 9.770, 118.353 9.977, 110.500 11.109 M 207.141 44.084 C 206.627 45.413, 198.062 67.581, 188.108 93.347 C 167.656 146.287, 166.213 149.561, 157.771 162.182 C 141.071 187.148, 115.598 203.810, 85.275 209.602 C 76.061 211.362, 56.120 211.934, 47.500 210.686 L 42.500 209.962 48 215.024 C 62.868 228.708, 82.688 238.807, 104.162 243.643 C 114.906 246.062, 139.831 246.050, 151 243.620 C 174.374 238.535, 193.867 228.023, 210.558 211.500 C 246.673 175.749, 255.819 122.071, 233.559 76.500 C 228.007 65.134, 219.186 52.411, 212.126 45.584 L 208.076 41.669 207.141 44.084 M 0.370 128 C 0.370 133.775, 0.535 136.137, 0.737 133.250 C 0.939 130.363, 0.939 125.638, 0.737 122.750 C 0.535 119.862, 0.370 122.225, 0.370 128' stroke='none' fill='%23ffffff' fill-rule='evenodd' /%3E%3C/svg%3E" />
<link rel="preload" as="style" href="css/ext/font-awesome.min.css" onload="this.rel='stylesheet'"/>
<link rel="preload" as="style" href="css/ext/katex.min.css" onload="this.rel='stylesheet'"/>
<link rel="preload" as="style" href="css/ext/jquery-ui.min.css" onload="this.rel='stylesheet'"/>
<link rel="preload" as="style" href="css/ext/jquery-ui.structure.min.css" onload="this.rel='stylesheet'"/>
<link rel="preload" as="style" href="css/ext/jquery-ui.theme.min.css" onload="this.rel='stylesheet'"/>
<link rel="stylesheet" href="css/ext/bootstrap.min.css">
<link rel="preload" as="style" href="css/core-pattern.css" onload="this.rel='stylesheet'"/>
<link rel="stylesheet" href="css/style.css">
<title>LLview: Job Reporting</title>
 <style>
    /* make the whole page show the waiting cursor while loading */
    html, body { cursor: progress; }
    /* flex page so we can give the content area a scrollable height */
    html, body.report-page {
      height: 100%;
      margin: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .report-content, #ai-content {
    width: 100%;
    max-width: 100vw;          /* never wider than the window */
    overflow-x: auto;          /* horizontal scroll only if needed */
    overflow-y: auto;          /* existing vertical scroll */
    box-sizing: border-box;
    padding: 1rem;
    padding-bottom: 12rem;
    word-break: break-word;    /* wrap super‑long words */
  }
    .report-content pre,
    #ai-content pre {
      margin: 0;                 /* optional – remove default margins */
      white-space: pre-wrap;     /* wrap lines */
      word-break: break-word;    /* break long words */
      overflow-x: auto;          /* scroll only the <pre> itself if it still overflows */
    }
    .loading, #ai-report-loading-overlay {
    position: fixed;          /* cover the whole window */
    inset: 0;                 /* top/right/bottom/left = 0 */
    background: rgba(255,255,255,.9);
    display: flex;            /* flex for centering */
    align-items: center;      /* vertical centre */
    justify-content: center;  /* horizontal centre */
    z-index: 1050;
    font-family: inherit;
  }

  </style>
</head>
<body class=report-page>
  <div class="loading", id="ai-report-loading-overlay">
    <span>
      <span class="fa fa-spinner fa-spin"></span><br/>
      LLview is loading. Please wait…
    </span>
  </div>
  <div id="ai-content" class="report-content"></div>
</body>
  <footer class="fixed-bottom container-fluid bg-light">
    <div id="footer_infoline">
      <div class="d-inline-block" id="view_data_info"></div>
      <div class="d-none d-md-inline-block float-right" id="footer_infoline_page_options"></div>
    </div>
    <div id="footer_content"></div>
    <div id="footer_footer"> 
      <div id="view_status_info"></div>
      <div class="d-flex">
        <a href="https://www.fz-juelich.de/en/legal-notice" style="padding-right:15px; align-self: center;">Legal Notice</a>
        <a href="http://www.fz-juelich.de/ias/jsc">
          <img id="institution_logo" alt="Institution Logo" src="img/Logo_FZ_Juelich_CMYK_jsc_white.svg">
        </a>
      </div>
    </div>
  </footer>
</html>
`;
  const newWindow = window.open('', '_blank');
  newWindow.document.write(loadingHtml);
  newWindow.document.close();
  const contentDiv = newWindow.document.getElementById('ai-content');

  //const htmlFilePath = pdfilepath.replace(/\.pdf$/i, '.html');
  const filename = pdfilepath.split('/').pop();

  const pdfResp = await fetch(pdfilepath);
  //const pdfResp = await fetch(htmlFilePath);
  if (!pdfResp.ok) {
    throw new Error(`Could not fetch PDF (${pdfResp.status})`);
  }
  const pdfBlob = await pdfResp.blob();
  const file = new File([pdfBlob], filename, { type: "application/pdf" });
  //const file = new File([pdfBlob], filename, { type: "text/html" });
  /* --------------------------------------------------------------
   * Build the multipart/form‑data payload.
   * -------------------------------------------------------------- */
  const form = new FormData();
  // The third argument is optional because `file` already knows its name.
  form.append("file", file);
  form.append("userprompt", userPrompt); // add the user prompt as a separate field

  const sysname = new URL(window.location.href).pathname.split('/')[1];
  const requrl = `${api_url}/processpdf?system=${sysname}`;
  // const requrl = `${api_url}/processhtml?system=${sysname}`;
  const resp = await fetch(requrl, {
    method: "POST",
    headers: {
      Accept: "application/json"
      // **DO NOT** set Content-Type – the browser adds the multipart boundary.
    },
    body: form
  });

  if (!resp.ok) {
    console.error('API Error:', resp.status, resp.statusText);
    throw new Error(`API Error: ${resp.statusText}`);
  }

  const jsonResult = await resp.json();
  console.log('API response:', jsonResult);

  const loadingDiv = newWindow.document.querySelector('.loading');
  if (loadingDiv) loadingDiv.remove();
  contentDiv.innerHTML = `<pre>${jsonResult.content}</pre>`;
  //const content = jsonResult.choices[0].message.content;
  const content = jsonResult.content
  const thinkMatch = content.match(/\<think\>([\s\S]*?)\<\/think\>/);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : '';
  const displayContent = content.replace(/\<think\>[\s\S]*?\<\/think\>/g, '').trim();

  // Create collapsible think section
  let thinkHtml = '';
  if (thinkContent) {
    thinkHtml = `
      <details style="margin:10px 0; padding:10px; background:#f5f5f5; border-radius:4px;">
        <summary style="cursor:pointer; font-weight:bold; user-select:none; position:sticky; top:0; background:#f5f5f5; padding:5px 0; z-index:10;">🤔 Reasoning (click to expand)</summary>
        <pre style="margin-top:10px; overflow-x:auto; white-space:pre-wrap;">${thinkContent}</pre>
      </details>
      `;
  }
  const markdownToHtml2 = (md) => {
    return md
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  };
  //contentDiv.innerHTML = markdownToHtml(displayContent);
  contentDiv.innerHTML = thinkHtml + `<pre>${markdownToHtml(displayContent)}</pre>` + `<div class="ai-disclaimer">
  ⚠️ This report is generated by an AI model and may contain inaccuracies.
  Underlying LLM supplied by <a href="https://helmholtz-blablador.fz-juelich.de/" target="_blank" rel="noopener">Blablador</a>.
</div>

<style>
.ai-disclaimer {
  background: #fff3cd;          
  color: #856404;               
  padding: 8px 12px;
  border-left: 4px solid #ffc107;
  font-size: 0.9rem;            
  margin-bottom: 12px;
}
.ai-disclaimer a {
  color: #0c63e4;            
  text-decoration: underline;
}
</style>`;

}


/* --------------------------------------------------------------
   Global helper – creates a tiny modal the first time it is used
   -------------------------------------------------------------- */
(() => {
  let pendingUrl = null;            // will hold the PDF URL for the submit

  function getDialog() {
    let dlg = document.getElementById('ai‑report‑dialog');
    if (dlg) return dlg;            // already exists → reuse

    // ---- create the DOM structure -------------------------------------------------
    dlg = document.createElement('dialog');
    dlg.id = 'ai‑report‑dialog';
    dlg.innerHTML = `
      <form method="dialog" id="ai‑report‑form">
        <h3>Generate AI Report</h3>
        <p> An AI-generated report will be created based on the content of the jobreport. This report will contain <b>key findings</b> and <b>high-level recommendations</b>.
        You can optionally add your own prompt to provide additional context or specific instructions for the report (e.g., you can provide your slurm job script here). </p>

        <!--  placeholder text field – you will use it later  -->
        <p>
          <label for="ai‑note">Add your prompt/notes/slurm script (optional)</label><br>
          <!-- <input type="text" id="ai‑note" name="ai‑note"
                 style="width:100%;padding:.3rem;"> -->
          <textarea id="ai‑note" name="ai‑note" rows="10" style="width:100%;padding:.3rem;resize:vertical;"> </textarea>
        </p>

        <div style="text-align:right;margin-top:1rem;">
          <button type="button" id="ai‑cancel" class="btn" style="background-color:var(--fzj-color-blue);color:white; margin-right:.5rem;">Cancel</button>
          <button type="submit" id="ai‑submit" class="btn" style="background-color:var(--fzj-color-blue);color:white;">Generate</button>
        </div>
      </form>
    `;

    // ---- styling 
    const style = document.createElement('style');
    style.textContent = `
      dialog {
        border:none;
        border-radius:.4rem;
        padding:1.5rem;
        box-shadow:0 4px 12px rgba(0,0,0,.15);
        max-width:340px;
        width:90%;
      }
      dialog::backdrop { background:rgba(0,0,0,.4); }
    `;
    dlg.appendChild(style);

    document.body.appendChild(dlg);
    return dlg;
  }

  window.showAiReportDialog = function (url) {
    pendingUrl = url;               // remember which PDF must be opened
    const dlg = getDialog();        // create / fetch the dialog
    dlg.showModal();                // open it

    dlg.addEventListener('click', e => {
      // click on the backdrop (outside the <form>)
      if (e.target === dlg) dlg.close();
    });

    dlg.addEventListener('keydown', e => {
      if (e.key === 'Escape') dlg.close();   // close on ESC
    });
    // optional – clear the note field each time the dialog opens
    const noteInput = dlg.querySelector('#ai‑note');
    if (noteInput) noteInput.value = '';
  };

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'ai‑cancel') {
      const dlg = getDialog();
      dlg.close();
    }
  });

  document.addEventListener('submit', function (e) {
    // only react to the form we created
    if (e.target && e.target.id === 'ai‑report‑form') {
      e.preventDefault();            // stop native form submit

      // ---- This is where you can read the note later if you need it:
      // const note = e.target.querySelector('#ai‑note').value;
      if (pendingUrl) {
        const noteInput = document.getElementById('ai‑note');
        const note = noteInput ? noteInput.value.trim() : '';
        console.log('User note:', note);
        // call the *original* function that actually produces the report
        generate_ai_report(pendingUrl, note);
      }

      const dlg = getDialog();
      dlg.close();
    }
  });
})();

async function sendChat() {
  // Clear input and append user message to chat
  console.log("Sending message...");
  const $input = $('#chatbotInput');
  const $msgContainer = $('#chatbotMessages');
  let message = $input.val().trim();
  const attach = $('#attachContainer');
  $msgContainer.append($('<div>').addClass('user-message').text(message));
  $input.val('');
  $msgContainer.scrollTop($msgContainer[0].scrollHeight);
  const chatbot_api_url = self.uiConfig && self.uiConfig.llviewai.chatBotEndpoint ? self.uiConfig.llviewai.chatBotEndpoint : '/api/llview-ai';
  const api_url = chatbot_api_url.replace(/\/+$/, ''); // remove trailing slash if any
  let extra = '';
  if (!message) return; // ignore empty messages
  if (attach.hasClass('active')) {
    //const csvC = view.gridApi ? view.gridApi.getDataAsCsv() : null;
    const csvC = get_table_data();

    if (csvC) {
      message += `\n\n[Attached CSV data]\n${csvC}`;
    } else {
      message += `\n\n[Attachment requested but no grid data available]`;
    }
    extra = ' (with attachment)';
    attach.removeClass('active');
  }
  console.log(`Sending message${extra}:`, message);
  const sysname = new URL(window.location.href).pathname.split('/')[1];

  try {
    const resp = await fetch(`${api_url}/chat/chatbot?system=${sysname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: [{ role: "user", content: message }] })
    });
    console.log("API Reponse:", resp);

    if (!resp.ok) throw new Error('Network response was not ok');
    const jsonRes = await resp.json();
    // Append the reply to the messages container
    $msgContainer.append($('<div>').addClass('bot-message').html(markdownToHtml(jsonRes.content)));
    // Clear the input field
    $input.val('');
    // Scroll to bottom so newest reply is visible
    $msgContainer.scrollTop($msgContainer[0].scrollHeight);
  }
  catch (err) { console.error('Chat error:', err); }
}

function addChatbotHtml() {
  const chatbothtml = `
     <aside id="chatSidebar" class="chat-sidebar">
      <div class="chat-header d-flex justify-content-between align-items-center p-2 text-white"
       style="background-color:var(--fzj-color-blue);">
        <span>LLview-AI Chatbot</span>
        <button id="chatCloseBtn" class="btn btn-sm btn-light" title="Close">✖</button>
      </div>

      <div class="chat-body d-flex flex-column h-100">
        <div id="chatbotMessages"
             class="flex-grow-1 overflow-auto p-3"
             style="background:#f8f9fa;"></div>
<div id="attachContainer" class="d-flex align-items-center mb-2"> 
    <span id="attachSymbol" class="fa fa-plus" style="font-size:1.2rem; margin-right:5px;"></span>
    <span id="attachLabel"> Attach Viewed Table Data</span>
  </div>
        <div class="p-3 border-top">
          <textarea id="chatbotInput" class="form-control mb-2"
                    rows="3" placeholder="Type your message…"></textarea>

          <button id="chatbotSendBtn" class="btn w-100"
                  style="background-color:var(--fzj-color-blue);color:white;border-color:var(--fzj-color-blue);">
            Send
          </button>
        </div>
      </div>
    </aside>`;

  $('#pageWrapper').append(chatbothtml);
}

function addChatbotLogic() {
  addChatbotHtml();
  $('#pageWrapper').append(
    // $('<button>', {id:'chatbotBtn', title:'Chatbot'}).addClass('fa fa-comment')
    `  <button class="ai-chat-btn" id="chatbotBtn" title="Click or Drag to Open Chatbot">
                  <span class="chat-icon"><span class="dots">•••</span></span>
                  <!-- <span class="sparkles"></span> -->
                  </button>`);

  const $wrapper = $('#pageWrapper');
  const $sidebar = $('#chatSidebar');
  const $btn = $('#chatbotBtn');
  let dragging = false, dragged = false;
  let startX = 0, startWidth = 0;
  

  $('#chatCloseBtn').on('click', () => {
    $wrapper
      .removeClass('sidebar-open')
      .css('--sidebar-width', '0px');
  });

  $('#attachContainer').on('click', () => {
    const $cn = $('#attachContainer');
    const $symb = $('#attachSymbol');
    $cn.toggleClass('active');
    $symb.toggleClass('fa-plus').toggleClass('fa-check');

    $('#chatbotInput').focus();
  });

  $btn.on('mousedown', e => {
    //if (!$wrapper.hasClass('sidebar-open')) return; // only start dragging if sidebar is open
    dragging = true;
    dragged = false;
    startX = e.clientX;
    startWidth = $sidebar.width();   // current width (0 when closed)
    $('body').addClass('no-select'); // optional – prevents text selection while dragging
    e.preventDefault();
  });

  $(document).on('mousemove', e => {
    if (!dragging) return;
    const diff = startX - e.clientX;          // negative → enlarge, positive → shrink
    let newWidth = startWidth + diff;
    if(Math.abs(diff) > 3) dragged = true; // if moved more than 3px, consider it a drag (not just a click)
    // enforce sensible limits
    newWidth = Math.max(0, Math.min(1200, newWidth)); // 0‑1200 px min/max
    $wrapper.css('--sidebar-width', newWidth + 'px'); // update CSS variable for any dependent styles
  });

  $(document).on('mouseup', function () {
    if (dragging) {
      dragging = false;
      $('body').removeClass('no-select');
    }
  });
 
  $btn.on('click', e => {
    if(dragged) { e.stopImmediatePropagation(); return;} // prevent click action if we just finished dragging
    if($wrapper.hasClass('sidebar-open')) {
      $wrapper.removeClass('sidebar-open').css('--sidebar-width', '0px');
      
    } else {
      $wrapper.addClass('sidebar-open').css('--sidebar-width', '350px');
      $('#chatbotInput').focus();
    }
  });

  // SEND
  $('#chatbotSendBtn').on('click', sendChat);
  $('#chatbotInput').on('keypress', function (e) {
    if (e.which === 13 && !e.shiftKey) {
      e.preventDefault(); sendChat();
    }
  });
}
