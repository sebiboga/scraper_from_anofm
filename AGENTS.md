# AGENTS.md - ANOFM Daily Scraper

## Project Context

This project automates daily scraping of companies with ANOFM (Romanian National Employment Agency) jobs from Solr using GitHub Actions.

## Workflow Location

The GitHub Actions workflow is in: `peviitor-ro/peviitor_opencode_AI_scrapers/.github/workflows/opencode_scraper_to_solr.yml`

## Running the Scraper

### Manual

```bash
gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company="COMPANY_NAME"
```

### Via Script

Use `scrape_remaining.js` to automate multiple companies:

```bash
node scrape_remaining.js
```

## Important Rules

1. **Maximum 90 parallel workflows** - Check with:
   ```bash
   gh run list --status in_progress --workflow opencode_scraper_to_solr.yml -L 100
   ```

2. **Avoid Duplicates** - The input file contains internal duplicates:
   - "AL PROMT" vs "AL PROMT SRL"
   - "ALBERT DISTRIBUTION & LOGISTIC" vs "ALBERT DISTRIBUTION LOGISTICS"
   
   Use normalized comparison:
   ```javascript
   function norm(c) { return c.toLowerCase().replace(/[^a-z0-9]/g, ''); }
   ```

3. **Filter Already Scraped** - Extract companies scraped TODAY from GitHub Actions logs

4. **Queue Management** - Script automatically manages parallel count with CHECK_INTERVAL = 5 minutes

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

- `companies.json` - Original company list (~7005 entries with ~118 internal duplicates)
- `companies_scraped_today.json` - Companies scraped today (from GitHub Actions logs)
- `scrape_remaining.js` - Queue management script