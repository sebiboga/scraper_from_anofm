const fs = require('fs');
const { execSync } = require('child_process');

const LOG_FILE = '/tmp/scraper_live.log';
const MAX_PARALLEL = 90;
const CHECK_INTERVAL = 5 * 60 * 1000;

function log(msg) {
  const line = `${new Date().toISOString()} - ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function getTotalRunsToday() {
  try {
    const out = execSync('gh run list -a --workflow opencode_scraper_to_solr.yml -L 1000 --json createdAt', {
      cwd: '/home/sebi/opencode-ai/peviitor_scrapers',
      encoding: 'utf8',
      stdio: 'pipe'
    });
    const runs = JSON.parse(out);
    const today = new Date().toISOString().substring(0, 10);
    return runs.filter(r => r.createdAt.startsWith(today)).length;
  } catch (e) {
    log('Error getting runs: ' + e.message);
    return 0;
  }
}

function norm(c) { return c.toLowerCase().replace(/[^a-z0-9]/g, ''); }
const all = require('./companies.json');
const seenNorm = new Set();
const unique = [];
all.forEach(c => { const n = norm(c); if (!seenNorm.has(n)) { seenNorm.add(n); unique.push(c); } });

log('Total unique companies: ' + unique.length);
const totalRuns = getTotalRunsToday();
log('Total runs today: ' + totalRuns);

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
    return out.split('\n').filter(l => l.includes('in_progress')).length;
  } catch { return 0; }
}

async function waitForSlot() {
  let running = getRunningCount();
  while (running >= MAX_PARALLEL) {
    log('Waiting for slot... (' + running + ' running)');
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
    running = getRunningCount();
  }
}

const toScrape = unique.slice(totalRuns);
log('Starting from index: ' + totalRuns + ', Companies remaining: ' + toScrape.length);

(async () => {
  let started = 0;
  for (const c of toScrape) {
    await waitForSlot();
    const running = getRunningCount();
    const msg = `Running: ${running}, Started: ${started + totalRuns}. ${c}`;
    log(msg);
    if (runWorkflow(c)) started++;
    await new Promise(r => setTimeout(r, 3000));
  }
  log('Done: ' + started + ' new companies started');
})();