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

function getPeviitorRecentCompanies() {
  try {
    const out = execSync('gh run list -L 20 --repo peviitor-ro/peviitor_opencode_AI_scrapers', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    const companies = [];
    const lines = out.split('\n');
    for (const line of lines) {
      const match = line.match(/company=(\S+)/);
      if (match) companies.push(match[1].replace(/%20/g, ' ').replace(/\\/g, ''));
    }
    return companies;
  } catch { return []; }
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
try {
  const latest = execSync(`gh api repos/sebiboga/scraper_from_anofm/contents/scraped_today.json -q .content`, { encoding: 'utf8' }).trim();
  scraped = JSON.parse(Buffer.from(latest, 'base64').toString('utf8'));
  fs.writeFileSync(BASE_DIR + '/scraped_today.json', JSON.stringify(scraped, null, 2));
} catch { scraped = []; }

const peviitorRecent = getPeviitorRecentCompanies();
const peviitorRecentSet = new Set(peviitorRecent.map(s => norm(s)));

const scrapedSet = new Set(scraped.map(s => norm(s)));
const toScrape = unique.filter(c => {
  if (scrapedSet.has(norm(c))) return false;
  if (peviitorRecentSet.has(norm(c))) return false;
  return true;
}).slice(0, batchSize);

console.log(`Total: ${unique.length}, Scraped: ${scraped.length}, Peviitor Recent: ${peviitorRecent.length}, To Scrape: ${toScrape.length}`);

(async () => {
  let started = 0;
  for (const company of toScrape) {
    await waitForSlot();
    const running = getRunningCount();
    console.log(`Running: ${running}, Starting: ${scraped.length + started}. ${company}`);
    try {
      execSync(`gh workflow run .github/workflows/opencode_scraper_to_solr.yml -f company="${company.replace(/"/g, '\\"')}" --repo peviitor-ro/peviitor_opencode_AI_scrapers`, {
        stdio: 'pipe'
      });
      scraped.push(company);
      fs.writeFileSync(BASE_DIR + '/scraped_today.json', JSON.stringify(scraped, null, 2));
      started++;
      
      if (started % 10 === 0) {
        console.log(`Pushing progress (${started} companies)...`);
        const content = Buffer.from(JSON.stringify(scraped)).toString('base64');
        const sha = execSync(`gh api repos/sebiboga/scraper_from_anofm/contents/scraped_today.json -q .sha`, { encoding: 'utf8' }).trim();
        execSync(`gh api -X PUT repos/sebiboga/scraper_from_anofm/contents/scraped_today.json -f message="Push ${started} companies" -f content="${content}" -fsha="${sha}"`, { stdio: 'pipe' });
        
        console.log(`Pulling latest progress...`);
        const latest = execSync(`gh api repos/sebiboga/scraper_from_anofm/contents/scraped_today.json -q .content`, { encoding: 'utf8' }).trim();
        scraped = JSON.parse(Buffer.from(latest, 'base64').toString('utf8'));
        fs.writeFileSync(BASE_DIR + '/scraped_today.json', JSON.stringify(scraped, null, 2));
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log(`Started: ${started} companies`);
})();

async function waitForSlot() {
  let running = getRunningCount();
  while (running >= MAX_PARALLEL) {
    console.log(`Waiting for slot... (${running} running)`);
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
    running = getRunningCount();
  }
}