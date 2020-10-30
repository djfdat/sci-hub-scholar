# Sci-Hub Scholar

Firefox Extension to automatically modify Google Scholar links to point to Sci-Hub.

Features

- Caching of CrossRef results (Good Citizen)
- Grabs up-to-date URLs for Sci-Hub automatically

# How it works

1. When a Google Scholar search results page opens.
2. Parse each article link.
3. Check cache. If listed, use the saved data and skip step 5.
4. Lookup DOI on CrossRef using article name.
5. If found, lookup Sci-Hub current URL using Wikipedia or https://sci-hub.now.sh/
6. If found, update href to use Sci-Hub URL

# Useful Links
- https://github.com/CrossRef/rest-api-doc
- https://en.wikipedia.org/wiki/Sci-Hub
- https://news.ycombinator.com/item?id=22409674
- https://sci-hub.now.sh/
