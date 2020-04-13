print = console.log
const CROSSREF_QUERY = 'https://api.crossref.org/works?query='

document.body.style.border = "5px solid red";

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
			if (data.message.items[0].title.toString().toLowerCase() == element.innerText.toString().toLowerCase()) {
				print("_______________")
				print("Match found")
				print(data.message.items[0].title.toString().toLowerCase())
				print(element.innerText.toString().toLowerCase())
				print("_______________")
			}
			else {

			}
		}
	})
	.catch((error) => {
		console.error('Error:', error);
	});
	return
});