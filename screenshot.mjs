import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const width = Number(process.argv[4]) || 1440;
const height = Number(process.argv[5]) || 900;

const dir = join(process.cwd(), 'temporary screenshots');
await mkdir(dir, { recursive: true });
const nums = (await readdir(dir))
  .map((f) => Number(/^screenshot-(\d+)/.exec(f)?.[1]))
  .filter((n) => Number.isFinite(n));
const next = (nums.length ? Math.max(...nums) : 0) + 1;
const name = `screenshot-${next}${label ? `-${label}` : ''}.png`;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(async () => {
  document.documentElement.style.scrollBehavior = 'auto';
  const step = Math.round(window.innerHeight * 0.7);
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 130));
  }
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise((r) => setTimeout(r, 400));
  window.scrollTo(0, 0);
  document.querySelectorAll('.rv').forEach((el) => el.classList.add('is-in'));
  await new Promise((r) => setTimeout(r, 500));
});
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: join(dir, name), fullPage: true });
await browser.close();
console.log(`saved temporary screenshots/${name}`);
