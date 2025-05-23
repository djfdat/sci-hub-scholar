// SVG Icon Definitions
const REFRESH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-refresh" width="1em" height="1em" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -5v5h5" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 5v-5h-5" /></svg>`;
const BOOK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-book" width="1em" height="1em" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><line x1="3" y1="6" x2="3" y2="19" /><line x1="12" y1="6" x2="12" y2="19" /><line x1="21" y1="6" x2="21" y2="19" /></svg>`;
const BAN_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-ban" width="1em" height="1em" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><circle cx="12" cy="12" r="9" /><line x1="5.7" y1="5.7" x2="18.3" y2="18.3" /></svg>`;
const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" id="mdi-content-copy" viewBox="0 0 24 24" width="14px" height="14px" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>`;
// Note: A checkmark icon would be good for copy success feedback. Using BOOK_ICON_SVG as placeholder.
const CHECK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-check" width="14px" height="14px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg>`; // Using a generic check for feedback

const IMG_STATUS = {
  SEARCHING: {
    svg: REFRESH_ICON_SVG,
    title: "Processing article.",
  },
  NO_DOI: {
    svg: BAN_ICON_SVG,
    title: "This article did not return a valid DOI.",
  },
  SUCCESS: {
    success: true,
    svg: BOOK_ICON_SVG,
    title:
      "This article's DOI was found, and the link has been updated to direct to Sci-Hub. This icon has been updated to link to the original article address.",
  },
  SUCCESS_REGEX: {
    success: true,
    svg: BOOK_ICON_SVG,
    title:
      "This article's DOI was found in the URL, and the link has been updated to direct to Sci-Hub. This icon has been updated to link to the original article address.",
  },
  SUCCESS_CACHE: {
    success: true,
    svg: BOOK_ICON_SVG,
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
  /**
   * Creates an instance of RequestQueue.
   * @param {number} [concurrency=3] - Maximum number of requests to run in parallel.
   * @param {number} [rateLimit=1000] - Minimum time in milliseconds between the start of consecutive requests.
   */
  constructor(concurrency = 3, rateLimit = 1000) {
    this.concurrency = concurrency; // Max parallel requests
    this.rateLimit = rateLimit; // Milliseconds between requests
    this.running = 0; // Number of requests currently running
    this.queue = []; // Queue of objects: { fn: Function, resolve: Function, reject: Function, requestId: number }
    this.lastRun = 0; // Timestamp of the last request execution start
    this.requestCount = 0; // Total requests enqueued, used for generating unique request IDs
  }

  /**
   * Adds an asynchronous function to the queue.
   * The function should return a Promise.
   * @param {Function} fn - The asynchronous function to enqueue. It must return a Promise.
   * @returns {Promise<any>} A promise that resolves or rejects with the result of the enqueued function.
   */
  enqueue(fn) {
    this.requestCount++;
    const requestId = this.requestCount;
    // console.log(`[Queue] Request #${requestId} added to queue. Queue length: ${this.queue.length + 1}`);

    return new Promise((resolve, reject) => {
      this.queue.push({
        fn, // The function to execute
        resolve, // Resolve function for the promise returned by enqueue
        reject,  // Reject function for the promise returned by enqueue
        requestId // For logging/debugging
      });
      this.dequeue(); // Attempt to process the queue
    });
  }

  /**
   * Processes the queue if conditions allow (not at max concurrency and queue is not empty).
   * Respects the rate limit by waiting if necessary before executing a request.
   * This method is called internally whenever a request is enqueued or finishes.
   * @async
   * @private
   */
  async dequeue() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      // console.log(`[Queue] Cannot dequeue. Running: ${this.running}, Queue length: ${this.queue.length}`);
      return; // Conditions not met to run a new request
    }

    this.running++;
    const { fn, resolve, reject, requestId } = this.queue.shift(); // Get the next request
    const now = Date.now();
    // Calculate time to wait to respect the rate limit
    const timeToWait = Math.max(0, this.lastRun + this.rateLimit - now);

    // console.log(`[Queue] Starting request #${requestId}. Waiting ${timeToWait}ms. Active requests: ${this.running}`);

    // Wait if necessary. `await new Promise` is used for the delay.
    if (timeToWait > 0) {
      await new Promise(r => setTimeout(r, timeToWait));
    }
    this.lastRun = Date.now(); // Record the actual start time of the request

    try {
      const result = await fn(); // Execute the user's function
      // console.log(`[Queue] Request #${requestId} completed successfully`);
      resolve(result); // Resolve the promise that `enqueue` returned
    } catch (error) {
      // Log the error with the specific request ID for better traceability.
      console.error(`[Queue] Request #${requestId} failed during execution:`, error);
      reject(error); // Reject the promise that `enqueue` returned
    } finally {
      this.running--; // Decrement the count of running requests
      // console.log(`[Queue] Request #${requestId} finished. Remaining in queue: ${this.queue.length}`);
      this.dequeue(); // Attempt to process the next item in the queue
    }
  }
}

