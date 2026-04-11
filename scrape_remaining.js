const { execSync } = require('child_process');

const MAX_PARALLEL = 90;
const CHECK_INTERVAL = 5 * 60 * 1000;

function getTotalRuns() {
  try {
    const out = execSync('gh api "repos/peviitor-ro/peviitor_opencode_AI_scrapers/actions/workflows/opencode_scraper_to_solr.yml/runs?per_page=1" -q ".total_count"');
    const count = parseInt(out.trim(), 10);
    console.log(`Found ${count} total runs`);
    return count;
  } catch (e) {
    console.log('Error getting runs:', e.message);
    return 0;
  }
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

const totalRuns = getTotalRuns();
console.log('Total runs:', totalRuns);
console.log('Starting from index:', totalRuns);
console.log('Companies remaining:', unique.length - totalRuns);

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

const toScrape = unique.slice(totalRuns);

(async () => {
  let started = 0;
  for (const c of toScrape) {
    await waitForSlot();
    const running = getRunningCount();
    console.log(`Running: ${running}, Started: ${started + totalRuns}. ${c}`);
    if (runWorkflow(c)) {
      started++;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log(`Done: ${started} new companies started`);
})();