const { execSync } = require('child_process');

const WORKDIR = 'C:/sebi/opencode_ai/peviitor_opencode_AI_scrapers';
const MAX_PARALLEL = 90;
const CHECK_INTERVAL = 5 * 60 * 1000;
const START_INDEX = 703;

function norm(c) { return c.toLowerCase().replace(/[^a-z0-9]/g, ''); }

const raw = require('./companies_scraped_today.json');
const scrapedRaw = [...new Set(raw.map(s => s.replace(/\x1b\[[0-9;]*m/g, '').trim()).filter(s => s))];
const scrapedNorm = new Set(scrapedRaw.map(norm));

const all = require('./companies.json');

const remaining = [];
const seenNorm = new Set();

all.forEach(c => {
  const n = norm(c);
  if (scrapedNorm.has(n)) return;
  if (seenNorm.has(n)) return;
  seenNorm.add(n);
  remaining.push(c);
});

console.log('Remaining after dedup:', remaining.length);
console.log('Starting from index:', START_INDEX);

function runWorkflow(company) {
  try {
    execSync(`gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company='${company}'`, {
      cwd: WORKDIR,
      stdio: 'pipe'
    });
    return true;
  } catch { return false; }
}

function getRunningCount() {
  try {
    const out = execSync('gh run list --status in_progress --workflow opencode_scraper_to_solr.yml -L 100', {
      cwd: WORKDIR,
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

const toScrape = remaining.slice(START_INDEX);

(async () => {
  let started = 0;
  for (const c of toScrape) {
    await waitForSlot();
    const running = getRunningCount();
    console.log(`Running: ${running}, Started: ${started + START_INDEX}. ${c}`);
    if (runWorkflow(c)) {
      started++;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log(`Done: ${started} new companies started`);
})();