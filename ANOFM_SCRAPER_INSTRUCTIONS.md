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

1. **Get companies from Solr** (job core, facet by company)
   - Query: `url:*anofm*` returns all jobs with ANOFM URLs
   - Use facet to get unique company names

2. **Get companies scraped today**
   - companies_scraped_today.json contains entries for tracking
   - Or use GitHub API to count today's runs

3. **Filter remaining companies**
   - companies.json has all companies
   - Filter out already scraped (normalized matching)
   - Remaining = total - scraped

4. **Start workflows** (max ~20 parallel)
   ```bash
   node scrape_remaining.js
   ```

5. **Cleanup completed runs**
   - Delete old completed runs to keep GitHub Actions fast
   ```bash
   gh api ".../actions/runs?per_page=100" -q '[.workflow_runs[] | select(.status == "completed")] | .[] | .id' | while read id; do gh api -X DELETE ".../actions/runs/$id"; done
   ```

6. **New Day = New Session**
   - Delete scraped_today.json (or create new)
   - Re-extract companies from Solr (may have new jobs)
   - Start from index 0

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