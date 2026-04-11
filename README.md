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

## Quick Start

```bash
# Run workflow for a company
gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company="COMPANY_NAME"

# Or use the script to automate
node scrape_remaining.js
```

## Files

- `companies.json` - ~7005 companies with ANOFM jobs
- `companies_scraped_today.json` - Companies scraped today
- `scrape_remaining.js` - Queue management script

## Workflow

Uses: `peviitor-ro/peviitor_opencode_AI_scrapers/.github/workflows/opencode_scraper_to_solr.yml`

## License

MIT