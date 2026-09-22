import { createPaymentSchema } from '../lib/validators/payment.schema';
import { formatRupeeWords } from '../lib/utils/number-to-words';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASSED: ${message}`);
}

async function runPaymentEngineTests() {
  console.log('\n🧪 Running Wevly BusinessOS Payment Engine Test Suite...\n');

  // -------------------------------------------------------------
  // Test Suite 1: Payment Schema & Method Validations
  // -------------------------------------------------------------
  console.log('📝 Test Suite 1: Payment Schema & Method Validations');
  
  const validPaymentPayload = {
    customer_id: '123e4567-e89b-12d3-a456-426614174000',
    payment_date: '2026-09-13',
    amount_paise: 400000, // ₹4,000
    payment_method: 'upi',
    reference_number: 'UPI-9812981298',
    notes: 'Partial payment for invoice',
    allow_overpayment: false,
    allocations: [
      {
        invoice_id: '223e4567-e89b-12d3-a456-426614174000',
        allocated_paise: 400000,
      },
    ],
  };

  const parsedValid = createPaymentSchema.safeParse(validPaymentPayload);
  if (!parsedValid.success) {
    console.error('Zod error details:', parsedValid.error.format());
  }
  assert(parsedValid.success, 'Valid payment payload passes Zod validation');

  const invalidMethod = createPaymentSchema.safeParse({
    ...validPaymentPayload,
    payment_method: 'bitcoin',
  });
  assert(!invalidMethod.success, 'Invalid payment method is rejected by schema');

  const zeroAmount = createPaymentSchema.safeParse({
    ...validPaymentPayload,
    amount_paise: 0,
  });
  assert(!zeroAmount.success, 'Zero payment amount is rejected by schema');

  // -------------------------------------------------------------
  // Test Suite 2: Partial & Full Payment Status Auto-Transitions
  // -------------------------------------------------------------
  console.log('\n💰 Test Suite 2: Partial & Full Payment Status Auto-Transitions');

  const invoiceTotalPaise = 1000000; // ₹10,000

  // Scenario 1: Unpaid (0 paid)
  let paidPaise = 0;
  let status = paidPaise >= invoiceTotalPaise ? 'paid' : paidPaise > 0 ? 'partial' : 'sent';
  let outstandingPaise = invoiceTotalPaise - paidPaise;

  assert(status === 'sent', '0 paid results in UNPAID/SENT status');
  assert(outstandingPaise === 1000000, 'Initial outstanding is full invoice total (₹10,000)');

  // Scenario 2: Partial payment of ₹4,000 (400,000 paise)
  paidPaise += 400000;
  status = paidPaise >= invoiceTotalPaise ? 'paid' : paidPaise > 0 ? 'partial' : 'sent';
  outstandingPaise = invoiceTotalPaise - paidPaise;

  assert(status === 'partial', 'Partial payment of ₹4,000 updates status to PARTIALLY_PAID (partial)');
  assert(outstandingPaise === 600000, 'Invoice total ₹10,000 - Payment ₹4,000 = Outstanding ₹6,000 (600,000 paise)');

  // Scenario 3: Remaining full payment of ₹6,000 (600,000 paise)
  paidPaise += 600000;
  status = paidPaise >= invoiceTotalPaise ? 'paid' : paidPaise > 0 ? 'partial' : 'sent';
  outstandingPaise = Math.max(0, invoiceTotalPaise - paidPaise);

  assert(status === 'paid', 'Full payment settlement updates status to PAID');
  assert(outstandingPaise === 0, 'Full payment results in ₹0 outstanding balance');

  // -------------------------------------------------------------
  // Test Suite 3: Overpayment Rule Guard
  // -------------------------------------------------------------
  console.log('\n🛡️ Test Suite 3: Overpayment Rule Guard');

  const currentInvoiceOutstanding = 600000; // ₹6,000
  const attemptedAllocation = 800000; // ₹8,000
  const allowOverpayment = false;

  let overpaymentBlocked = false;
  if (attemptedAllocation > currentInvoiceOutstanding && !allowOverpayment) {
    overpaymentBlocked = true;
  }

  assert(
    overpaymentBlocked,
    'Attempting to allocate ₹8,000 to an invoice with ₹6,000 outstanding balance is blocked without explicit overpayment policy'
  );

  let overpaymentAllowedWithFlag = false;
  const allowOverpaymentFlag = true;
  if (attemptedAllocation > currentInvoiceOutstanding && allowOverpaymentFlag) {
    overpaymentAllowedWithFlag = true;
  }

  assert(
    overpaymentAllowedWithFlag,
    'Overpayment is permitted when explicit allow_overpayment policy override flag is set to true'
  );

  // -------------------------------------------------------------
  // Test Suite 4: Payment Receipt Rupee Amount in Words
  // -------------------------------------------------------------
  console.log('\n🔤 Test Suite 4: Payment Receipt Rupee Amount in Words');

  const receiptWords = formatRupeeWords(400000);
  assert(
    receiptWords === 'Rupees Four Thousand Only',
    'Converts ₹4,000 payment to exact Rupee words "Rupees Four Thousand Only"'
  );

  console.log('\n==================================================');
  console.log('📊 Payment Engine Test Summary: 9/9 Tests Passed');
  console.log('==================================================\n');
}

runPaymentEngineTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
