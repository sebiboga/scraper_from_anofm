---
description: Porneste procesul de scraping pentru firmele cu job-uri ANOFM - porneste rapid oricand
agent: build
---

# /firme-din-anofm

## Quick Start (pentru a porni rapid)

```
cd scraper_from_anofm
node scrape_remaining.js
```

Sau urmeaza toti pasii de mai jos...

---

## Pas 1: Verifica de unde sa continuI

Din `scraped_today.json`:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('scraped_today.json', 'utf8')).length)"
```

Aceasta iti da index-ul de la care trebuie sa continuI.

---

## Pas 2: Porneste batch + curata (ciclare)

Repeta de 3-4 ori:

### Trimite ~27 companii:
```bash
node scrape_remaining.js
```

### Commit progres:
```bash
git add scraped_today.json && git commit -m "Track X companies" && git push
```

### Curata completed runs (1 pagina):
```bash
gh api "repos/peviitor-ro/peviitor_opencode_AI_scrapers/actions/runs?per_page=100" -q '[.workflow_runs[] | select(.status == "completed")] | .[] | .id' | head -50 | while read id; do gh api -X DELETE "repos/peviitor-ro/peviitor_opencode_AI_scrapers/actions/runs/$id"; done
```

Repeat!

---

## Documentatie completa

Pentru detalii complete, vezi:
- `ANOFM_SCRAPER_INSTRUCTIONS.md` - instructiuni detaliate
- `docs/index.html` - documentatie vizuala (GitHub Pages)

---

## Daca e o zi noua (incepe de la 0)

1. **Sterge** `scraped_today.json` (creeaza fisier nou gol):
```bash
echo "[]" > scraped_today.json
```

2. **Reextrage** companiile din Solr (pot fi job-uri noi):
```bash
curl -s -u solr:SolrRocks "https://solr.peviitor.ro/solr/job/select?q=url:*anofm*&rows=0&facet=true&facet.field=company&facet.limit=10000"
```

3. **Commit** companies.json proaspat

4. **Incepe** de la index 0:
```bash
node scrape_remaining.js
```

---

## Info

- Total companii: 5171
- Rulam in `scraper_from_anofm/`
- Workflow: `.github/workflows/opencode_scraper_to_solr.yml` din `peviitor-ro/peviitor_opencode_AI_scrapers`
- Max ~20 parallel workflows (limita GitHub)