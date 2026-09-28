import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const outputDir = 'C:\\Users\\pc\\.gemini\\antigravity-ide\\brain\\bc8b979b-56a5-479f-87cb-34a6f4880c09'
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    await page.setCookie({
      name: 'demo_auth',
      value: 'true',
      domain: 'localhost',
      path: '/'
    })

    // Capture loaded New Sale
    console.log('Navigating to New Sale...')
    await page.goto('http://localhost:3000/sales/invoices/new', { waitUntil: 'load', timeout: 30000 })
    // Wait for form to load master data
    await page.waitForSelector('form', { timeout: 15000 }).catch(() => {})
    await new Promise((res) => setTimeout(res, 5000))
    await page.screenshot({ path: path.join(outputDir, '10_new_sale_ready.png'), fullPage: false })
    console.log('Saved 10_new_sale_ready.png')

    // Capture Add Product screen
    console.log('Navigating to Add Product...')
    await page.goto('http://localhost:3000/products/new', { waitUntil: 'load', timeout: 30000 })
    await new Promise((res) => setTimeout(res, 4000))
    await page.screenshot({ path: path.join(outputDir, '11_product_form.png'), fullPage: false })
    console.log('Saved 11_product_form.png')

  } finally {
    await browser.close()
    console.log('Done.')
  }
}

run().catch(console.error)
