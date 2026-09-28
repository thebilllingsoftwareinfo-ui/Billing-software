import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const outputDir = 'C:\\Users\\pc\\.gemini\\antigravity-ide\\brain\\bc8b979b-56a5-479f-87cb-34a6f4880c09'

const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\Edge\\Application\\msedge.exe'

async function run() {
  console.log(`Launching browser using binary: ${chromePath}...`)
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900'
    ]
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // Set demo_auth cookie so middleware allows full access to all protected routes
    await page.setCookie({
      name: 'demo_auth',
      value: 'true',
      domain: 'localhost',
      path: '/'
    })

    const routes = [
      { name: '01_dashboard.png', url: 'http://localhost:3000/dashboard', width: 1440, height: 900 },
      { name: '02_new_sale_desktop.png', url: 'http://localhost:3000/sales/invoices/new', width: 1440, height: 900 },
      { name: '03_new_purchase.png', url: 'http://localhost:3000/purchases/bills/new', width: 1440, height: 900 },
      { name: '04_parties.png', url: 'http://localhost:3000/parties', width: 1440, height: 900 },
      { name: '05_inventory.png', url: 'http://localhost:3000/inventory', width: 1440, height: 900 },
      { name: '06_reports.png', url: 'http://localhost:3000/reports', width: 1440, height: 900 },
      { name: '07_settings.png', url: 'http://localhost:3000/settings', width: 1440, height: 900 },
      { name: '08_mobile_dashboard.png', url: 'http://localhost:3000/dashboard', width: 390, height: 844 },
      { name: '09_mobile_new_sale.png', url: 'http://localhost:3000/sales/invoices/new', width: 390, height: 844 }
    ]

    for (const r of routes) {
      console.log(`Navigating to ${r.url} (${r.width}x${r.height})...`)
      await page.setViewport({ width: r.width, height: r.height })
      try {
        await page.goto(r.url, { waitUntil: 'load', timeout: 30000 })
        // Wait 2.5 seconds for client-side data fetching and rendering
        await new Promise((res) => setTimeout(res, 2500))
        const filePath = path.join(outputDir, r.name)
        await page.screenshot({ path: filePath, fullPage: false })
        console.log(`Saved screenshot: ${r.name}`)
      } catch (err) {
        console.error(`Error capturing ${r.name}:`, err.message)
      }
    }

  } finally {
    await browser.close()
    console.log('Browser closed cleanly.')
  }
}

run().catch(console.error)
