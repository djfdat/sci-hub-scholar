print = console.log // Because no one ever wants to print

const SCIHUB_QUERY = 'https://www.sci-hub.tw/'

// Whitelisted, Searching, DOI Not Found, Sci-Hub Article Not Found, Success
const IMG_STATUS = {
	SEARCHING: {
		src: browser.extension.getURL("icons/refresh.svg"),
		title: "Processing article."
	},
	WHITELISTED: {
		src: browser.extension.getURL("icons/award.svg"),
		title: "This website for this article was found in the whitelist."
	},
	NO_DOI: {
		src: browser.extension.getURL("icons/ban.svg"),
		title: "This article did not return a valid DOI."
	},
	NO_ARTICLE: {
		src: browser.extension.getURL("icons/ban.svg"),
		title: "This article was not found on Sci-Hub."
	},
	SUCCESS: {
		src: browser.extension.getURL("icons/book.svg"),
		title: "This article was found on Sci-Hub, and the link has been updated."
	},
}

const collectedLinks = document.querySelectorAll('h3>a')
collectedLinks.forEach(element => {
	const statusIcon = document.createElement("img")
	statusIcon.width = 18
	statusIcon.height = 18
	element.insertAdjacentElement("beforebegin", statusIcon)
	SetStatusIcon(element, IMG_STATUS.SEARCHING)

	const title = element.innerText.toString().toLowerCase()
	browser.storage.local.get(title)
	.then((result) => {
		if (Object.keys(result).length > 0) {
			element.href = SCIHUB_QUERY + result[title]
			SetStatusIcon(element, IMG_STATUS.SUCCESS)
		}
		else {
			fetch(CROSSREF_QUERY(title))
			.then((response) => response.json())
			.then((data) => {
				if (data.status == 'ok') {
					checkObject = data.message.items[0]
					if (checkObject.title.toString().toLowerCase() == title) {
						element.href = SCIHUB_QUERY + checkObject.DOI
						SetStatusIcon(element, IMG_STATUS.SUCCESS)
		
						var setObj = new Object()
						setObj[title] = checkObject.DOI
						browser.storage.local.set(setObj)
					}
					else {
						SetStatusIcon(element, IMG_STATUS.NO_DOI)
					}
				}
			})
			.catch((error) => {
				console.error('Error:', error);
			});
		}
	})
	return
});

function SetStatusIcon(element, status) {
	element.previousElementSibling.src = status.src
	element.previousElementSibling.title = status.title
}

function CROSSREF_QUERY(searchQuery) {
	const CROSSREF_QUERY_PREFIX = 'https://api.crossref.org/works?query='
	const CROSSREF_QUERY_SUFFIX = "&rows=1&select=DOI,title&mailto=djfdat+scihubscholar@gmail.org"

	return "" + CROSSREF_QUERY_PREFIX + searchQuery + CROSSREF_QUERY_SUFFIX
}

// Use this to get urls for Sci-Hub
// https://en.wikipedia.org/wiki/Sci-Hub
// document.querySelectorAll('td.url>a').forEach(function(e) {fetch(e.origin).then((r) => {console.log(r)})})