// Configure the request queue for CrossRef API: 1 concurrent request, 3-second rate limit.
// This is to avoid overwhelming the CrossRef API and getting rate-limited.
const requestQueue = new RequestQueue(1, 3000);


// Grab updated Sci-Hub URL from Wikipedia
/**
 * Fetches the current Sci-Hub domain from Wikipedia and updates `SCIHUB_QUERY`.
 * Caches the domain for 10 minutes to avoid excessive requests.
 * Fetches the current Sci-Hub domain, prioritizing custom URL, then Wikipedia, then default.
 * Caches the Wikipedia-fetched domain for 10 minutes.
 * Fetches the current Sci-Hub domain, prioritizing custom URL, then Wikipedia (with caching), then a hardcoded default.
 * @async
 * @function updateSciHubUrl
 */
async function updateSciHubUrl() {
  let customUrlProcessed = false;
  try {
    // 1. Attempt to load and use custom Sci-Hub URL from storage
    const customUrlData = await browser.storage.local.get("customSciHubUrlValue");
    if (customUrlData && customUrlData.customSciHubUrlValue && customUrlData.customSciHubUrlValue.trim() !== "") {
      const potentialCustomUrl = customUrlData.customSciHubUrlValue.trim();
      // Basic validation for the custom URL
      if (potentialCustomUrl.startsWith("http://") || potentialCustomUrl.startsWith("https://")) {
        SCIHUB_QUERY = potentialCustomUrl;
        console.log(`Using custom Sci-Hub URL: ${SCIHUB_QUERY}`);
        // Update 'last_sci_hub_url_update' to prevent immediate Wikipedia fetch
        // if custom URL is cleared before Wikipedia cache would normally expire.
        await browser.storage.local.set({ last_sci_hub_url_update: Date.now() });
        customUrlProcessed = true;
        return; // Custom URL successfully applied
      } else {
        console.warn("Invalid custom Sci-Hub URL found (must start with http:// or https://):", potentialCustomUrl);
        // Proceed as if no valid custom URL was found
      }
    }
  } catch (e) {
    console.error("Error loading or processing custom Sci-Hub URL from storage:", e);
    // Proceed to Wikipedia fetch logic if custom URL loading fails
  }

  if (customUrlProcessed) return; // Should be redundant if return inside try was hit, but for safety.

  // 2. If no valid custom URL was used, proceed with Wikipedia fetch logic or use cached Wikipedia URL
  try {
    const storedData = await browser.storage.local.get(["last_sci_hub_url_update", "sci_hub_url"]);
    const lastUpdateTimestamp = storedData.last_sci_hub_url_update || 0;
    const sixtyMinutes = 60 * 60 * 1000; // Cache Wikipedia URL for 60 minutes

    if (Date.now() > lastUpdateTimestamp + sixtyMinutes) {
      console.log("Attempting to fetch updated Sci-Hub URL from Wikipedia (cache expired or not present)...");
      const response = await fetch(WIKIPEDIA_PAGE);
      if (!response.ok) {
        throw new Error(`Wikipedia fetch failed with status: ${response.status}`);
      }
      const data = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, "text/html");
      const links = doc.querySelectorAll("td.url>div>ul>li>span.url>a");
      if (links.length > 0 && links[0].host) {
        SCIHUB_QUERY = "https://" + links[0].host;
        await browser.storage.local.set({
          sci_hub_url: SCIHUB_QUERY, // Cache the Wikipedia-fetched URL
          last_sci_hub_url_update: Date.now()
        });
        console.log(`Sci-Hub URL updated from Wikipedia: ${SCIHUB_QUERY}`);
        // Update any existing Sci-Hub links on the page if the host has changed
        document.querySelectorAll("h3>a[host*='sci-hub']").forEach((element) => {
          if (element.host !== links[0].host) { // Check if host is different before changing
            element.host = links[0].host;
          }
        });
      } else {
        throw new Error("Could not find/parse Sci-Hub URL in Wikipedia page structure.");
      }
    } else {
      // Not time to fetch from Wikipedia yet, try to use cached Wikipedia URL
      if (storedData.sci_hub_url) {
        SCIHUB_QUERY = storedData.sci_hub_url;
        console.log(`Using cached (Wikipedia-derived) Sci-Hub URL: ${SCIHUB_QUERY}`);
      } else {
        // This means it's not time to update, but there's no cached Wikipedia URL.
        // This could happen if a previous fetch failed, or if custom URL was just cleared.
        // SCIHUB_QUERY will retain its global default value if not set by custom URL.
        console.log(`No cached Sci-Hub URL (Wikipedia-derived), using current SCIHUB_QUERY (likely default or previously custom): ${SCIHUB_QUERY}`);
      }
    }
  } catch (error) {
    console.error("Error during Wikipedia Sci-Hub URL update process:", error);
    // If this process fails, SCIHUB_QUERY retains its initial global default value,
    // or a custom URL if that was successfully processed before an error here (unlikely path).
    // The global default `let SCIHUB_QUERY = "https://sci-hub.se/";` is the ultimate fallback.
    console.log(`Falling back to/retaining existing Sci-Hub URL: ${SCIHUB_QUERY} after Wikipedia processing error.`);
  }
}

