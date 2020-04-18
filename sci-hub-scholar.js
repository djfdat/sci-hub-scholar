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
print(collectedLinks)
collectedLinks.forEach(element => {
	fetch(CROSSREF_QUERY(element.innerText))
	.then((response) => response.json())
	.then((data) => {
		if (data.status == 'ok') {
			// print(data)

			statusIcon = document.createElement("img")
			element.insertAdjacentElement("beforebegin", statusIcon)

			SetStatusIcon(statusIcon, IMG_STATUS.SEARCHING)

			checkObject = data.message.items[0]
			if (checkObject.title.toString().toLowerCase() == element.innerText.toString().toLowerCase()) {
				// print("_______________")
				// print("Match found")
				// print(checkObject.title.toString().toLowerCase())
				// print(element.href)
				// print("DOI: " + checkObject.DOI)

				// print("_______________")

				element.href = SCIHUB_QUERY + checkObject.DOI
				print(element.href)

				SetStatusIcon(statusIcon, IMG_STATUS.SUCCESS)
			}
			else {
				SetStatusIcon(statusIcon, IMG_STATUS.NO_DOI)
			}
		}
	})
	.catch((error) => {
		console.error('Error:', error);
	});
	return
});

function SetStatusIcon(element, status) {
	element.src = status.src
	element.title = status.title
}

function CROSSREF_QUERY(searchQuery) {
	const CROSSREF_QUERY_PREFIX = 'https://api.crossref.org/works?query='
	const CROSSREF_QUERY_SUFFIX = "&rows=1&select=DOI,title"

	return "" + CROSSREF_QUERY_PREFIX + searchQuery + CROSSREF_QUERY_SUFFIX
}