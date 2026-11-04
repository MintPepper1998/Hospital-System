const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const APP_URL = 'http://localhost:3005'; // Assuming dev server runs on 3005
const ASSETS_DIR = path.join(__dirname, '..', 'docs', 'assets');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const JOBS = [
  {
    role: 'Admin',
    email: 'admin@hospital.com',
    password: 'Admin123',
    screenshots: [
      { name: 'admin-dashboard', path: '/dashboard' },
      { name: 'admin-hr-staff', path: '/dashboard/hr/staff' },
      { name: 'admin-settings', path: '/dashboard/settings/hospital' },
      { name: 'admin-ipd', path: '/dashboard/ipd' },
    ]
  },
  {
    role: 'Doctor',
    email: 'doctor1@hospital.com',
    password: 'doctor123',
    screenshots: [
      { name: 'doctor-dashboard', path: '/dashboard' },
      { name: 'doctor-opd-queue', path: '/dashboard/clinical/opd' },
      { name: 'doctor-ipd-patients', path: '/dashboard/clinical/ipd' },
    ]
  },
  {
    role: 'Pharmacist',
    email: 'phr1@hospital.com',
    password: 'staff123',
    screenshots: [
      { name: 'pharmacy-dashboard', path: '/dashboard' },
      { name: 'pharmacy-pos', path: '/dashboard/pharmacy/pos' },
      { name: 'pharmacy-inventory', path: '/dashboard/pharmacy/inventory' },
      { name: 'pharmacy-queue', path: '/dashboard/pharmacy/queue' },
    ]
  },
  {
    role: 'Lab Technician',
    email: 'lab1@hospital.com',
    password: 'staff123',
    screenshots: [
      { name: 'lab-dashboard', path: '/dashboard' },
      { name: 'lab-queue', path: '/dashboard/lab/queue' },
      { name: 'lab-reports', path: '/dashboard/lab/reports' },
    ]
  },
  {
    role: 'Accountant',
    email: 'acc1@hospital.com',
    password: 'staff123',
    screenshots: [
      { name: 'finance-dashboard', path: '/dashboard' },
      { name: 'finance-billing', path: '/dashboard/finance/billing' },
      { name: 'finance-gst', path: '/dashboard/finance/gst' },
      { name: 'finance-reports', path: '/dashboard/reports/hospital-pnl' },
    ]
  },
  {
    role: 'Receptionist',
    email: 'rec1@hospital.com',
    password: 'staff123',
    screenshots: [
      { name: 'reception-dashboard', path: '/dashboard' },
      { name: 'reception-appointments', path: '/dashboard/clinical/opd/register' }, // Assuming registration handles appointments
    ]
  }
];

async function run() {
  console.log('🚀 Starting Comprehensive Screenshot Capture...');
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const page = await browser.newPage();

  for (const job of JOBS) {
    console.log(`\n========================================`);
    console.log(`👤 Logging in as ${job.role} (${job.email})`);
    
    // Clear cookies/session to ensure clean login
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    try {
      await page.goto(`${APP_URL}/auth/signin`, { waitUntil: 'networkidle0' });
      
      // Fill login form
      await page.waitForSelector('input[name="email"]');
      await page.type('input[name="email"]', job.email);
      await page.type('input[name="password"]', job.password);
      
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 4000));
      
      console.log(`✅ Logged in as ${job.role}. Capturing screens...`);

      for (const shot of job.screenshots) {
        console.log(`  📸 Capturing: ${shot.name} (${shot.path})`);
        try {
          await page.goto(`${APP_URL}${shot.path}`, { waitUntil: 'domcontentloaded' });
          // Optional wait for charts/data
          await new Promise(r => setTimeout(r, 1500)); 
          
          await page.screenshot({
            path: path.join(ASSETS_DIR, `${shot.name}.png`),
            fullPage: false // Captures what is visible in viewport
          });
          console.log(`    -> Saved ${shot.name}.png`);
        } catch (err) {
          console.error(`    ❌ Failed to capture ${shot.name}:`, err.message);
        }
      }
      
    } catch (err) {
      console.error(`❌ Failed to login or process ${job.role}:`, err.message);
    }
  }

  await browser.close();
  console.log('\n🎉 Comprehensive capture complete!');
}

run().catch(console.error);
