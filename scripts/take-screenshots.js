const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  const assetsDir = path.join(__dirname, '..', 'docs', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  const baseUrl = 'http://localhost:3005';

  console.log('Navigating to login...');
  await page.goto(`${baseUrl}/auth/signin`, { waitUntil: 'networkidle0' });

  console.log('Logging in...');
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.type('input[name="email"]', 'admin@hospital.com');
  await page.type('input[name="password"]', 'Admin123');
  await page.click('button[type="submit"]');

  console.log('Waiting for dashboard...');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  // Add a slight delay for charts to render
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Capturing Dashboard...');
  await page.screenshot({ path: path.join(assetsDir, 'dashboard.png') });

  console.log('Capturing OPD Queue...');
  await page.goto(`${baseUrl}/dashboard/clinical/opd`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(assetsDir, 'opd_queue.png') });

  console.log('Capturing Pharmacy POS...');
  await page.goto(`${baseUrl}/dashboard/pharmacy/pos`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(assetsDir, 'pharmacy_pos.png') });

  console.log('Capturing Lab Reports...');
  await page.goto(`${baseUrl}/dashboard/lab/reports`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(assetsDir, 'lab_report.png') });

  console.log('Capturing Finance Billing...');
  await page.goto(`${baseUrl}/dashboard/finance/billing`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(assetsDir, 'invoice.png') });
  
  // Try to capture a specific bill if possible, or just the billing list
  // Wait for a row to appear, click it to open the invoice modal/page
  try {
    const firstRow = await page.$('tbody tr');
    if (firstRow) {
      await firstRow.click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(assetsDir, 'invoice_detail.png') });
    }
  } catch(e) {
    console.log('Could not open specific invoice, skipping detail.');
  }

  console.log('Done capturing screenshots!');
  await browser.close();
}

run().catch(console.error);