/**
 * Retrieves the DOI for a given article title from the local browser storage.
 * @async
 * @function getDoiFromCache
 * @param {string} title - The title of the article to search for in the cache.
 * @returns {Promise<string|null>} The DOI string if found in cache, otherwise null.
 */
async function getDoiFromCache(title) {
  if (SKIP_DOI_CACHE_LOOKUP) return null;
  try {
    const result = await browser.storage.local.get(title);
    // Check if the result object is not empty and contains the title as a key
    if (result && Object.keys(result).length > 0 && result[title]) {
      // console.log(`DOI found in cache for "${title}": ${result[title]}`);
      return result[title];
    }
    // console.log(`DOI not found in cache for "${title}".`);
  } catch (error) {
    console.error(`Error fetching DOI from cache for "${title}":`, error);
    // Do not re-throw, as failure to find in cache is a normal operational path.
  }
  return null;
}

/**
 * Extracts a DOI from a given URL using a regular expression.
 * @function getDoiFromUrl
 * @param {string} url - The URL to scan for a DOI.
 * @returns {string|null} The extracted DOI string if a match is found, otherwise null.
 */
function getDoiFromUrl(url) {
  if (SKIP_DOI_URL_LOOKUP) return null;
  try {
    const match = url.toString().match(regex); // `regex` is defined globally
    if (match && match[0]) {
      // console.log(`DOI found in URL "${url}": ${match[0]}`);
      return match[0];
    }
  } catch (error) {
    // This is unlikely to throw for string operations but included for robustness.
    console.error(`Error extracting DOI from URL "${url}":`, error);
  }
  return null;
}

/**
 * Fetches the DOI of an article from the CrossRef API using its title and lead author.
 * Uses the `requestQueue` to manage API call concurrency and rate limiting.
 * @async
 * @function getDoiFromCrossRef
 * @param {string} title - The title of the article.
 * @param {string} leadAuthor - The first author of the article.
 * @returns {Promise<string|null>} The DOI string if found and score is sufficient, otherwise null.
 */
