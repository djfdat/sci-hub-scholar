# Sci-Hub Scholar

Firefox Extension to automatically modify Google Scholar links to point to Sci-Hub.

Features

- [Planned] Whitelist for allowing links to certain website
- [Planned] Support Rate CrossRef Good Citizen features
 - Rate Limiting
 - Caching
- [Planned] Support checking multiple Sci-Hub URLs
 - Provide setting for trying one at a time or all at once?
- [Planned] Display Visual Indicator for link status on Google Scholar
  - States: Whitelisted, Searching, DOI Not Found, Sci-Hub Article Not Found, Success
  - Hover over indicator should display more info for each state
- [Planned] Settings
 - Whitelist
 - Number of Sci-Hub mirrors to try at once (default: 1)
 - Use Anonymous CrossRef (will increase Rate Limiting)

# How it works

1. When a Google Scholar search results page opens
2. Parse each article link
3. If destination website is in whitelist, skip remaining
4. Lookup DOI on CrossRef using article name. If cached, check cache validation date and use or rerun
5. If found, Lookup Sci-Hub current URL using Wikipedia or https://whereisscihub.now.sh/
6. If found, update href to use Sci-Hub URL

# Useful Links
- https://github.com/CrossRef/rest-api-doc
- https://en.wikipedia.org/wiki/Sci-Hub
- https://whereisscihub.now.sh/
- https://news.ycombinator.com/item?id=22409674
