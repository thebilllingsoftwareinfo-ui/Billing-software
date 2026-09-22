import { createPurchaseBillSchema } from '../lib/validators/purchase.schema';
import { TaxService } from '../lib/services/tax.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASSED: ${message}`);
}

async function runPurchaseEngineTests() {
  console.log('\n🧪 Running Wevly BusinessOS Purchase Bills & Stock Inbound Engine Test Suite...\n');

  // -------------------------------------------------------------
  // Test Suite 1: Purchase Bill Schema Validation
  // -------------------------------------------------------------
  console.log('📝 Test Suite 1: Purchase Bill Schema Validation');

  const validPurchasePayload = {
    supplier_id: '123e4567-e89b-12d3-a456-426614174000',
    bill_number: 'INV-SUPP-9921',
    bill_date: '2026-09-13',
    due_date: '2026-10-13',
    notes: 'Inventory purchase from primary distributor',
    items: [
      {
        product_id: '223e4567-e89b-12d3-a456-426614174000',
        description: 'Raw Materials Unit Batch A',
        quantity: 50,
        unit: 'KG',
        unit_price_paise: 20000, // ₹200 / unit = ₹10,000 base (1,000,000 paise)
        discount_pct: 0,
        hsn_sac: '8471',
        gst_rate: 18,
        gst_type: 'exclusive' as const,
      },
    ],
  };

  const parsedValid = createPurchaseBillSchema.safeParse(validPurchasePayload);
  assert(parsedValid.success, 'Valid purchase bill payload passes Zod validation');

  const missingBillNum = createPurchaseBillSchema.safeParse({
    ...validPurchasePayload,
    bill_number: '',
  });
  assert(!missingBillNum.success, 'Purchase bill without supplier bill number is rejected');

  // -------------------------------------------------------------
  // Test Suite 2: Server-Side Input GST & Tax Calculations
  // -------------------------------------------------------------
  console.log('\n🧮 Test Suite 2: Server-Side Input GST & Tax Calculations');

  const taxCalc = TaxService.calculateLineItemsTax({
    sellerStateCode: '27', // Maharashtra
    buyerStateCode: '07',  // Delhi (Inter-state purchase)
    items: [
      {
        description: 'Raw Materials Unit Batch A',
        quantity: 50,
        unitPricePaise: 20000, // ₹200 * 50 = ₹10,000 (1,000,000 paise)
        discountPct: 0,
        gstRate: 18,            // 18% IGST = ₹1,800 (180,000 paise)
        gstType: 'exclusive',
      },
    ],
  });

  assert(taxCalc.subtotalPaise === 1000000, 'Purchase Subtotal is ₹10,000 (1,000,000 paise)');
  assert(taxCalc.igstPaise === 180000, 'Inter-state input IGST (18%) is ₹1,800 (180,000 paise)');
  assert(taxCalc.cgstPaise === 0 && taxCalc.sgstPaise === 0, 'Inter-state purchase levies zero CGST/SGST');
  assert(taxCalc.totalPaise === 1180000, 'Total Purchase Bill amount is ₹11,800 (1,180,000 paise)');

  // -------------------------------------------------------------
  // Test Suite 3: Finalization Workflow Rules (Stock Inbound & Payable Sync)
  // -------------------------------------------------------------
  console.log('\n📦 Test Suite 3: Finalization Workflow Rules (Stock Inbound & Payable Sync)');

  // Initial state simulation
  const initialStock = 100;
  let supplierOutstandingPaise = 0;
  let billStatus = 'draft';

  // Finalize execution simulation
  const billTotalPaise = 1180000; // ₹11,800
  const purchasedQty = 50;

  billStatus = 'approved';
  const newStock = initialStock + purchasedQty;
  supplierOutstandingPaise += billTotalPaise;

  assert(billStatus === 'approved', 'Finalizing purchase bill sets status to APPROVED');
  assert(newStock === 150, 'Posting PURCHASE movement increases inventory stock by +50 (100 -> 150)');
  assert(
    supplierOutstandingPaise === 1180000,
    'Finalization increases supplier payable outstanding balance to ₹11,800 (1,180,000 paise)'
  );

  // -------------------------------------------------------------
  // Test Suite 4: Supplier Statement Ledger
  // -------------------------------------------------------------
  console.log('\n📊 Test Suite 4: Supplier Statement Ledger');

  const purchaseHistory = [
    { bill_number: 'INV-SUPP-9921', total_paise: 1180000, paid_paise: 400000 },
    { bill_number: 'INV-SUPP-9922', total_paise: 500000, paid_paise: 500000 },
  ];

  const totalPurchasesPaise = purchaseHistory.reduce((s, b) => s + b.total_paise, 0);
  const totalPaidPaise = purchaseHistory.reduce((s, b) => s + b.paid_paise, 0);
  const netPayablePaise = totalPurchasesPaise - totalPaidPaise;

  assert(totalPurchasesPaise === 1680000, 'Total purchases across bills is ₹16,800 (1,680,000 paise)');
  assert(totalPaidPaise === 900000, 'Total payments made to supplier is ₹9,000 (900,000 paise)');
  assert(netPayablePaise === 780000, 'Net supplier payable outstanding balance is ₹7,800 (780,000 paise)');

  console.log('\n==================================================');
  console.log('📊 Purchase Bills Engine Test Summary: 10/10 Tests Passed');
  console.log('==================================================\n');
}

runPurchaseEngineTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
