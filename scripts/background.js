import { encode, decode } from "gpt-tokenizer";

const model = "gpt-4o";
const openaiApiKey = "";

const apiUrl = "https://api.openai.com/v1/chat/completions";
let pages = [];

function splitByToken(text, maxTokens = 100) {
  const tokens = encode(text);
  const batches = [];

  for (let i = 0; i < tokens.length; i += maxTokens) {
    const chunkTokens = tokens.slice(i, i + maxTokens);
    const chunkText = decode(chunkTokens);
    batches.push(chunkText);
  }
  return batches;
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

async function getEmbedding(text) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  const data = await response.json();
  if (data.error) {
    return console.error(data);
  }
  return data.data.map((item) => item.embedding);
}

const catPage = async () => {
  const req = pages[0];
  const { pageText } = req;
  const { pageName } = req;
  const pageChunks = splitByToken(pageText);
  // const goalEmbedding = await getEmbedding("learning how to use the Next.js framework to build websites");
  async function getGoalEmbeddings() {
    const goals = {
      nextjs: "learning to use the Next.js framework",
      javascript: "learning to use the javascript programming language",
      routing: "learning routing in Next.js",
      "file-based-routing": "learning file-based routing in Next.js",
      "dynamic-routing": "learning dynamic routing in Next.js",
      "app-router": "learning how to use the App Router in Next.js",
      "pages-router": "learning how to use the Pages Router in Next.js",
      react: "learning how to use React",
      ssr: "learning server-side rendering in Next.js",
      ssg: "learning static site generation in Next.js",
      csr: "learning client-side rendering in Next.js",
      "api-routes": "learning how to use API routes in Next.js",
      "data-fetching": "learning data fetching strategies in Next.js",
      getStaticProps: "learning how to use getStaticProps",
      getServerSideProps: "learning how to use getServerSideProps",
      middleware: "learning how to use middleware in Next.js",
      "image-optimization": "learning image optimization in Next.js",
      seo: "learning SEO best practices with Next.js",
      "head-component": "learning how to use the Head component in Next.js",
      auth: "learning how to implement authentication in Next.js",
      deployment: "learning how to deploy a Next.js app",
      vercel: "learning how to deploy with Vercel",
      tailwind: "learning how to use Tailwind CSS with Next.js",
      typescript: "learning how to use TypeScript with Next.js",
      fullstack: "learning to build a full-stack app using Next.js",
      "dashboard-ui": "learning how to build a dashboard UI with Next.js",
    };

    const inputTexts = Object.values(goals);

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: inputTexts,
      }),
    });

    const data = await response.json();
    console.log("DATAAA>>>", data);

    const goalEmbeddings = {};
    Object.keys(goals).forEach((key, index) => {
      goalEmbeddings[key] = data.data[index].embedding;
    });

    return goalEmbeddings;
  }
  const goalEmbeddings = await getGoalEmbeddings();
  const chunkEmbeddings = await getEmbedding(pageChunks);
  const hostname = new URL(pageName).hostname;
  let largestSimilarity = -Infinity;
  for (const goal in goalEmbeddings) {
    let highest = 0;
    for (const emb of chunkEmbeddings) {
      const similarity =
        Math.round(cosineSimilarity(goalEmbeddings[goal], emb) * 10) / 10;
      if (similarity > highest) highest = similarity;
    }
    if (highest > largestSimilarity) {
      largestSimilarity = highest;
    }
  }
  chrome.storage.local.get(["categoryData"]).then((data) => {
    const currentCategoryData = data.categoryData || {};
    // Update the category for this hostname
    const updatedCategoryData = {
      ...currentCategoryData,
      [hostname]: largestSimilarity >= 0.5 ? "helpful" : "not-helpful",
    };
    chrome.storage.local.set({
      categoryData: updatedCategoryData,
    });
  });
  console.log(
    hostname,
    "Total Similarity:",
    largestSimilarity >= 0.5 ? "helpful" : "not helpful",
    largestSimilarity
  );
  pages.shift();
  return true;
};

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  pages.push(req);
  //make fetch to the server here
  catPage();
  sendResponse({ success: "page received" });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  console.log("this is the background/service worker");
});

let sessionStartTime = {};
let activeTabId = null;

// initialize or get current data
chrome.storage.local.get(["siteData"], (result) => {
  const siteData = result ? result.siteData : {};
  chrome.storage.local.set({ siteData });
});

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "ping" });
    return true;
  } catch (e) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content.js"],
    });
    return false;
  }
}

// track active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    ensureContentScript(activeInfo.tabId);
  } catch (error) {}
  const previousTabId = activeTabId;
  activeTabId = activeInfo.tabId;

  // if switching from a tab, record session duration
  if (previousTabId && sessionStartTime[previousTabId]) {
    const duration = (Date.now() - sessionStartTime[previousTabId]) / 1000;
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
    const duration = (Date.now() - sessionStartTime[tabId]) / 1000;
    updateSessionDuration(tabId, duration);
    delete sessionStartTime[tabId];
  }
});

// helper functions
// increment the page view counter for a URL
function incrementPageView(url) {
  try {
    const hostname = new URL(url).hostname;

    chrome.storage.local.get(["siteData"], (result) => {
      const siteData = result.siteData || {};
      if (!siteData[hostname]) {
        siteData[hostname] = {
          visits: 0,
          sessions: 0,
          totalDuration: 0,
          userId: null,
        };
      }
      siteData[hostname].visits += 1;

      chrome.storage.local.set({ siteData }, () => {
        // Make POST API call to sync data with backend
        fetch("http://localhost:3000/api/sitevisits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hostname,
            siteData: siteData[hostname],
          }),
        }).catch((error) =>
          console.error("Error syncing with backend:", error)
        );
      });
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

      chrome.storage.local.get(["siteData"], (result) => {
        const siteData = result ? result.siteData : {};

        if (!siteData[hostname]) {
          siteData[hostname] = {
            visits: 0,
            sessions: 0,
            totalDuration: 0,
            userId: null,
          };
        }

        siteData[hostname].totalDuration += duration;
        siteData[hostname].sessions += 1;
        chrome.storage.local.set({ siteData }, () => {
          // Make POST API call to sync TOTAL data with backend
          fetch("http://localhost:3000/api/sitevisits", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              hostname,
              siteData: siteData[hostname],
            }),
          }).catch((error) =>
            console.error("Error syncing with backend:", error)
          );

          if (duration) {
            fetch("http://localhost:3000/api/sitevisit", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                hostname,
                duration: duration,
              }),
            }).catch((error) =>
              console.error("Error syncing with backend:", error)
            );
          }
        });
      });
    } catch (e) {
      console.error("Error updating session data:", e);
    }
  });
}
