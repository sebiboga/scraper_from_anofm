const { execSync } = require('child_process');

const MAX_PARALLEL = 90;
const CHECK_INTERVAL = 5 * 60 * 1000;

function getTotalRuns() {
  try {
    const out = execSync('gh api "repos/peviitor-ro/peviitor_opencode_AI_scrapers/actions/runs?per_page=1" -q ".total_count"', {
      cwd: '/home/sebi/opencode-ai/scraper_from_anofm'
    });
    const count = parseInt(out.trim(), 10);
    console.log(`Found ${count} total runs`);
    return count;
  } catch (e) {
    console.log('Error getting runs:', e.message);
    return 0;
  }
}

function getTodayRuns() {
  try {
    const out = execSync('gh api "repos/peviitor-ro/peviitor_opencode_AI_scrapers/actions/runs?per_page=100" --paginate -q "[.workflow_runs[] | select(.created_at >= \\"2026-04-11T20:00:00Z\\")] | length"', {
      cwd: '/home/sebi/opencode-ai/scraper_from_anofm',
      encoding: 'utf8'
    });
    return parseInt(out.trim(), 10);
  } catch (e) {
    return 0;
  }
}

const fs = require('fs');

function getScrapedToday() {
  try {
    return JSON.parse(fs.readFileSync('scraped_today.json', 'utf8'));
  } catch { return []; }
}

function getLastIndex() {
  const scraped = getScrapedToday();
  return scraped.length;
}

function norm(c) { return c.toLowerCase().replace(/[^a-z0-9]/g, ''); }

const all = require('./companies.json');

const seenNorm = new Set();
const unique = [];
all.forEach(c => {
  const n = norm(c);
  if (seenNorm.has(n)) return;
  seenNorm.add(n);
  unique.push(c);
});

console.log('Total unique companies:', unique.length);

const lastIndex = getLastIndex();
console.log('Already scraped today:', lastIndex);
console.log('Starting from index:', lastIndex);
console.log('Companies remaining:', unique.length - lastIndex);

function runWorkflow(company) {
  try {
    execSync(`gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company='${company}'`, {
      cwd: '/home/sebi/opencode-ai/peviitor_scrapers',
      stdio: 'pipe'
    });
    return true;
  } catch { return false; }
}

function getRunningCount() {
  try {
    const out = execSync('gh run list --status in_progress --workflow opencode_scraper_to_solr.yml -L 100', {
      cwd: '/home/sebi/opencode-ai/peviitor_scrapers',
      encoding: 'utf8',
      stdio: 'pipe'
    });
    const lines = out.split('\n').filter(l => l.includes('in_progress'));
    return lines.length;
  } catch { return 0; }
}

async function waitForSlot() {
  let running = getRunningCount();
  while (running >= MAX_PARALLEL) {
    console.log(`Waiting for slot... (${running} running)`);
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
    running = getRunningCount();
  }
}

const toScrape = unique.slice(lastIndex);
let scraped = getScrapedToday();

(async () => {
  let started = 0;
  for (const c of toScrape) {
    await waitForSlot();
    const running = getRunningCount();
    console.log(`Running: ${running}, Started: ${started + lastIndex}. ${c}`);
    if (runWorkflow(c)) {
      scraped.push(c);
      fs.writeFileSync('scraped_today.json', JSON.stringify(scraped, null, 2));
      started++;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log(`Done: ${started} new companies started`);
})();