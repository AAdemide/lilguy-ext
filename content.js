import {Readability} from '@mozilla/readability';

(async () => {
    const docClone = document.cloneNode(true);
    const reader = new Readability(docClone);
    const page = reader.parse()
    const pageText = page.textContent.trim();
    // const main = document.querySelector('main');
    // let message;
    // if (main) {
    //     message = {pageText: main.innerText};
    // } else {
    //     message = {pageText: document.body.innerText};
    // }
    const message = {pageText}
    const res = await chrome.runtime.sendMessage(message);

    //if there is a main element parse that alone
    // console.log(res)
})()