# Sci-Hub Scholar

Firefox Extension to automatically modify Google Scholar links to point to Sci-Hub.

Features

- [Planned] Whitelist for allowing links to certain website
- [Planned] Support Rate CrossRef Good Citizen features
	- Rate Limiting
	- [Done] Caching
- [Done] Use Wikipedia to grab up-to-date urls for Sci-Hub
- [Planned] Display Visual Indicator for link status on Google Scholar
	- States: Whitelisted, Searching, DOI Not Found, Sci-Hub Article Not Found, Success
	- [Done]Hover over indicator should display more info for each state
- [Planned] Settings Page
	- Whitelist
	- Use Anonymous CrossRef (will increase Rate Limiting)

# How it works

1. When a Google Scholar search results page opens.
2. Parse each article link.
3. If destination website is in whitelist, skip remaining.
4. Check cache. If listed, use the saved data and skip step 5.
5. Lookup DOI on CrossRef using article name.
6. If found, Lookup Sci-Hub current URL using Wikipedia or https://whereisscihub.now.sh/
7. If found, update href to use Sci-Hub URL

# Useful Links
- https://github.com/CrossRef/rest-api-doc
- https://en.wikipedia.org/wiki/Sci-Hub
- https://whereisscihub.now.sh/
- https://news.ycombinator.com/item?id=22409674
