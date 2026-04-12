# AGENTS.md - ANOFM Daily Scraper

## Project Context

This repo manages a queue of ~5171 companies and triggers GitHub Actions workflows in a **separate repository** to perform the actual scraping.

## Architecture

```
scraper_from_anofm/ (this repo)
    └── Triggers: peviitor-ro/peviitor_opencode_AI_scrapers/.github/workflows/opencode_scraper_to_solr.yml
                                                                                    ↓
                    Uses OpenCode with Chrome DevTools MCP to:
                    1. Scrape company careers page for jobs
                    2. Search ANAF API for CIF (company ID)
                    3. Add/update company in Solr company core
                    4. Push jobs to Solr job core
```

## Session Rules

**DO NOT commit any generated files to GitHub!**

At the start of each session, simply run the script - it reads from `scraped_today.json` to know where to continue:

```bash
node scrape_remaining.js
```

## Current Status

- **Total unique companies**: 5171
- **Already scraped**: Check with `node -e "console.log(JSON.parse(require('fs').readFileSync('scraped_today.json', 'utf8')).length)"`

## Running the Scraper

Just run:

```bash
node scrape_remaining.js
```

The script:
1. Reads already scraped companies from `scraped_today.json`
2. Starts from where it left off
3. Limits to ~20 parallel workflows
4. Saves progress incrementally

## Important Rules

1. **Maximum 20 parallel workflows** - Script automatically manages this
2. **Track progress in scraped_today.json** - This file tracks what was scraped today

## Solr Credentials

- URL: `https://solr.peviitor.ro`
- User: `solr`
- Password: `SolrRocks`

## Key Queries

```javascript
// Get all ANOFM jobs
const q = encodeURIComponent('url:*anofm*');

// Use facet to get unique companies
path: '/solr/job/select?q=' + q + '&rows=0&facet=true&facet.field=company'
```

## Files

- `companies.json` - Original company list (5171 entries)
- `scrape_remaining.js` - Queue management script
- `scraped_today.json` - Tracks progress (DO NOT COMMIT)