async function getDoiFromCrossRef(title, leadAuthor) {
  if (SKIP_DOI_CROSSREF_LOOKUP) return null;
  const crossRefQueryURL = `https://api.crossref.org/v1/works?query.title=${encodeURIComponent(
    title
  )}&query.author=${encodeURIComponent(
    leadAuthor
  )}&rows=1&sort=score&select=DOI,title,score`;
  try {
    // console.log(`Querying CrossRef for "${title}" by ${leadAuthor}`);
    const response = await requestQueue.enqueue(() => fetch(crossRefQueryURL));

    // Check if the response itself is undefined or null, which might happen if the queue fails internally
    if (!response) {
      console.error(`No response received from CrossRef for "${title}", possibly due to queue error.`);
      return null;
    }

    if (!response.ok) {
      // Log non-ok responses (e.g., 404, 500)
      console.error(
        `CrossRef API request failed for "${title}" with status: ${response.status}, URL: ${crossRefQueryURL}`
      );
      return null; // Explicitly return null on non-ok response
    }
    const data = await response.json();
    if (
      data &&
      data.message &&
      data.message.items &&
      data.message.items.length > 0
    ) {
      const checkObject = data.message.items[0];
      const score = checkObject.score;
      if (score > MIN_SCORE) {
        // console.log(`DOI found via CrossRef for "${title}": ${checkObject.DOI}`);
        return checkObject.DOI.toString();
      } else {
        // console.log(`Low score from CrossRef for "${title}": ${score}. Minimum required: ${MIN_SCORE}`);
      }
    } else {
      // console.log(`No items found in CrossRef response for "${title}"`);
    }
  } catch (error) {
    // This catches errors from fetch itself (network issues) or from requestQueue if it rejects
    console.error(`Error during CrossRef API call for "${title}":`, error);
  }
  return null;
}

/**
 * Processes a single Google Scholar search result to find and display a Sci-Hub link.
 * It orchestrates the process of:
 * 1. Extracting article information (title, authors, original URL).
 * 2. Creating and inserting UI elements (icon, DOI input).
 * 3. Attempting to find the DOI through cache, URL parsing, or CrossRef API.
 * 4. Updating the UI with the Sci-Hub link if a DOI is found, or an error/not found status.
 * @async
 * @function processScholarResult
 * @param {HTMLElement} element - The DOM element representing a single search result (typically a `div.gs_ri`).
 */
