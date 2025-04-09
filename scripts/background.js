import { pipeline } from "@huggingface/transformers";
const GOAL = "Learning NextJs";
const labels = [`Helpful for ${GOAL}`, `Not helpful for ${GOAL}`];

class PipelineSingleton {
  static task = "zero-shot-classification";
  //zero shot model not loading this model name was found in lilguy-ext\node_modules\@huggingface\transformers\src\pipelines.js
  static model = "Xenova/nli-deberta-v3-xsmall";
  static instance = null;

  static async getInstance(progress_callback = null) {
    this.instance ??= pipeline(this.task, this.model, { progress_callback });
    return this.instance;
  }
}

// Create generic classify function, which will be reused for the different types of events.
const classify = async (text) => {
  // Get the pipeline instance. This will load and build the model when run for the first time.
  let model = await PipelineSingleton.getInstance((data) => {
    // You can track the progress of the pipeline creation here.
    // e.g., you can send `data` back to the UI to indicate a progress bar
    // console.log('progress', data)
  });

  // Actually run the model on the input text  label goes here???
  let result = await model(text, labels);
  return result;
};

chrome.runtime.onMessage.addListener(async (req, sender, sendResponse) => {
  console.log("req: ", req);
  const res = await classify(req.pageText);
  console.log("res from bgscript:")
  console.log(res)
  sendResponse({ res: "success in sending pageText" });
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  console.log("this is the background/service worker");
});

let sessionStartTime = {};
let activeTabId = null;

// initialize or get current data
chrome.storage.local.get(["pageViews", "sessionData"], (result) => {
  const pageViews = result ? result.pageViews : {};
  const sessionData = result ? result.sessionData : {};
  chrome.storage.local.set({ pageViews, sessionData });
});

// track active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const previousTabId = activeTabId;
  activeTabId = activeInfo.tabId;

  // if switching from a tab, record session duration
  if (previousTabId && sessionStartTime[previousTabId]) {
    const duration = Date.now() - sessionStartTime[previousTabId];
    updateSessionDuration(previousTabId, duration);
  }
  // reset session start time for this tab
  sessionStartTime[activeTabId] = Date.now();
});

// handle navigation events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    incrementPageView(tab.url);

    // reset session start time for this tab
    sessionStartTime[tabId] = Date.now();
  }
});

// handle tab close events
chrome.tabs.onRemoved.addListener((tabId) => {
  if (sessionStartTime[tabId]) {
    const duration = Date.now() - sessionStartTime[tabId];
    updateSessionDuration(tabId, duration);
    delete sessionStartTime[tabId];
  }
});

// helper functions
// increment the page view counter for a URL
function incrementPageView(url) {
  try {
    const hostname = new URL(url).hostname;

    chrome.storage.local.get(["pageViews"], (result) => {
      const pageViews = result.pageViews || {};
      pageViews[hostname] = (pageViews[hostname] || 0) + 1;

      chrome.storage.local.set({ pageViews });
    });
  } catch (e) {
    console.error("Error processing URL:", e);
  }
}

// update session duration for a tab
function updateSessionDuration(tabId, duration) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      return; // tab closed
    }

    try {
      const hostname = new URL(tab.url).hostname;

      chrome.storage.local.get(["sessionData"], (result) => {
        const sessionData = result ? result.sessionData : {};

        if (!sessionData[hostname]) {
          // create inital session data objects
          sessionData[hostname] = {
            totalDuration: 0,
            sessions: 0,
          };
        }

        sessionData[hostname].totalDuration += duration;
        sessionData[hostname].sessions += 1;
        chrome.storage.local.set({ sessionData });
      });
    } catch (e) {
      console.error("Error updating session data:", e);
    }
  });
}
