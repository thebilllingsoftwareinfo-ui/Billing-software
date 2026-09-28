// scripts/e2e-phase1-verification.mjs
const BASE_URL = 'http://localhost:3000';
const HEADERS = {
  'Content-Type': 'application/json',
  'Cookie': 'demo_auth=true',
};

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function run() {
  console.log('====================================================');
  console.log('PHASE 1 FINAL DEEP AUDIT & E2E VERIFICATION SUITE');
  console.log('====================================================\n');

  // 1. Create Customer
  console.log('--- TEST 1: Customer Creation (Apex Traders) ---');
  const custRes = await api('/api/customers', {
    method: 'POST',
    body: JSON.stringify({
      display_name: 'Apex Traders',
      customer_type: 'business',
      phone: '9876500001',
      email: 'contact@apextraders.com',
      place_of_supply: 'Maharashtra',
      billing_address: {
        line1: '123 Market Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    }),
  });
  assert(custRes.ok, `Customer created: HTTP ${custRes.status}`);
  const customer = custRes.data.data;
  assert(customer && customer.display_name === 'Apex Traders', `Customer name is 'Apex Traders' (ID: ${customer?.id})`);

  // 2. Create Supplier
  console.log('\n--- TEST 2: Supplier Creation (ABC Distributors) ---');
  const suppRes = await api('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify({
      name: 'ABC Distributors',
      display_name: 'ABC Distributors',
      phone: '9876500002',
      email: 'sales@abcdist.com',
      state: 'Maharashtra',
      state_code: '27',
    }),
  });
  assert(suppRes.ok, `Supplier created: HTTP ${suppRes.status}`);
  const supplier = suppRes.data.supplier || suppRes.data.data;
  assert(supplier && supplier.name === 'ABC Distributors', `Supplier name is 'ABC Distributors' (ID: ${supplier?.id})`);

  // 3. Create Product
  console.log('\n--- TEST 3: Product Creation (Solar Inverter 5kVA) ---');
  const sku = `SOLAR-${Date.now().toString().slice(-4)}`;
  const prodRes = await api('/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Solar Inverter 5kVA',
      sku: sku,
      product_type: 'goods',
      selling_price: 40000,
      purchase_price: 32000,
      gst_rate: 18,
      opening_stock: 10,
      min_stock_level: 3,
      unit: 'PCS',
    }),
  });
  assert(prodRes.ok, `Product created: HTTP ${prodRes.status}`);
  const product = prodRes.data.data;
  assert(product && product.name === 'Solar Inverter 5kVA', `Product name is 'Solar Inverter 5kVA' (ID: ${product?.id})`);
  assert(product.current_stock === 10, `Initial current_stock = 10 (actual: ${product.current_stock})`);
  assert(product.sale_price === 40000, `Sale price = ₹40,000 (actual: ₹${product.sale_price})`);
  assert(product.purchase_price === 32000, `Purchase price = ₹32,000 (actual: ₹${product.purchase_price})`);

  // 4. Create Purchase Bill
  console.log('\n--- TEST 4: Purchase Bill Flow (5 units @ ₹32,000 + 18% GST) ---');
  const billRes = await api('/api/purchases', {
    method: 'POST',
    body: JSON.stringify({
      supplier_id: supplier.id,
      bill_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: product.id,
          description: 'Solar Inverter 5kVA',
          quantity: 5,
          unit_price: 32000,
          gst_rate: 18,
        },
      ],
    }),
  });
  assert(billRes.ok, `Purchase Bill created: HTTP ${billRes.status}`);
  const billData = billRes.data;
  const billId = billData.bill_id || billData.id || billData.data?.id;
  assert(billId, `Bill ID exists: ${billId}`);
  assert(billData.total_amount === 188800, `Purchase Bill Total = ₹1,88,800 (actual: ₹${billData.total_amount})`);

  // 5. Finalize Purchase Bill
  console.log('\n--- TEST 5: Purchase Bill Finalize & Stock Inbound ---');
  const finalizeRes = await api(`/api/purchases/${billId}/finalize`, {
    method: 'POST',
  });
  assert(finalizeRes.ok, `Purchase Bill Finalized: HTTP ${finalizeRes.status}`);
  
  // Verify Stock Inbound (+5 => 15)
  const productAfterPurchase = await api(`/api/products/${product.id}`);
  const stockAfterPurchase = productAfterPurchase.data?.data?.product?.current_stock ?? productAfterPurchase.data?.data?.current_stock;
  assert(stockAfterPurchase === 15, `Stock incremented from 10 to 15 (actual: ${stockAfterPurchase})`);

  // Verify Supplier Statement & Outstanding
  const suppStatement = await api(`/api/suppliers/${supplier.id}/statement`);
  assert(suppStatement.ok, `Supplier statement fetched: HTTP ${suppStatement.status}`);
  const suppMetrics = suppStatement.data?.metrics;
  assert(suppMetrics?.outstanding_payable === 188800, `Supplier outstanding payable = ₹1,88,800 (actual: ₹${suppMetrics?.outstanding_payable})`);

  // Test Idempotency / Double Finalization Protection
  console.log('\n--- TEST 6: Double Finalization Protection ---');
  const doubleFinalize = await api(`/api/purchases/${billId}/finalize`, {
    method: 'POST',
  });
  assert(!doubleFinalize.ok || doubleFinalize.status === 400 || doubleFinalize.status === 422, `Double finalize blocked: HTTP ${doubleFinalize.status} - ${doubleFinalize.data.error}`);
  
  const productAfterDouble = await api(`/api/products/${product.id}`);
  const stockAfterDouble = productAfterDouble.data?.data?.product?.current_stock ?? productAfterDouble.data?.data?.current_stock;
  assert(stockAfterDouble === 15, `Stock remains exactly 15 after double finalization attempt (actual: ${stockAfterDouble})`);

  // 7. Sales Invoice Creation (2 units @ ₹40,000 + 18% GST = ₹94,400)
  console.log('\n--- TEST 7: Sales Invoice Flow & Stock Outbound (2 units @ ₹40,000 + 18% GST) ---');
  const invRes = await api('/api/invoices', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customer.id,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: product.id,
          description: 'Solar Inverter 5kVA',
          quantity: 2,
          unit_price: 40000,
          gst_rate: 18,
        },
      ],
    }),
  });
  assert(invRes.ok, `Sales Invoice created: HTTP ${invRes.status}`);
  const invData = invRes.data.data;
  assert(invData.total_amount === 94400, `Invoice Total = ₹94,400 (actual: ₹${invData.total_amount})`);

  // Verify Stock Outbound (-2 => 13)
  const productAfterSale = await api(`/api/products/${product.id}`);
  const stockAfterSale = productAfterSale.data?.data?.product?.current_stock ?? productAfterSale.data?.data?.current_stock;
  assert(stockAfterSale === 13, `Stock decremented from 15 to 13 (actual: ${stockAfterSale})`);

  // Verify Customer Detail & Ledger after invoice
  console.log('\n--- TEST 8: Customer Ledger & Summary (Before Payment) ---');
  const custDetailBefore = await api(`/api/customers/${customer.id}`);
  assert(custDetailBefore.ok, `Customer detail fetched: HTTP ${custDetailBefore.status}`);
  const custSummary1 = custDetailBefore.data.data?.summary;
  assert(custSummary1?.totalSales === 94400, `Customer totalSales = ₹94,400 (actual: ₹${custSummary1?.totalSales})`);
  assert(custSummary1?.outstanding === 94400, `Customer outstanding = ₹94,400 (actual: ₹${custSummary1?.outstanding})`);

  // 9. Payment Recording (₹20,000 UPI)
  console.log('\n--- TEST 9: Payment Recording (₹20,000 UPI) ---');
  const payRes = await api('/api/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customer.id,
      amount: 20000,
      payment_method: 'upi',
      reference_number: 'UPI-AXIS-99120',
      allocations: [
        {
          invoice_id: invData.id,
          allocated_amount: 20000,
        },
      ],
    }),
  });
  assert(payRes.ok, `Payment recorded: HTTP ${payRes.status}`);

  // Verify Customer Detail & Ledger after payment
  console.log('\n--- TEST 10: Customer Ledger & Summary (After Payment) ---');
  const custDetailAfter = await api(`/api/customers/${customer.id}`);
  const custSummary2 = custDetailAfter.data.data?.summary;
  assert(custSummary2?.outstanding === 74400, `Customer outstanding reduced to ₹74,400 (actual: ₹${custSummary2?.outstanding})`);
  const txs = custDetailAfter.data.data?.transactions || [];
  const payTxn = txs.find((t) => t.transaction_type === 'payment' && (Math.abs(t.amount) === 20000 || t.reference_number === 'UPI-AXIS-99120'));
  assert(Boolean(payTxn), `Customer transaction ledger contains payment credit entry (Narration: ${payTxn?.narration})`);

  // 11. Walk-in Customer POS Invoice
  console.log('\n--- TEST 11: POS Walk-in Customer Invoice ---');
  const walkinRes = await api('/api/invoices', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: 'walk-in',
      invoice_date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash',
      payment_status: 'paid',
      amount_paid: 500,
      items: [
        {
          description: 'Quick Retail Cable',
          quantity: 1,
          unit_price: 500,
          gst_rate: 0,
        },
      ],
    }),
  });
  assert(walkinRes.ok, `POS Walk-in invoice generated without UUID error: HTTP ${walkinRes.status} (Inv: ${walkinRes.data.data?.invoice_number})`);

  // 12. Global Search
  console.log('\n--- TEST 12: Global Search ---');
  for (const q of ['Apex', 'Solar', 'INV-', 'PB-']) {
    const sRes = await api(`/api/search?q=${encodeURIComponent(q)}`);
    const count = sRes.data?.data?.length || 0;
    assert(sRes.ok, `Search query '${q}' succeeded: HTTP ${sRes.status} (${count} results)`);
    assert(count > 0, `Search query '${q}' returned matching entities (count: ${count})`);
  }

  // 13. Staff API
  console.log('\n--- TEST 13: Staff Management API ---');
  const staffList = await api('/api/staff');
  assert(staffList.ok, `Staff list fetched: HTTP ${staffList.status}`);
  const inviteRes = await api('/api/staff', {
    method: 'POST',
    body: JSON.stringify({
      email: `engineer-${Date.now().toString().slice(-4)}@company.com`,
      role: 'accountant',
    }),
  });
  assert(inviteRes.ok, `Staff invited without UUID query error: HTTP ${inviteRes.status}`);

  // 14. Reports API
  console.log('\n--- TEST 14: Reports Endpoints ---');
  const salesRep = await api('/api/reports/sales');
  assert(salesRep.ok, `Sales report fetched: HTTP ${salesRep.status}`);
  const purchRep = await api('/api/reports/purchases');
  assert(purchRep.ok, `Purchases report fetched: HTTP ${purchRep.status}`);
  const invRep = await api('/api/reports/inventory');
  assert(invRep.ok, `Inventory report fetched: HTTP ${invRep.status}`);

  console.log('\n====================================================');
  console.log('🎉 ALL 14 PHASE 1 VERIFICATION GATES PASSED 100%!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
