print = console.log
const CROSSREF_QUERY = 'https://api.crossref.org/works?query='
const SCIHUB_QUERY = 'https://www.sci-hub.tw/'

// document.body.style.border = "5px solid red";

const collectedLinks = document.querySelectorAll('h3>a')
// print(collectedLinks)
collectedLinks.forEach(element => {
	// print(CROSSREF_QUERY + element.innerText)
	const url = CROSSREF_QUERY + element.innerText
	fetch(url)
	.then((response) => response.json())
	.then((data) => {
		// print('Success:', data);
		// print(data.status)
		if (data.status == 'ok') {
			// print(url)
			print(data)
			statusIcon = document.createElement("img")
			// statusIcon.src = browser.extension.getURL("icons/alert-circle.svg")
			// statusIcon.style.color = "orange"
			// statusIcon.style.fill = "orange"
			// statusIcon.style.stroke = "orange"
			element.insertAdjacentElement("beforebegin", statusIcon)
			// element.appendChild(statusIcon)
			checkObject = data.message.items[0]
			if (checkObject.title.toString().toLowerCase() == element.innerText.toString().toLowerCase()) {
				print("_______________")
				print("Match found")
				print(checkObject.title.toString().toLowerCase())
				// print(element.innerText.toString().toLowerCase())
				print(element.href)
				print("DOI: " + checkObject.DOI)
				print("_______________")
				element.style.border = "2px solid blue";
				element.href = SCIHUB_QUERY + checkObject.DOI
				statusIcon.src = browser.extension.getURL("icons/check.svg")
				// statusIcon.style.color = "green"
				// statusIcon.style.fill = "green"
				// statusIcon.style.stroke = "green"
			}
			else {
				// print("_______________")
				// print("Match not found")
				// print(checkObject.title.toString().toLowerCase())
				// print(element.innerText.toString().toLowerCase())
				// print("_______________")
				element.style.border = "2px solid red";
				statusIcon.src = browser.extension.getURL("icons/x.svg")
				// statusIcon.style.color = "red"
				// statusIcon.style.fill = "red"
				// statusIcon.style.stroke = "red"
			}
		}
	})
	.catch((error) => {
		console.error('Error:', error);
	});
	return
});