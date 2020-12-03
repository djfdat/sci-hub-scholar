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
			browser.storage.local.set({last_sci_hub_url_update: Date.now()})
			return results[0].host
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
	statusIcon.width = 18
	statusIcon.height = 18
	statusA.insertAdjacentElement("afterbegin",statusIcon)
	element.insertAdjacentElement("beforebegin", statusA)
	element.insertAdjacentElement("afterend", statusDOI)
	// element.insertAdjacentElement("afterend", statusDOI)
	SetStatusIcon(element, IMG_STATUS.SEARCHING,"","")
	const title = element.innerText.toString().toLowerCase()
	browser.storage.local.get(title)
	.then(result => {
		if (Object.keys(result).length > 0) {
			url = SCIHUB_QUERY + result[title]
			SetStatusIcon(element, IMG_STATUS.SUCCESS,url,result[title])
		}
		else {
			if(element.href.toString().includes("https://arxiv.org/abs/")){
				// regex of arxivID: (\d{4}.\d{4,5}|[a-z\-]+(\.[A-Z]{2})?\/\d{7})(v\d+)?
				doi = element.href.toString().substr(22)
				url = element.href.toString()
				SetStatusIcon(element, IMG_STATUS.SUCCESS,url,doi)
				var setObj = new Object()
				setObj[title] = doi
				browser.storage.local.set(setObj)
			}
			else if(element.href.toString().match(/10.\d{4,9}\/[-._;()/:A-Z0-9]+/i)){
				doi = element.href.toString().match(/10.\d{4,9}\/[-._;()/:A-Z0-9]+/i)
				url = element.href.toString()
				SetStatusIcon(element, IMG_STATUS.SUCCESS,url,doi)
				var setObj = new Object()
				setObj[title] = doi
				browser.storage.local.set(setObj)
			}
			else{
				fetch(CROSSREF_QUERY(title))
				.then(response => response.json())
				.then(data => {
					if (data.status == 'ok') {
						checkObject = data.message.items[0]
						if (checkObject.title.toString().toLowerCase() == title) {
							doi = checkObject.DOI
							url = SCIHUB_QUERY + doi
							SetStatusIcon(element, IMG_STATUS.SUCCESS,url,doi)
							var setObj = new Object()
							setObj[title] = doi
							browser.storage.local.set(setObj)
						}
						else {
							SetStatusIcon(element, IMG_STATUS.NO_DOI,"","")
						}
					}
				})
			}
		}
	})
	return
});

function SetStatusIcon(element, status,url,doi) {
	element.previousElementSibling.href= url
	element.previousElementSibling.firstElementChild.src = status.src
	element.previousElementSibling.title = status.title
	// if(doi!=""){window.clipboardData.setData('text',doi);}
	if(status==IMG_STATUS.SUCCESS){
		element.nextElementSibling.Type="text"
		element.nextElementSibling.value=doi
	}
}

// function copyToClipboard(text) {
    // var dummy = document.createElement("textarea");
    // // to avoid breaking orgain page when copying more words
    // // cant copy when adding below this code
    // // dummy.style.display = 'none'
    // document.body.appendChild(dummy);
    // //Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
    // dummy.value = text;
    // dummy.select();
    // document.execCommand("copy");
    // document.body.removeChild(dummy);
// }

function CROSSREF_QUERY(searchQuery) {
	const CROSSREF_QUERY_PREFIX = 'https://api.crossref.org/works?query='
	const CROSSREF_QUERY_SUFFIX = "&rows=1&select=DOI,title&mailto=shdagdsfjdsanhjfdksagj@gmail.com"

	return "" + CROSSREF_QUERY_PREFIX + searchQuery + CROSSREF_QUERY_SUFFIX
}