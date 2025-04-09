(async () => {
    const message = {pageText: document.body.innerText};
    const res = await chrome.runtime.sendMessage(message);
    console.log(res)
})()