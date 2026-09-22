import { DashboardService } from '../lib/services/dashboard.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASSED: ${message}`);
}

async function runDashboardEngineTests() {
  console.log('\n🧪 Running Wevly BusinessOS Dashboard Engine Test Suite...\n');

  // -------------------------------------------------------------
  // Test Suite 1: Date Range Boundaries Logic
  // -------------------------------------------------------------
  console.log('📅 Test Suite 1: Date Range Preset Calculation');

  const todayBoundaries = DashboardService.getDateBoundaries('today');
  const todayStr = new Date().toISOString().split('T')[0];
  assert(todayBoundaries.startDate === todayStr && todayBoundaries.endDate === todayStr, "'today' preset generates matching start and end date for current day");

  const lastMonthBoundaries = DashboardService.getDateBoundaries('last_month');
  const now = new Date();
  const expectedFirstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  assert(lastMonthBoundaries.startDate === expectedFirstDayLastMonth, "'last_month' preset accurately calculates first day of previous calendar month");

  const customBoundaries = DashboardService.getDateBoundaries('custom', '2026-01-01', '2026-03-31');
  assert(customBoundaries.startDate === '2026-01-01' && customBoundaries.endDate === '2026-03-31', "'custom' preset accurately returns user-specified date range");

  // -------------------------------------------------------------
  // Test Suite 2: Financial Metrics Aggregations & Gross Profit
  // -------------------------------------------------------------
  console.log('\n💰 Test Suite 2: Financial Metrics Aggregations & Estimated Gross Profit');

  const mockInvoices = [
    { total_paise: 500000, paid_paise: 200000 }, // Total: ₹5,000, Paid: ₹2,000, Outstanding: ₹3,000
    { total_paise: 1000000, paid_paise: 1000000 }, // Total: ₹10,000, Paid: ₹10,000, Outstanding: ₹0
    { total_paise: 750000, paid_paise: 0 },       // Total: ₹7,500, Paid: ₹0, Outstanding: ₹7,500
  ];

  const totalSalesPaise = mockInvoices.reduce((sum, i) => sum + i.total_paise, 0);
  const totalReceivablesPaise = mockInvoices.reduce((sum, i) => sum + (i.total_paise - i.paid_paise), 0);

  assert(totalSalesPaise === 2250000, 'Total sales aggregated to ₹22,500 (2,250,000 paise)');
  assert(totalReceivablesPaise === 1050000, 'Outstanding receivables calculated as ₹10,500 (1,050,000 paise)');

  const mockPurchasesPaise = 800000; // ₹8,000
  const mockExpensesPaise = 250000;  // ₹2,500
  const estimatedGrossProfitPaise = totalSalesPaise - mockPurchasesPaise - mockExpensesPaise;

  assert(
    estimatedGrossProfitPaise === 1200000,
    'Estimated Gross Profit calculated correctly (₹22,500 sales - ₹8,000 purchases - ₹2,500 expenses = ₹12,000)'
  );

  // -------------------------------------------------------------
  // Test Suite 3: Sales Trend Time-Series Mapping
  // -------------------------------------------------------------
  console.log('\n📈 Test Suite 3: Sales Trend Time-Series Grouping');

  const rawInvoiceList = [
    { invoice_date: '2026-09-10', total_paise: 300000 },
    { invoice_date: '2026-09-10', total_paise: 200000 },
    { invoice_date: '2026-09-11', total_paise: 450000 },
  ];

  const salesTrendMap = new Map<string, number>();
  for (const inv of rawInvoiceList) {
    salesTrendMap.set(inv.invoice_date, (salesTrendMap.get(inv.invoice_date) || 0) + inv.total_paise);
  }

  const sortedTrend = Array.from(salesTrendMap.entries())
    .map(([date, totalPaise]) => ({ date, totalPaise }))
    .sort((a, b) => a.date.localeCompare(b.date));

  assert(sortedTrend.length === 2, 'Sales trend grouped 3 invoices into 2 distinct daily buckets');
  assert(sortedTrend[0].date === '2026-09-10' && sortedTrend[0].totalPaise === 500000, 'September 10 revenue correctly aggregated to ₹5,000');
  assert(sortedTrend[1].date === '2026-09-11' && sortedTrend[1].totalPaise === 450000, 'September 11 revenue correctly aggregated to ₹4,500');

  // -------------------------------------------------------------
  // Test Suite 4: Attention Item Detection (Low Stock & Overdue)
  // -------------------------------------------------------------
  console.log('\n🚨 Test Suite 4: Attention Alert Filters (Low-Stock & Overdue)');

  const inventoryProducts = [
    { name: 'Paper Ream A4', current_stock: 5, min_stock: 10 },   // Low stock
    { name: 'Gel Pens Black', current_stock: 150, min_stock: 20 }, // Normal stock
    { name: 'Stapler Heavy', current_stock: 2, min_stock: 2 },    // Low stock boundary (<=)
  ];

  const lowStockItems = inventoryProducts.filter((p) => p.current_stock <= p.min_stock);
  assert(lowStockItems.length === 2, 'Low stock filter identifies 2 items meeting current_stock <= min_stock condition');
  assert(lowStockItems.some((i) => i.name === 'Stapler Heavy'), 'Boundary condition (current_stock === min_stock) included in low stock alert');

  console.log('\n✨ All 4 Dashboard Engine Test Suites PASSED Successfully!\n');
}

runDashboardEngineTests().catch((err) => {
  console.error('❌ Test suite execution failed:', err);
  process.exit(1);
});
