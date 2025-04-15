import { encode, decode } from 'gpt-tokenizer';

const model = 'gpt-4o';
const openaiApiKey = ''; 

const apiUrl = 'https://api.openai.com/v1/chat/completions';

function splitByToken(text, maxTokens = 10) {
  const tokens = encode(text);
  const batches = [];

  for (let i = 0; i < tokens.length; i += maxTokens) {
    const chunkTokens = tokens.slice(i, i + maxTokens);
    const chunkText = decode(chunkTokens);
    batches.push(chunkText);
  }
console.log(batches)
  return batches;
}

async function classifyTextForGoal(text, goal) {
  const prompt = `Is this text helpful for the goal of learning ${goal}? \n\nText: ${text} \n\nAnswer with Yes or No.`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that classifies webpages.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error during classification:', error);
    return null;
  }
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

async function getEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}

chrome.runtime.onMessage.addListener(async (req, sender, sendResponse) => {
  const { pageText } = req;
  const pageChunks = splitByToken(pageText);
  const goalEmbedding = await getEmbedding("learning how to use the Next.js framework to build websites");
  for (const chunk of pageChunks) {
    const chunkEmbedding = await getEmbedding(chunk);
    const similarity = cosineSimilarity(goalEmbedding, chunkEmbedding);
    console.log("Similarity:", similarity > .75 ? 'helpful' : 'not helpful', similarity);
  }

  // for (const chunk of pageChunks) {
  //   const result = await classifyTextForGoal(chunk, goal);
  //   console.log('Classification Result for chunk:', result);
  //   // You can break early if one chunk is enough
  // }

  sendResponse({ res: 'success in sending pageText' });
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
        const sessionData = result.sessionData ?? {};
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
