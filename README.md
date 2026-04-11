# ANOFM Daily Company Scraper

This repo triggers the GitHub Actions workflow located in:
**`peviitor-ro/peviitor_opencode_AI_scrapers/.github/workflows/opencode_scraper_to_solr.yml`**

Automation project for scraping all companies with ANOFM (Romanian National Employment Agency) jobs from Solr using GitHub Actions.

## About

This project automates daily scraping of companies that have ANOFM jobs. The companies were extracted from Solr job core by querying for jobs where the URL contains "ANOFM".

## How Companies Were Extracted

Query the Solr job core:
```
q=url:*anofm*
```

Then use facet to get unique company names:
```
/solr/job/select?q=url:*anofm*&facet=true&facet.field=company
```

## Current Status

- **Total companies**: 7005
- **Unique companies**: 6918 (after removing ~118 duplicates)
- **Workflow runs**: ~970
- **Remaining**: ~5948

**Important**: Do NOT commit `companies_scraped_today.json` - regenerate it each session.

## Quick Start

```bash
# Clone the workflow repo
gh repo clone peviitor-ro/peviitor_opencode_AI_scrapers peviitor_scrapers

# Run workflow for a company
cd peviitor_scrapers
gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company="COMPANY_NAME"

# Or use the script to automate
cd ..
node scraper_from_anofm/scrape_remaining.js
```

## Files

- `companies.json` - 7005 companies with ANOFM jobs (~118 duplicates)
- `scrape_remaining.js` - Queue management script

## License

MIT