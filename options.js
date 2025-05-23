const btnClearCachedDOIs = document.getElementById("ClearCachedDOIs");
const btnRefreshCacheSize = document.getElementById("RefreshCacheSize");
const customSciHubUrlInput = document.getElementById("customSciHubUrl");
const saveCustomUrlButton = document.getElementById("saveCustomUrl");
const saveStatusSpan = document.getElementById("saveStatus");

/**
 * Updates the displayed count of cached DOIs.
 * Fetches all items from local storage and counts only those not part of the configuration.
 * @async
 */
async function UpdateCurrentCachedDOIsCount() {
	try {
		const result = await browser.storage.local.get();
		let count = 0;
		// Iterate over all stored items and count only those that are actual DOI caches,
		// excluding known configuration keys.
		for (const key in result) {
			if (
				key !== "last_sci_hub_url_update" &&
				key !== "sci_hub_url" &&
				key !== "customSciHubUrlValue"
			) {
				count++;
			}
		}
		const countElement = document.getElementById("CachedDOIsCount");
		if (countElement) {
			countElement.innerHTML = count;
		} else {
			console.error("CachedDOIsCount element not found in options.html");
		}
	} catch (error) {
		console.error("Error updating cached DOIs count:", error);
		const countElement = document.getElementById("CachedDOIsCount");
		if (countElement) {
			countElement.innerHTML = "Error";
		}
	}
}

/**
 * Clears all cached DOIs (article titles as keys) from local storage and updates the count.
 * Preserves specific configuration keys.
 * @async
 */
async function clearCachedDOIs() {
	console.log("Clearing Cached DOIs (excluding config keys)");
	try {
		const allItems = await browser.storage.local.get();
		const keysToRemove = [];
		for (const key in allItems) {
			// Identify keys that are not part of the reserved configuration set.
			if (
				key !== "last_sci_hub_url_update" &&
				key !== "sci_hub_url" &&
				key !== "customSciHubUrlValue"
			) {
				keysToRemove.push(key);
			}
		}
		if (keysToRemove.length > 0) {
			await browser.storage.local.remove(keysToRemove);
			console.log("Removed DOI cache keys:", keysToRemove);
		} else {
			console.log("No DOI cache keys found to remove.");
		}
		await UpdateCurrentCachedDOIsCount(); // Refresh the displayed count
	} catch (error) {
		console.error("Error clearing cached DOIs:", error);
	}
}

/**
 * Loads the saved custom Sci-Hub URL from storage and populates the input field.
 * If no custom URL is stored, the input field is left with its placeholder.
 * @async
 */
async function loadCustomUrl() {
	try {
		const result = await browser.storage.local.get("customSciHubUrlValue");
		if (result && result.customSciHubUrlValue) {
			customSciHubUrlInput.value = result.customSciHubUrlValue;
		} else {
			// Ensure input is empty (shows placeholder) if no custom URL is stored.
			customSciHubUrlInput.value = "";
		}
	} catch (error) {
		console.error("Error loading custom Sci-Hub URL:", error);
		// Ensure input is clear or indicates error if loading fails.
		customSciHubUrlInput.value = "";
		// Optionally, display an error message to the user in the options page itself,
		// for example, by setting textContent of a dedicated error span.
	}
}

/**
 * Saves the custom Sci-Hub URL entered by the user to local storage.
 * If the URL is empty, it removes the setting from storage.
 * Provides user feedback on save.
 * @async
 */
async function saveCustomUrl() {
	const urlToSave = customSciHubUrlInput.value.trim();
	saveStatusSpan.textContent = ""; // Clear previous status

	try {
		if (urlToSave) {
			// Basic URL validation (starts with http:// or https://)
			if (!urlToSave.startsWith("http://") && !urlToSave.startsWith("https://")) {
				saveStatusSpan.textContent = "Error: URL must start with http:// or https://";
				saveStatusSpan.style.color = "red";
				return;
			}
			await browser.storage.local.set({ customSciHubUrlValue: urlToSave });
			saveStatusSpan.textContent = "Saved!";
			saveStatusSpan.style.color = "green";
		} else {
			// If input is empty, remove the custom URL setting to revert to automatic/default
			await browser.storage.local.remove("customSciHubUrlValue");
			saveStatusSpan.textContent = "Cleared. Using automatic URL.";
			saveStatusSpan.style.color = "orange";
		}
	} catch (error) {
		console.error("Error saving custom Sci-Hub URL:", error);
		saveStatusSpan.textContent = "Error saving!";
		saveStatusSpan.style.color = "red";
	}

	// Clear the status message after a few seconds
	setTimeout(() => {
		saveStatusSpan.textContent = "";
	}, 3000);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
	UpdateCurrentCachedDOIsCount();
	loadCustomUrl();
});

if (btnRefreshCacheSize) {
	btnRefreshCacheSize.onclick = UpdateCurrentCachedDOIsCount;
}

if (btnClearCachedDOIs) {
	btnClearCachedDOIs.onclick = clearCachedDOIs;
}

if (saveCustomUrlButton) {
	saveCustomUrlButton.onclick = saveCustomUrl;
}
