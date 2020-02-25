# Sci-Hub Scholar

Firefox Extension to automatically modify Google Scholar links to point to Sci-Hub.

Features

- [Planned] Whitelist for allowing links to certain website

# How it works

1. When a Google Scholar search results page opens
2. Parse each article link
3. If destination website is in whitelist, skip
4. Lookup DOI on CrossRef using article name
5. If found, Lookup Sci-Hub current URL using Wikipedia or https://whereisscihub.now.sh/
6. If found, update href to use Sci-Hub URL
