# AGENTS.md - ANOFM Daily Scraper

## Project Context

This repo manages a queue of ~7000 companies and triggers GitHub Actions workflows in a **separate repository** to perform the actual scraping.

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

## Important Notes

1. **DO NOT commit companies_scraped_today.json** - This file should be regenerated each session, not stored in the repo.

2. **Track progress by workflow run count** - Query the workflow runs to determine how many companies have been scraped:
   ```bash
   cd peviitor_scrapers
   gh api "repos/peviitor-ro/peviitor_opencode_AI_scrapers/actions/workflows/opencode_scraper_to_solr.yml/runs?per_page=1" -q '.total_count'
   ```

3. **Avoid Duplicates** - The input file contains internal duplicates (~118):
   - "AL PROMT" vs "AL PROMT SRL"
   - "ALBERT DISTRIBUTION & LOGISTIC" vs "ALBERT DISTRIBUTION LOGISTICS"
   
   The script uses normalized comparison:
   ```javascript
   function norm(c) { return c.toLowerCase().replace(/[^a-z0-9]/g, ''); }
   ```

## Current Status

- **Total companies in list**: 7005
- **Unique companies (after dedup)**: 6918
- **Total workflow runs**: ~970
- **Remaining to scrape**: ~5948

## Running the Scraper

### Manual

```bash
cd peviitor_scrapers
gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company="COMPANY_NAME"
```

### Via Script

```bash
node scrape_remaining.js
```

The script calculates remaining companies based on workflow run count, not from a file.

## Important Rules

1. **Maximum 90 parallel workflows** - Check with:
   ```bash
   cd peviitor_scrapers
   gh run list --status in_progress --workflow opencode_scraper_to_solr.yml -L 100
   ```

2. **Queue Management** - Script automatically manages parallel count with CHECK_INTERVAL = 5 minutes

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

- `companies.json` - Original company list (7005 entries with ~118 internal duplicates)
- `scrape_remaining.js` - Queue management script (calculates remaining from workflow run count)