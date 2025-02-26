const IMG_STATUS = {
  SEARCHING: {
    src: browser.runtime.getURL("icons/refresh.svg"),
    title: "Processing article.",
  },
  NO_DOI: {
    src: browser.runtime.getURL("icons/ban.svg"),
    title: "This article did not return a valid DOI.",
  },
  SUCCESS: {
    success: true,
    src: browser.runtime.getURL("icons/book.svg"),
    title:
      "This article's DOI was found, and the link has been updated to direct to Sci-Hub. This icon has been updated to link to the original article address.",
  },
  SUCCESS_REGEX: {
    success: true,
    src: browser.runtime.getURL("icons/book.svg"),
    title:
      "This article's DOI was found in the URL, and the link has been updated to direct to Sci-Hub. This icon has been updated to link to the original article address.",
  },
  SUCCESS_CACHE: {
    success: true,
    src: browser.runtime.getURL("icons/book.svg"),
    title:
      "This article's DOI was found in cache, and the link has been updated to direct to Sci-Hub. This icon has been updated to link to the original article address.",
  },
};

const regex = '(10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?![%"#? ])\\S)+)';

const WIKIPEDIA_PAGE = "https://en.wikipedia.org/wiki/Sci-Hub";
const MIN_SCORE = 40;

const SKIP_DOI_CACHE_LOOKUP = false;
const SKIP_DOI_URL_LOOKUP = false;
const SKIP_DOI_CROSSREF_LOOKUP = false;

let SCIHUB_QUERY = "https://sci-hub.se/";


class RequestQueue {
  constructor(concurrency = 3, rateLimit = 1000) {
    this.concurrency = concurrency;
    this.rateLimit = rateLimit;
    this.running = 0;
    this.queue = [];
    this.lastRun = 0;
    this.requestCount = 0;
  }

  enqueue(fn) {
    this.requestCount++;
    const requestId = this.requestCount;
    console.log(`[Queue] Request #${requestId} added to queue. Queue length: ${this.queue.length + 1}`);

    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        requestId
      });
      this.dequeue();
    });
  }

  async dequeue() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      console.log(`[Queue] Cannot dequeue. Running: ${this.running}, Queue length: ${this.queue.length}`);
      return;
    }

    this.running++;
    const { fn, resolve, reject, requestId } = this.queue.shift();
    const now = Date.now();
    const timeToWait = Math.max(0, this.lastRun + this.rateLimit - now);

    console.log(`[Queue] Starting request #${requestId}. Waiting ${timeToWait}ms. Active requests: ${this.running}`);

    await new Promise(resolve => setTimeout(resolve, timeToWait));
    this.lastRun = Date.now();

    try {
      const result = await fn();
      console.log(`[Queue] Request #${requestId} completed successfully`);
      resolve(result);
    } catch (error) {
      console.error(`[Queue] Request #${requestId} failed:`, error);
      reject(error);
    } finally {
      this.running--;
      console.log(`[Queue] Request #${requestId} finished. Remaining in queue: ${this.queue.length}`);
      this.dequeue();
    }
  }
}

// Increase the rate limit to 3000ms (3 seconds) to be safer with CrossRef API
const requestQueue = new RequestQueue(1, 3000);


// Grab updated Sci-Hub URL from Wikipedia
browser.storage.local.get("last_sci_hub_url_update").then((result) => {
  if (Date.now() > result.last_sci_hub_url_update + 600000) {
    // 10 minutes cache
    fetch(WIKIPEDIA_PAGE)
      .then((response) => response.text())
      .then((data) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, "text/html");
        const results = doc.querySelectorAll("td.url>div>ul>li>span.url>a");
        browser.storage.local.set({ last_sci_hub_url_update: Date.now() });
        return results[0].host;
      })
      .then((host) => {
        // console.log(host);
        return host;
      })
      .then((host) => {
        SCIHUB_QUERY = "https://" + host;
        document.querySelectorAll("h3>a").forEach((element) => {
          if (element.host.includes("sci-hub") && element.host != host) {
            element.host = host;
          }
        });
      })
      .catch((error) => {
        console.error("Error: ", error);
      });
  }
});