async function processScholarResult(element) {
  // Create UI elements for displaying status and DOI
  const elIconLink = document.createElement("a");
  const elIcon = document.createElement("span"); // Changed from <img> to <span>
  const elDOI = document.createElement("input");

  // Configure DOI Text Element
  elDOI.hidden = true;
  elDOI.readOnly = true;
  elDOI.style.border = '1px solid #ccc'; // Standard border
  elDOI.style.borderRight = 'none';      // Remove right border to connect with copy button
  elDOI.style.borderTopLeftRadius = '4px';
  elDOI.style.borderBottomLeftRadius = '4px';
  elDOI.style.borderTopRightRadius = '0';
  elDOI.style.borderBottomRightRadius = '0';
  elDOI.style.padding = '1px 3px'; // Adjusted for 18px height
  elDOI.style.fontSize = '12px';   // Reduced font size
  elDOI.style.backgroundColor = '#f9f9f9';
  elDOI.style.fontFamily = 'Arial, sans-serif';
  elDOI.style.boxSizing = 'border-box';
  elDOI.style.height = '18px'; // Target height
  // elDOI.style.marginRight = '0';


  // Configure Icon Element (now a span)
  elIcon.style.display = 'inline-flex'; // To allow align-items and other flex properties if needed
  elIcon.style.alignItems = 'center';   // Vertically center SVG if its height is less than span's line-height
  elIcon.style.height = '1em';          // SVG will scale to this height
  elIcon.style.width = '1em';           // SVG will scale to this width
  elIcon.style.verticalAlign = 'middle';// Align span with surrounding text
  elIcon.style.marginRight = '4px';
  // elIcon.style.color = '#555'; // Example: set a default color for icons, can be overridden


  // Pull out important information
  const elTitle = element.querySelector("h3>a");
  const elAuthors = element.querySelector("div.gs_a");
  const title = elTitle.innerText.toString();
  const leadAuthor = elAuthors.innerText.toString().split(", ")[0];
  const oldURL = elTitle.href;

  elIcon.innerHTML = IMG_STATUS.SEARCHING.svg; // Use innerHTML for SVG
  elIcon.title = IMG_STATUS.SEARCHING.title;   // Set initial title on the icon itself

  // Create a container for DOI input and copy button
  const doiContainer = document.createElement('div');
  doiContainer.className = 'doi-container';
  doiContainer.style.display = 'flex';
  doiContainer.style.alignItems = 'center';
  doiContainer.style.marginTop = '5px';
  // doiContainer.style.marginLeft = '8px';
  // doiContainer.style.verticalAlign = ''; // Not needed for block/flex
  doiContainer.style.height = '18px';       // Set container height
  doiContainer.hidden = true;

  // Append elDOI to the container (it's already configured)
  // Ensure elDOI's own marginLeft is 0 as the container now handles it.
  elDOI.style.marginLeft = '0';
  doiContainer.appendChild(elDOI);

  elIconLink.insertAdjacentElement("afterbegin", elIcon);
  elTitle.insertAdjacentElement("beforebegin", elIconLink);
  // Insert the container after the title
  elTitle.insertAdjacentElement("afterend", doiContainer);

  let doi = null;
  let statusToUse = IMG_STATUS.NO_DOI; // Default to NO_DOI

  try {
    // 1. Try to get DOI from cache
    doi = await getDoiFromCache(title);
    if (doi) {
      statusToUse = IMG_STATUS.SUCCESS_CACHE;
    }

    // 2. If not in cache, try to get DOI from URL
    if (!doi) {
      doi = getDoiFromUrl(oldURL);
      if (doi) {
        statusToUse = IMG_STATUS.SUCCESS_REGEX;
        // Cache the DOI found from URL
        try {
          const cacheObj = { [title]: doi };
          await browser.storage.local.set(cacheObj);
          // console.log(`DOI from URL cached for "${title}": ${doi}`);
        } catch (cacheError) {
          console.error(
            `Failed to cache DOI from URL for "${title}":`,
            cacheError
          );
          // Continue even if caching fails, as DOI is found.
        }
      }
    }

    // 3. If not found yet, try to get DOI from CrossRef
    if (!doi) {
      doi = await getDoiFromCrossRef(title, leadAuthor);
      if (doi) {
        statusToUse = IMG_STATUS.SUCCESS;
        // Cache the DOI found from CrossRef
        try {
          const cacheObj = { [title]: doi };
          await browser.storage.local.set(cacheObj);
          // console.log(`DOI from CrossRef cached for "${title}": ${doi}`);
        } catch (cacheError) {
          console.error(
            `Failed to cache DOI from CrossRef for "${title}":`,
            cacheError
          );
          // Continue even if caching fails.
        }
      }
    }

    // 4. Update UI based on whether DOI was found
    if (doi) {
      // Ensure SCIHUB_QUERY is not empty or default if Wikipedia fetch failed previously.
      // This check is particularly for scenarios where the initial `init` call to `updateSciHubUrl`
      // might have failed to get a fresh URL, and `SCIHUB_QUERY` is still the hardcoded default,
      // and no `sci_hub_url` (from Wikipedia) is in cache.
      // This provides a last-minute chance to refresh `SCIHUB_QUERY` before constructing the link.
      const isDefaultQuery = SCIHUB_QUERY === "https://sci-hub.se/";
      const cachedSciHubUrl = await browser.storage.local.get("sci_hub_url");
      if (!SCIHUB_QUERY || (isDefaultQuery && !cachedSciHubUrl.sci_hub_url)) {
        console.warn(`SCIHUB_QUERY ('${SCIHUB_QUERY}') appears to be default or stale; attempting refresh before use.`);
        await updateSciHubUrl(); // Attempt a refresh.
      }
      let newURL = SCIHUB_QUERY + doi;
      // Some DOIs might resolve to an HTML page on Sci-Hub directly, remove trailing /html
      if (newURL.endsWith("\/html")) {
        newURL = newURL.substring(0, newURL.length - 5);
      }
      UpdateStatus(
        statusToUse,
        elIconLink,
        elIcon,
        elTitle,
        elDOI,
        doi,
        newURL,
        oldURL
      );
    } else {
      UpdateStatus(IMG_STATUS.NO_DOI, elIconLink, elIcon, elTitle, elDOI);
    }
  } catch (error) {
    console.error(`Error processing scholar result for "${title}":`, error);
    // This is a general catch for errors during the DOI lookup and processing phase.
    // We ensure the UI is updated to a "NO_DOI" state.
    // statusToUse would already be NO_DOI if all attempts failed gracefully.
    // This primarily catches unexpected errors from the DOI lookup and processing section.
    UpdateStatus(IMG_STATUS.NO_DOI, elIconLink, elIcon, elTitle, elDOI, null, null, oldURL);
  }
  // Note: Critical errors in initial DOM setup (e.g., querySelector failing) before the try block
  // would not be caught by the above try-catch. They would propagate to the init() function's catch.
  // This is an acceptable separation of concerns, as the try-catch above is for the DOI logic.
}

