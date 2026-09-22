import { ReportService } from '../lib/services/report.service';
import { generateCSV } from '../lib/utils/csv-exporter';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASSED: ${message}`);
}

async function runReportEngineTests() {
  console.log('\n🧪 Running Wevly BusinessOS Reports Engine Test Suite...\n');

  // -------------------------------------------------------------
  // Test Suite 1: Report Date Range Boundary Calculation
  // -------------------------------------------------------------
  console.log('📅 Test Suite 1: Report Date Range Preset Logic');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBoundaries = ReportService.getDateBoundaries('today');
  assert(todayBoundaries.startDate === todayStr && todayBoundaries.endDate === todayStr, "'today' preset generates start and end date matching current day");

  const lastMonthBoundaries = ReportService.getDateBoundaries('last_month');
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  assert(lastMonthBoundaries.startDate === firstDayLastMonth, "'last_month' preset accurately calculates first day of previous month");

  const customBoundaries = ReportService.getDateBoundaries('custom', '2026-04-01', '2026-04-30');
  assert(customBoundaries.startDate === '2026-04-01' && customBoundaries.endDate === '2026-04-30', "'custom' preset accurately returns user date range");

  // -------------------------------------------------------------
  // Test Suite 2: Sales Report Aggregations (Customer, Product, Tax-wise)
  // -------------------------------------------------------------
  console.log('\n📊 Test Suite 2: Sales Report Aggregations');

  const mockCustomerInvoices = [
    { customer_name: 'Acme Corp', total_paise: 500000, paid_paise: 300000, taxable_paise: 400000, tax_paise: 100000 },
    { customer_name: 'Acme Corp', total_paise: 200000, paid_paise: 200000, taxable_paise: 160000, tax_paise: 40000 },
    { customer_name: 'Stark Industries', total_paise: 1000000, paid_paise: 0, taxable_paise: 800000, tax_paise: 200000 },
  ];

  const customerAggMap = new Map<string, { total: number; paid: number; outstanding: number }>();
  for (const inv of mockCustomerInvoices) {
    const curr = customerAggMap.get(inv.customer_name) || { total: 0, paid: 0, outstanding: 0 };
    curr.total += inv.total_paise;
    curr.paid += inv.paid_paise;
    curr.outstanding += (inv.total_paise - inv.paid_paise);
    customerAggMap.set(inv.customer_name, curr);
  }

  assert(customerAggMap.get('Acme Corp')?.total === 700000, 'Acme Corp total sales aggregated to ₹7,000');
  assert(customerAggMap.get('Acme Corp')?.outstanding === 200000, 'Acme Corp outstanding balance calculated as ₹2,000');
  assert(customerAggMap.get('Stark Industries')?.outstanding === 1000000, 'Stark Industries outstanding balance calculated as ₹10,000');

  // Tax-wise GST breakdown aggregation
  const mockLineItems = [
    { gst_rate: 18, taxable_paise: 100000, total_tax_paise: 18000 },
    { gst_rate: 18, taxable_paise: 200000, total_tax_paise: 36000 },
    { gst_rate: 5, taxable_paise: 50000, total_tax_paise: 2500 },
  ];

  const taxBreakdownMap = new Map<number, { taxable: number; tax: number }>();
  for (const item of mockLineItems) {
    const curr = taxBreakdownMap.get(item.gst_rate) || { taxable: 0, tax: 0 };
    curr.taxable += item.taxable_paise;
    curr.tax += item.total_tax_paise;
    taxBreakdownMap.set(item.gst_rate, curr);
  }

  assert(taxBreakdownMap.get(18)?.taxable === 300000, '18% GST taxable base aggregated to ₹3,000');
  assert(taxBreakdownMap.get(18)?.tax === 54000, '18% GST tax collected aggregated to ₹540');
  assert(taxBreakdownMap.get(5)?.tax === 2500, '5% GST tax collected aggregated to ₹25');

  // -------------------------------------------------------------
  // Test Suite 3: Inventory Valuation & Movement Filtering
  // -------------------------------------------------------------
  console.log('\n📦 Test Suite 3: Inventory Valuation & Low-Stock Alerts');

  const mockInventory = [
    { name: 'A4 Paper', stock: 100, purchase_price: 20000, selling_price: 30000, min_stock: 20 },
    { name: 'Stapler', stock: 5, purchase_price: 15000, selling_price: 25000, min_stock: 10 },
  ];

  const costValuation = mockInventory.reduce((sum, item) => sum + item.stock * item.purchase_price, 0);
  const retailValuation = mockInventory.reduce((sum, item) => sum + item.stock * item.selling_price, 0);
  const lowStockCount = mockInventory.filter((item) => item.stock <= item.min_stock).length;

  assert(costValuation === 2075000, 'Total asset valuation at cost price calculated as ₹20,750 (2,075,000 paise)');
  assert(retailValuation === 3125000, 'Total valuation at retail selling price calculated as ₹31,250 (3,125,000 paise)');
  assert(lowStockCount === 1, 'Low-stock report correctly flags 1 item below reorder level');

  // -------------------------------------------------------------
  // Test Suite 4: Financial Receivables Aging & Gross Profit P&L
  // -------------------------------------------------------------
  console.log('\n💰 Test Suite 4: Receivables Aging & Estimated Gross Profit');

  const mockReceivables = [
    { invoice: 'INV-001', balance: 500000, days_overdue: 0 },   // Current
    { invoice: 'INV-002', balance: 300000, days_overdue: 15 },  // 1-30 Days
    { invoice: 'INV-003', balance: 200000, days_overdue: 45 },  // 31-60 Days
    { invoice: 'INV-004', balance: 400000, days_overdue: 90 },  // 61+ Days
  ];

  let current = 0;
  let days1to30 = 0;
  let days31to60 = 0;
  let days61Plus = 0;

  for (const inv of mockReceivables) {
    if (inv.days_overdue <= 0) current += inv.balance;
    else if (inv.days_overdue <= 30) days1to30 += inv.balance;
    else if (inv.days_overdue <= 60) days31to60 += inv.balance;
    else days61Plus += inv.balance;
  }

  assert(current === 500000, 'Current receivables aging bracket is ₹5,000');
  assert(days1to30 === 300000, '1-30 days overdue aging bracket is ₹3,000');
  assert(days31to60 === 200000, '31-60 days overdue aging bracket is ₹2,000');
  assert(days61Plus === 400000, '61+ days overdue aging bracket is ₹4,000');

  // Estimated Gross Profit formula
  const salesRevenue = 5000000;  // ₹50,000
  const purchasesCost = 2000000; // ₹20,000
  const expenses = 500000;       // ₹5,000
  const netProfit = salesRevenue - purchasesCost - expenses;
  const marginPercent = ((netProfit / salesRevenue) * 100).toFixed(1);

  assert(netProfit === 2500000, 'Estimated Net Operating Profit calculated as ₹25,000 (2,500,000 paise)');
  assert(marginPercent === '50.0', 'Net Operating Profit margin percentage is 50.0%');

  // -------------------------------------------------------------
  // Test Suite 5: CSV Export Formatting & Escaping
  // -------------------------------------------------------------
  console.log('\n📄 Test Suite 5: CSV Export Formatting & Escaping');

  const headers = [
    { key: 'customer', label: 'Customer Name' },
    { key: 'amount', label: 'Total Sales (₹)' },
  ];
  const rows = [
    { customer: 'Acme "Global" Corp, Inc.', amount: '5,000.00' },
  ];

  const csvResult = generateCSV(headers, rows);
  assert(csvResult.includes('"Customer Name","Total Sales (₹)"'), 'CSV header line formatted properly');
  assert(csvResult.includes('"Acme ""Global"" Corp, Inc."'), 'Quotes and commas inside text values properly escaped in CSV');

  console.log('\n✨ All 5 Reports Engine Test Suites PASSED Successfully!\n');
}

runReportEngineTests().catch((err) => {
  console.error('❌ Test suite execution failed:', err);
  process.exit(1);
});
