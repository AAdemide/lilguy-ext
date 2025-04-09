chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    console.log('this is the background/service worker');
});

let sessionStartTime = {};
let activeTabId = null;

// initialize or get current data
chrome.storage.local.get(['pageViews', 'sessionData'], (result) => {
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
    if (changeInfo.status === 'complete' && tab.url) {
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

        chrome.storage.local.get(['pageViews'], (result) => {
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

            chrome.storage.local.get(['sessionData'], (result) => {
                const sessionData = result ? result.sessionData : {};

                if (!sessionData[hostname]) {
                    // create inital session data objects
                    sessionData[hostname] = {
                        totalDuration: 0,
                        sessions: 0
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
