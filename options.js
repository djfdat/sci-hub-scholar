const btnClearCachedDOIs = document.getElementById("ClearCachedDOIs")
const btnRefreshCacheSize = document.getElementById("RefreshCacheSize")

document.addEventListener("DOMContentLoaded", UpdateCurrentCachedDOIsCount)
btnRefreshCacheSize.onclick = UpdateCurrentCachedDOIsCount

function UpdateCurrentCachedDOIsCount() {
	browser.storage.local.get()
		.then((result) => {
			document.getElementById("CachedDOIsCount").innerHTML = Object.keys(result).length
	})
}

btnClearCachedDOIs.onclick = () => {
	console.log("Clearing Cached DOIs");
	browser.storage.local.clear();
	UpdateCurrentCachedDOIsCount();
};