document.querySelectorAll("div.gs_ri").forEach((element) => {
  const elIconLink = document.createElement("a");
  const elIcon = document.createElement("img");
  const elDOI = document.createElement("input");

  // Configure DOI Text Element
  elDOI.hidden = true;
  elDOI.readOnly = true;

  // Configure Icon Element
  elIcon.width = 18;
  elIcon.height = 18;
  elIcon.style.verticalAlign = "middle";

  // Pull out important information
  const elTitle = element.querySelector("h3>a");
  const elAuthors = element.querySelector("div.gs_a");
  const Title = elTitle.innerText.toString();
  const LeadAuthor = elAuthors.innerText.toString().split(", ")[0];
  const oldURL = elTitle.href;

  elIcon.src = IMG_STATUS.SEARCHING.src;

  elIconLink.insertAdjacentElement("afterbegin", elIcon);
  elTitle.insertAdjacentElement("beforebegin", elIconLink);
  elTitle.insertAdjacentElement("afterend", elDOI);

  // Setup CrossRef Query
  const CrossRefQueryURL = `https://api.crossref.org/v1/works?query.title=${encodeURIComponent(
    Title
  )}&query.author=${encodeURIComponent(
    LeadAuthor
  )}&rows=1&sort=score&select=DOI,title,score`; // Select URL & link for doi & DOI redirect

  browser.storage.local.get(Title).then((result) => {
    // Found cached title/url, no need to look up DOI
    // console.log(result);
    if (!SKIP_DOI_CACHE_LOOKUP && Object.keys(result).length > 0) {
      const doi = result[Title];
      const newURL = SCIHUB_QUERY + doi;
      UpdateStatus(
        IMG_STATUS.SUCCESS_CACHE,
        elIconLink,
        elIcon,
        elTitle,
        elDOI,
        doi,
        newURL,
        oldURL
      );
    } else if (!SKIP_DOI_URL_LOOKUP && oldURL.toString().match(regex)) {
      const doi = oldURL.toString().match(regex)[0];
      console.log(doi);
      let newURL = SCIHUB_QUERY + doi;

      if (newURL.endsWith("\/html")) {
        newURL = newURL.substring(0, newURL.length - 5);
      }
      console.log(
        `Attempt to pull doi straight out of url ${oldURL.toString()} for article ${Title} : ${doi}, \n ${newURL}`
      );
      UpdateStatus(
        IMG_STATUS.SUCCESS_REGEX,
        elIconLink,
        elIcon,
        elTitle,
        elDOI,
        doi,
        newURL,
        oldURL
      );
      var cacheObj = new Object();
      cacheObj[Title] = doi;
      browser.storage.local.set(cacheObj);
    } else if (!SKIP_DOI_CROSSREF_LOOKUP) {
      // Replace the fetch call with this version
      requestQueue.enqueue(() => fetch(CrossRefQueryURL))
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            UpdateStatus(IMG_STATUS.NO_DOI, elIconLink, elIcon, elTitle, elDOI);
            return Error(`No Response from CrossRef for ${obj}`);
          }
        })
        .then((data) => {
          // console.log(data);
          const checkObject = data.message.items[0];
          const score = checkObject.score;
          if (score > MIN_SCORE) {
            const doi = checkObject.DOI.toString();
            const newURL = SCIHUB_QUERY + doi;

            UpdateStatus(
              IMG_STATUS.SUCCESS,
              elIconLink,
              elIcon,
              elTitle,
              elDOI,
              doi,
              newURL,
              oldURL
            );

            // Cache off DOI
            cacheObj = new Object();
            cacheObj[Title] = doi;
            browser.storage.local
              .set(cacheObj)
              // .then(console.log(`Successfully cached ${Title} : ${doi}`))
              .catch((error) =>
                console.error(`Failed to cache ${Title} : ${doi} : ${error}`)
              );
          } else {
            UpdateStatus(IMG_STATUS.NO_DOI, elIconLink, elIcon, elTitle, elDOI);
          }
        });
    }
  });
});
function UpdateStatus(
  status,
  elIconLink,
  elIcon,
  elTitle,
  elDOI,
  doi,
  newURL,
  oldURL
) {
  elIcon.src = status.src;
  elIcon.title = status.title;

  if (status.success) {
    elDOI.hidden = false;
    elDOI.value = doi;
    elDOI.size = doi.length;
    elTitle.href = newURL;
    elIconLink.href = oldURL;
  }
}
