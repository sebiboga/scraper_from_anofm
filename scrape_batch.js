const { execSync } = require('child_process');
const fs = require('fs');

const MAX_PARALLEL = 90;
const CHECK_INTERVAL = 5 * 60 * 1000;

const IS_GITHUB = process.env.GITHUB_ACTIONS === 'true';
const BASE_DIR = IS_GITHUB ? process.env.GITHUB_WORKSPACE : __dirname;

function getRunningCount() {
  try {
    const out = execSync('gh run list --status in_progress --workflow opencode_scraper_to_solr.yml -L 100 --repo peviitor-ro/peviitor_opencode_AI_scrapers', {
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

function norm(c) { return c.toLowerCase().replace(/[^a-z0-9]/g, ''); }

const all = require(BASE_DIR + '/companies.json');
const seenNorm = new Set();
const unique = [];
all.forEach(c => {
  const n = norm(c);
  if (seenNorm.has(n)) return;
  seenNorm.add(n);
  unique.push(c);
});

const batchSize = parseInt(process.env.BATCH_SIZE || '20');
let scraped = [];
try { scraped = JSON.parse(fs.readFileSync(BASE_DIR + '/scraped_today.json', 'utf8')); } catch { scraped = []; }
const lastIndex = scraped.length;
const toScrape = unique.slice(lastIndex, lastIndex + batchSize);

console.log(`Total: ${unique.length}, Scraped: ${lastIndex}, Batch: ${batchSize}`);

(async () => {
  let started = 0;
  for (const company of toScrape) {
    await waitForSlot();
    const running = getRunningCount();
    console.log(`Running: ${running}, Starting: ${lastIndex + started}. ${company}`);
    try {
      execSync(`gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company='${company}' --repo peviitor-ro/peviitor_opencode_AI_scrapers`, {
        stdio: 'pipe'
      });
      scraped.push(company);
      fs.writeFileSync(BASE_DIR + '/scraped_today.json', JSON.stringify(scraped, null, 2));
      started++;
    } catch (e) {
      console.log('Error:', e.message);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log(`Started: ${started} companies`);
})();