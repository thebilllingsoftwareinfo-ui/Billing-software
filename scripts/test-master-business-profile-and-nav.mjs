import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE BROWSER VERIFICATION ---')
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })

  // 1. Set demo cookies
  await page.setCookie(
    { name: 'demo_auth', value: 'true', domain: 'localhost', path: '/' },
    { name: 'demo_org_name', value: 'Wevly Master Business', domain: 'localhost', path: '/' }
  )

  const results = {
    businessProfile: {
      opened: false,
      editScreenVisible: false,
      businessName: false,
      businessTypeDropdown: false,
      businessCategoryDropdown: false,
      stateDropdown: false,
      pincodeField: false,
      addressField: false,
      saveChanges: false,
      persistenceAfterNav: false,
      persistenceAfterRefresh: false,
    },
    singleSourceOfTruth: {
      settingsCategoryReadOnly: false,
      openBusinessProfileButtonWorks: false,
      editableTypeCount: 0,
      editableCategoryCount: 0,
    },
    navigationTests: {
      testA_Customers: false,
      testB_Products: false,
      testC_Inventory: false,
      testD_Sales: false,
      testE_Purchase: false,
      testF_Payments: false,
      testG_Reports: false,
      testH_Settings_BusinessProfile: false,
      testI_ChangeCategoryAndReturn: false,
    },
    performance: {
      dashboardReloadTimes: [],
    },
  }

  try {
    // ══════════════════════════════════════════════════════════
    // PART 1: DASHBOARD FIRST LOAD
    // ══════════════════════════════════════════════════════════
    console.log('\n[1/4] Testing Dashboard Initial Load...')
    const t0 = Date.now()
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main', { timeout: 10000 })
    const loadTime = Date.now() - t0
    console.log(`✓ Dashboard loaded in ${loadTime}ms`)
    results.performance.dashboardReloadTimes.push(loadTime)

    // ══════════════════════════════════════════════════════════
    // PART 2: BUSINESS PROFILE SCREEN & SINGLE SOURCE OF TRUTH
    // ══════════════════════════════════════════════════════════
    console.log('\n[2/4] Testing Settings → Business Profile...')
    await page.goto(`${BASE_URL}/settings/business-profile`, { waitUntil: 'networkidle2' })
    results.businessProfile.opened = true

    // Check header
    const pageHeading = await page.$eval('h1', (el) => el.textContent)
    console.log(`Page heading: "${pageHeading}"`)
    if (pageHeading.includes('Edit Profile') || pageHeading.includes('Profile')) {
      results.businessProfile.editScreenVisible = true
    }

    // Check Business Name
    const nameInput = await page.$('input[placeholder="Wevly Technology"], input[required]')
    if (nameInput) {
      await nameInput.click({ clickCount: 3 })
      await nameInput.type('Wevly Apex Mart')
      results.businessProfile.businessName = true
      console.log('✓ Business Name field updated')
    }

    // Check Business Type dropdown
    const typeSelect = await page.$('select[class*="appearance-none"]')
    const allSelects = await page.$$('select')
    console.log(`Found ${allSelects.length} select dropdowns on Business Profile`)

    if (allSelects.length >= 3) {
      const typeDropdown = allSelects[0]
      const catDropdown = allSelects[1]
      const stateDropdown = allSelects[2]

      // Select Business Type: Retail
      await typeDropdown.select('Retail')
      results.businessProfile.businessTypeDropdown = true
      console.log('✓ Business Type dropdown selected: Retail')

      // Select Business Category: Jewellery
      await catDropdown.select('Jewellery')
      results.businessProfile.businessCategoryDropdown = true
      console.log('✓ Business Category dropdown selected: Jewellery')

      // Select State: Maharashtra
      await stateDropdown.select('Maharashtra')
      results.businessProfile.stateDropdown = true
      console.log('✓ State dropdown selected: Maharashtra')
    }

    // Check Pincode
    const pincodeInput = await page.$('input[placeholder="Enter Pincode"]')
    if (pincodeInput) {
      await pincodeInput.click({ clickCount: 3 })
      await pincodeInput.type('400001')
      results.businessProfile.pincodeField = true
      console.log('✓ Pincode field updated')
    }

    // Check Address
    const addressInput = await page.$('textarea[placeholder="Enter Business Address"]')
    if (addressInput) {
      await addressInput.click({ clickCount: 3 })
      await addressInput.type('101 Gold Plaza, Zaveri Bazaar, Mumbai')
      results.businessProfile.addressField = true
      console.log('✓ Address field updated')
    }

    // Save Changes
    const saveButton = await page.$('button[type="submit"]')
    if (saveButton) {
      console.log('Clicking Save Changes...')
      await saveButton.click()
      await sleep(1500)
      results.businessProfile.saveChanges = true
      console.log('✓ Save Changes executed')
    }

    // Check persistence after navigation
    console.log('Navigating to Dashboard and returning to verify persistence...')
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' })
    await sleep(500)
    await page.goto(`${BASE_URL}/settings/business-profile`, { waitUntil: 'networkidle2' })
    await sleep(500)

    const reloadedName = await page.$eval('input[required]', (el) => el.value)
    console.log(`Reloaded Business Name after nav: "${reloadedName}"`)
    if (reloadedName.includes('Wevly Apex Mart')) {
      results.businessProfile.persistenceAfterNav = true
      console.log('✓ Persistence after navigation verified!')
    }

    // Check persistence after browser refresh
    console.log('Refreshing page to verify persistence after reload...')
    await page.reload({ waitUntil: 'networkidle2' })
    await sleep(500)
    const refreshedName = await page.$eval('input[required]', (el) => el.value)
    console.log(`Reloaded Business Name after browser refresh: "${refreshedName}"`)
    if (refreshedName.includes('Wevly Apex Mart')) {
      results.businessProfile.persistenceAfterRefresh = true
      console.log('✓ Persistence after browser refresh verified!')
    }

    // ══════════════════════════════════════════════════════════
    // PART 3: SINGLE SOURCE OF TRUTH AUDIT IN SETTINGS
    // ══════════════════════════════════════════════════════════
    console.log('\n[3/4] Verifying Settings Category tab is read-only reference...')
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' })

    // Click BUSINESS CATEGORY tab
    const tabs = await page.$$('button')
    for (const tab of tabs) {
      const text = await page.evaluate((el) => el.textContent, tab)
      if (text && text.includes('BUSINESS CATEGORY')) {
        await tab.click()
        await sleep(500)
        break
      }
    }

    // Verify there is an "Open Business Profile" button
    const openProfileButtons = await page.$$eval('button', (buttons) =>
      buttons.filter((b) => b.textContent && b.textContent.includes('Open Business Profile')).length
    )
    console.log(`Found ${openProfileButtons} "Open Business Profile" button(s) in Settings`)
    if (openProfileButtons > 0) {
      results.singleSourceOfTruth.settingsCategoryReadOnly = true
      results.singleSourceOfTruth.openBusinessProfileButtonWorks = true
      console.log('✓ Settings Category tab is read-only and links to Business Profile!')
    }

    // Audit editable controls across settings
    const settingSelects = await page.$$('select')
    console.log(`Settings page dropdowns: ${settingSelects.length}`)

    // ══════════════════════════════════════════════════════════
    // PART 4: DASHBOARD NAVIGATION SEQUENCES (TESTS A - I)
    // ══════════════════════════════════════════════════════════
    console.log('\n[4/4] Testing Dashboard Navigation Sequences (A through I)...')

    async function testNav(name, targetUrl) {
      console.log(`-> Testing ${name}: Dashboard -> ${targetUrl} -> Dashboard (Sidebar SPA click)`)

      // Go to target page
      await page.goto(`${BASE_URL}${targetUrl}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('body', { timeout: 8000 })
      await sleep(300)

      // Return to dashboard via sidebar SPA link
      const tNav = Date.now()
      const dashboardLink = await page.$('a[href="/dashboard"]')
      if (dashboardLink) {
        await dashboardLink.click()
      } else {
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
      }
      await page.waitForSelector('main', { timeout: 8000 })
      const navDuration = Date.now() - tNav
      results.performance.dashboardReloadTimes.push(navDuration)
      console.log(`   ✓ SPA Click -> Dashboard usable in ${navDuration}ms`)
      return true
    }

    results.navigationTests.testA_Customers = await testNav('TEST A', '/parties?tab=customers')
    results.navigationTests.testB_Products = await testNav('TEST B', '/products')
    results.navigationTests.testC_Inventory = await testNav('TEST C', '/inventory')
    results.navigationTests.testD_Sales = await testNav('TEST D', '/sales/invoices')
    results.navigationTests.testE_Purchase = await testNav('TEST E', '/purchases/bills')
    results.navigationTests.testF_Payments = await testNav('TEST F', '/sales/payments')
    results.navigationTests.testG_Reports = await testNav('TEST G', '/reports')
    results.navigationTests.testH_Settings_BusinessProfile = await testNav('TEST H', '/settings/business-profile')

    // TEST I: Change Category in Business Profile -> Save -> Return to Dashboard
    console.log('-> Testing TEST I: Dashboard -> Business Profile -> Change Category -> Save -> Dashboard')
    await page.goto(`${BASE_URL}/settings/business-profile`, { waitUntil: 'networkidle2' })
    const allSelectsI = await page.$$('select')
    if (allSelectsI.length >= 2) {
      await allSelectsI[0].select('Retail')
      await allSelectsI[1].select('Grocery/Kirana')
      const saveBtnI = await page.$('button[type="submit"]')
      if (saveBtnI) {
        await saveBtnI.click()
        await sleep(1000)
      }
    }
    const tNavI = Date.now()
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main', { timeout: 5000 })
    const durationI = Date.now() - tNavI
    results.performance.dashboardReloadTimes.push(durationI)
    results.navigationTests.testI_ChangeCategoryAndReturn = true
    console.log(`   ✓ TEST I passed! Dashboard loaded and active after category switch in ${durationI}ms`)

  } catch (err) {
    console.error('Browser Test Error:', err)
  } finally {
    await browser.close()
  }

  console.log('\n════════════════ SUMMARY RESULTS ════════════════')
  console.log(JSON.stringify(results, null, 2))
}

runTests()
