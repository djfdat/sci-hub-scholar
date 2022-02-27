const IMG_STATUS = {
	SEARCHING: {
		src: browser.runtime.getURL("icons/refresh.svg"),
		title: "Processing article."
	},
	WHITELISTED: {
		src: browser.runtime.getURL("icons/award.svg"),
		title: "This website for this article was found in the whitelist."
	},
	NO_DOI: {
		src: browser.runtime.getURL("icons/ban.svg"),
		title: "This article did not return a valid DOI."
	},
	NO_ARTICLE: {
		src: browser.runtime.getURL("icons/ban.svg"),
		title: "This article was not found on Sci-Hub."
	},
	SUCCESS: {
		src: browser.runtime.getURL("icons/book.svg"),
		title: "This article was found on Sci-Hub, and the link has been updated."
	},
}

const WIKIPEDIA_PAGE = "https://en.wikipedia.org/wiki/Sci-Hub"

let SCIHUB_QUERY = "https://sci-hub.se/"

browser.storage.local
	.get("last_sci_hub_url_update")
	.then(result => {
		if (Date.now() > result.last_sci_hub_url_update + 600000) {
			// 10 minutes cache
			fetch(WIKIPEDIA_PAGE)
				.then(response => response.text())
				.then(data => {
					const parser = new DOMParser()
					const doc = parser.parseFromString(data, "text/html")
					const results = doc.querySelectorAll('td.url>div>ul>li>span.url>a')
					browser.storage.local.set({ last_sci_hub_url_update: Date.now() })
					return results[0].host
				})
				.then(host => {
					console.log(host);
					return host;
				})
				.then(host => {
					SCIHUB_QUERY = "https://" + host
					document.querySelectorAll('h3>a').forEach(element => {
						if (element.host.includes("sci-hub") && element.host != host) {
							element.host = host
						}
					})
				})
				.catch(error => {
					console.error("Error: ", error)
				})
		}
	})

document.querySelectorAll('h3>a').forEach(element => {
	const statusA = document.createElement("a")
	const statusIcon = document.createElement("img")
	const statusDOI = document.createElement("input")
	statusDOI.hidden = true
	statusIcon.width = 18
	statusIcon.height = 18
	statusA.insertAdjacentElement("afterbegin", statusIcon)
	element.insertAdjacentElement("beforebegin", statusA)
	element.insertAdjacentElement("afterend", statusDOI)
	UpdateStatus(IMG_STATUS.SEARCHING, element.previousElementSibling, element, element.nextElementSibling, null, null)
	const title = element.innerText.toString().toLowerCase()
	browser.storage.local.get(title)
		.then(result => {
			// Found cached title/url, no need to look up DOI
			if (Object.keys(result).length > 0) {
				url = SCIHUB_QUERY + result[title]
				UpdateStatus(IMG_STATUS.SUCCESS, element.previousElementSibling, element, element.nextElementSibling, url, result[title])
			}
			// Else, lookup URLs w/ different methods
			else {
				// ARXIV lookup
				if (element.href.toString().includes("https://arxiv.org/abs/")) {
					// regex of arxivID: (\d{4}.\d{4,5}|[a-z\-]+(\.[A-Z]{2})?\/\d{7})(v\d+)?
					doi = element.href.toString().substr(22)
					url = element.href.toString()
					UpdateStatus(IMG_STATUS.SUCCESS, element.previousElementSibling, element, element.nextElementSibling, url, doi)
					var setObj = new Object()
					setObj[title] = doi
					browser.storage.local.set(setObj)
				}
				// DOI lookup
				else if (element.href.toString().match(/10.\d{4,9}\/[-._;()/:A-Z0-9]+/i)) {
					doi = element.href.toString().match(/10.\d{4,9}\/[-._;()/:A-Z0-9]+/i)
					url = element.href.toString()
					UpdateStatus(IMG_STATUS.SUCCESS, element.previousElementSibling, element, element.nextElementSibling, url, doi)
					var setObj = new Object()
					setObj[title] = doi
					browser.storage.local.set(setObj)
				}
				else {
					// Crossref Lookup
					fetch(CROSSREF_QUERY(title))
						.then(response => response.json())
						.then(data => {
							if (data.status == 'ok') {
								checkObject = data.message.items[0]
								if (checkObject.title.toString().toLowerCase() == title) {
									doi = checkObject.DOI
									url = SCIHUB_QUERY + doi
									UpdateStatus(IMG_STATUS.SUCCESS, element.previousElementSibling, element, element.nextElementSibling, url, doi)
									var setObj = new Object()
									setObj[title] = doi
									browser.storage.local.set(setObj)
								}
								else {
									UpdateStatus(IMG_STATUS.NO_DOI, element.previousElementSibling, element, element.nextElementSibling, false, false)
								}
							}
						})
				}
			}
		})
	return
});

function UpdateStatus(status, elIcon, elTitle, elDOI, url, doi) {
	elIcon.firstElementChild.src = status.src
	elIcon.title = status.title
	elIcon.href = null

	switch (status) {
		case IMG_STATUS.SEARCHING:

			break;
		case IMG_STATUS.WHITELISTED:

			break;
		case IMG_STATUS.NO_DOI:

			break;
		case IMG_STATUS.NO_ARTICLE:

			break;
		case IMG_STATUS.SUCCESS:
			// Set Icon URL to original URL
			elIcon.href = elTitle.href

			// Set title url to new URL
			elTitle.href = url

			// Set DOI Object
			elDOI.value = doi
			elDOI.readOnly = true
			elDOI.hidden = false

			break;

		default:
			break;
	}
}

function SetStatusIcon(element, status, url, doi) {
	element.href = url
	// Set Icon
	element.previousElementSibling.href = element.href
	element.previousElementSibling.firstElementChild.src = status.src
	element.previousElementSibling.title = status.title
	if (status == IMG_STATUS.SUCCESS) {
		// Set doi field
		element.nextElementSibling.value = doi
		element.nextElementSibling.readOnly = true
		element.nextElementSibling.hidden = false
	}
}

function CROSSREF_QUERY(searchQuery) {
	const CROSSREF_QUERY_PREFIX = 'https://api.crossref.org/works?query='
	const CROSSREF_QUERY_SUFFIX = "&rows=1&select=DOI,title&mailto=shdagdsfjdsanhjfdksagj@gmail.com"

	return "" + CROSSREF_QUERY_PREFIX + searchQuery + CROSSREF_QUERY_SUFFIX
}