// Initialize processing for all scholar results on the page after ensuring Sci-Hub URL is current
async function init() {
  try {
    await updateSciHubUrl(); // Ensure SCIHUB_QUERY is up-to-date before processing results.
    document.querySelectorAll("div.gs_ri").forEach(processScholarResult);
  } catch (err) {
    console.error("Initialization failed:", err);
    // Optionally, inform the user that the extension could not initialize correctly.
    // At this point, scholar results won't be processed.
  }
}

init(); // Call init to start the process.

/**
 * Updates the UI elements (icon, title link, DOI display) based on the outcome of the DOI search.
 * @function UpdateStatus
 * @param {object} status - An object from `IMG_STATUS` defining the icon's src and title.
 * @param {HTMLAnchorElement} elIconLink - The anchor element wrapping the status icon. This will link to the original article URL if a DOI is found.
 * @param {HTMLImageElement} elIcon - The image element for the status icon.
 * @param {HTMLAnchorElement} elTitle - The anchor element for the article title. This will be updated to point to Sci-Hub if a DOI is found.
 * @param {HTMLInputElement} elDOI - The input element (usually hidden) to display the found DOI.
 * @param {string} [doi] - The DOI string, if found.
 * @param {string} [newURL] - The generated Sci-Hub URL for the article, if DOI was found.
 * @param {string} [oldURL] - The original URL of the article, used to set the icon's link if DOI was found.
 */
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
  // Update icon properties
  elIcon.innerHTML = status.svg; // Use innerHTML for SVG
  elIcon.title = status.title;

  // Get the container for DOI elements (which is elDOI's parentNode if setup correctly)
  const doiContainer = elDOI.parentNode;

  // Manage DOI input field and Copy button visibility
  if (status.success && doi) {
    if (doiContainer && doiContainer.classList.contains('doi-container')) {
      doiContainer.hidden = false; // Show the container
    }
    elDOI.hidden = false; // Show DOI input within the container
    elDOI.value = doi;
    elDOI.size = doi.length - 3; // Cap at 15, effectively halving the previous max of 30

    elTitle.href = newURL;
    elIconLink.href = oldURL;

    // Create or get existing copy button (now inside doiContainer)
    let copyButton = elDOI.nextElementSibling;
    if (!copyButton || !copyButton.classList.contains('scihub-scholar-copy-button')) {
      copyButton = document.createElement('button');
      copyButton.classList.add('scihub-scholar-copy-button');
      const copyIcon = document.createElement('span'); // Changed from <img> to <span>

      copyIcon.innerHTML = COPY_ICON_SVG;
      // copyIcon.alt = "Copy";
      copyIcon.style.height = '14px';    // Icon SVG container height
      copyIcon.style.width = '14px';     // Icon SVG container width
      copyIcon.style.display = 'inline-flex';
      copyIcon.style.alignItems = 'center';
      copyIcon.style.justifyContent = 'center';

      copyButton.appendChild(copyIcon);
      copyButton.title = 'Copy DOI to clipboard';

      // Styling for copyButton
      copyButton.style.boxSizing = 'border-box';
      copyButton.style.height = '18px'; // Match elDOI's explicit height
      copyButton.style.border = '1px solid #ccc';
      copyButton.style.borderLeft = 'none';
      copyButton.style.borderTopLeftRadius = '0';
      copyButton.style.borderBottomLeftRadius = '0';
      copyButton.style.borderTopRightRadius = '4px';
      copyButton.style.borderBottomRightRadius = '4px';

      copyButton.style.backgroundColor = '#e9e9e9'; // Darker background than elDOI

      copyButton.style.paddingTop = '0';
      copyButton.style.paddingBottom = '0';
      copyButton.style.paddingLeft = '8px';  // Further minimized horizontal padding
      copyButton.style.paddingRight = '8px'; // Further minimized horizontal padding

      copyButton.style.minWidth = 'min-content'; // Ensure button is not too wide
      copyButton.style.marginLeft = '0';
      copyButton.style.marginRight = '0';
      copyButton.style.cursor = 'pointer';

      // Use flex to center the icon inside the button
      copyButton.style.display = 'inline-flex';
      copyButton.style.alignItems = 'center';
      copyButton.style.justifyContent = 'center';
      // copyButton.style.lineHeight = '1'; // Not strictly needed with flex centering

      copyButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const doiToCopy = elDOI.value;
        try {
          await navigator.clipboard.writeText(doiToCopy);
          const originalIconHTML = copyIcon.innerHTML; // Should be COPY_ICON_SVG
          copyIcon.innerHTML = CHECK_ICON_SVG;
          // Ensure CHECK_ICON_SVG is also styled for 14px if it's different from BOOK_ICON_SVG
          // If CHECK_ICON_SVG is BOOK_ICON_SVG (which is 1em), it might look too big.
          // For now, assuming CHECK_ICON_SVG is also appropriately sized or will be.
          copyButton.title = 'Copied!';

          setTimeout(() => {
            copyIcon.innerHTML = originalIconHTML; // Restore original (COPY_ICON_SVG)
            copyButton.title = 'Copy DOI to clipboard';
          }, 1500);
        } catch (err) {
          console.error('Failed to copy DOI: ', err);
          copyButton.title = 'Failed to copy!';
          setTimeout(() => {
            copyButton.title = 'Copy DOI to clipboard';
          }, 1500);
        }
      });

      // Append copyButton to the doiContainer, after elDOI
      if (doiContainer) {
        doiContainer.appendChild(copyButton);
      } else {
        // Fallback if container somehow isn't the parent (should not happen with new structure)
        elDOI.parentNode.insertBefore(copyButton, elDOI.nextSibling);
      }
    }
    copyButton.hidden = false;
  } else {
    // Hide DOI input, its container, and copy button if no success
    if (doiContainer && doiContainer.classList.contains('doi-container')) {
      doiContainer.hidden = true;
    }
    elDOI.hidden = true; // Also hide input just in case

    // Attempt to find and hide copy button if it exists within the container or as a sibling
    let existingCopyButton;
    if (doiContainer && doiContainer.contains(elDOI)) {
      existingCopyButton = elDOI.nextElementSibling; // Assumes it's a direct sibling inside the container
    } else {
      existingCopyButton = elDOI.nextElementSibling; // Fallback to old structure if container is not parent
    }

    if (existingCopyButton && existingCopyButton.classList.contains('scihub-scholar-copy-button')) {
      existingCopyButton.hidden = true;
    }
  }
}
