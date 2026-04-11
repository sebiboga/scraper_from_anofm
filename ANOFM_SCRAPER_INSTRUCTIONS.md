# ANOFM Daily Company Scraper

## Overview

This project automates daily scraping of all companies with ANOFM (Romanian National Employment Agency) jobs from Solr using GitHub Actions.

## How Companies Were Extracted from Solr

The `companies.json` file was created by querying the **job core** for all jobs where the URL contains "ANOFM" (e.g., mediere.anofm.ro):

```javascript
// Query job core for ANOFM jobs, then get unique companies via facets
const auth = Buffer.from('solr:SolrRocks').toString('base64');
const q = encodeURIComponent('company:*anofm* OR url:*anofm*');
// Facet query returns unique company names sorted by count
const opts = {
  hostname: 'solr.peviitor.ro',
  path: '/solr/job/select?q=' + q + '&rows=0&facet=true&facet.field=company&facet.limit=10000',
  headers: { 'Authorization': 'Basic ' + auth }
};
```

**Results:**
- 7,853 jobs with ANOFM (`url:*anofm*`)
- ~70 unique companies with ANOFM jobs

**Key findings:**
- Query format: `q=company:*anofm* OR url:*anofm*`
- Use facet to get unique company names from job core
- Job core fields: url, title, company, location, date, status

## Problem

- ~70 companies in Solr have ANOFM jobs
- Need to scrape them daily without duplicates
- Company core uses `id` as unique identifier
- Job core uses `url` as unique key for atomic updates

## Quick Start

```bash
# Connect to Solr
# URL: https://solr.peviitor.ro
# Credentials: solr:SolRocks

# Run workflow for a company
gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company="COMPANY_NAME"
```

## Process

1. **Get companies scraped today** from GitHub Actions logs
   - companies_scraped_today.json contains entries with duplicates
   - Must deduplicate (37 unique from ~70 entries)
   - NOTE: These companies will be scraped again tomorrow (new day = fresh logs)

2. **Filter remaining companies**
   - companies.json has ~7005 companies
   - Filter out already scraped (normalized matching)
   - Remaining: ~6887 unique

3. **Start workflows** (max 90 parallel)
   ```bash
   node scrape_remaining.js
   ```

4. **Monitor**
   ```bash
   gh run list --status in_progress --workflow opencode_scraper_to_solr.yml -L 100
   ```

## Duplicate Prevention

The input file contains internal duplicates:
- "AL PROMT" vs "AL PROMT SRL"
- "ALBERT DISTRIBUTION & LOGISTIC" vs "ALBERT DISTRIBUTION LOGISTICS"

Use normalized comparison:
```javascript
function norm(c) { return c.toLowerCase().replace(/[^a-z0-9]/g, ''); }
```

## Files

- `companies.json` - Original company list (~7005)
- `companies_scraped_today.json` - Companies scraped today
- `scrape_remaining.js` - Queue management script