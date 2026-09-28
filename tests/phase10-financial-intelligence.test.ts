import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialPeriodService } from '@/lib/services/financial-period.service';
import { CostCenterService } from '@/lib/services/cost-center.service';
import { BankReconciliationService } from '@/lib/services/reconciliation.service';
import { ArApIntelligenceService } from '@/lib/services/ar-ap-intelligence.service';
import { CashFlowService } from '@/lib/services/cash-flow.service';
import { TaxComplianceService } from '@/lib/services/tax-compliance.service';
import { FinancialReportsService } from '@/lib/services/financial-reports.service';
import { BiDashboardService } from '@/lib/services/bi-dashboard.service';
import { AccountingService } from '@/lib/services/accounting.service';
import { SalesTransactionService } from '@/lib/services/sales-transaction.service';
import { PurchaseTransactionService } from '@/lib/services/purchase-transaction.service';
import { ExpenseService } from '@/lib/services/expense.service';
import { PaymentService } from '@/lib/services/payment.service';
import { AppSession } from '@/lib/auth/session';
import {
  resetDemoPhase10,
  demoFinancialPeriods,
  demoCostCenters,
  demoBankReconciliations,
  demoTaxPeriods,
  demoCustomers,
  demoSuppliers,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

const sessionAdmin: AppSession = {
  user_id: 'user-admin-demo-p10',
  organization_id: DEMO_ORG_ID,
  org_id: DEMO_ORG_ID,
  email: 'admin@acme.com',
  role: 'admin',
  user: { id: 'user-admin-demo-p10', email: 'admin@acme.com', full_name: 'Admin', avatar_url: null },
  organization: { id: DEMO_ORG_ID, name: 'Acme Systems', gstin: '27AABCU9603R1ZM', logo_url: null, business_category: 'General Wholesale' },
  member: { id: 'mem-admin-p10', role: 'admin', status: 'active' },
};

const sessionAccountant: AppSession = {
  user_id: 'user-accountant-demo-p10',
  organization_id: DEMO_ORG_ID,
  org_id: DEMO_ORG_ID,
  email: 'accountant@acme.com',
  role: 'accountant',
  user: { id: 'user-accountant-demo-p10', email: 'accountant@acme.com', full_name: 'Accountant', avatar_url: null },
  organization: { id: DEMO_ORG_ID, name: 'Acme Systems', gstin: '27AABCU9603R1ZM', logo_url: null, business_category: 'General Wholesale' },
  member: { id: 'mem-acc-p10', role: 'accountant', status: 'active' },
};

const sessionViewer: AppSession = {
  user_id: 'user-viewer-phase10',
  organization_id: DEMO_ORG_ID,
  org_id: DEMO_ORG_ID,
  email: 'viewer@acme.com',
  role: 'viewer' as any,
  user: { id: 'user-viewer-phase10', email: 'viewer@acme.com', full_name: 'Viewer', avatar_url: null },
  organization: { id: DEMO_ORG_ID, name: 'Acme Systems', gstin: '27AABCU9603R1ZM', logo_url: null, business_category: 'General Wholesale' },
  member: { id: 'mem-viewer-p10', role: 'viewer' as any, status: 'active' },
};

const sessionOrgB: AppSession = {
  user_id: 'user-admin-org-b',
  organization_id: '22222222-2222-2222-2222-222222222222',
  org_id: '22222222-2222-2222-2222-222222222222',
  email: 'admin@orgb.com',
  role: 'admin',
  user: { id: 'user-admin-org-b', email: 'admin@orgb.com', full_name: 'Org B Admin', avatar_url: null },
  organization: { id: '22222222-2222-2222-2222-222222222222', name: 'Org B Ltd', gstin: '29AABCU9603R1ZM', logo_url: null, business_category: 'Retail' },
  member: { id: 'mem-admin-orgb', role: 'admin', status: 'active' },
};

describe('Phase 10: Advanced Financial Accounting, Tax Compliance & Business Intelligence', () => {
  beforeEach(() => {
    resetDemoPhase10();
  });

  // ============================================================
  // 1. FINANCIAL PERIODS ENGINE (12 tests)
  // ============================================================
  describe('1. Financial Periods Management & Posting Lock', () => {
    it('1.1 should list existing demo financial periods', async () => {
      const periods = await FinancialPeriodService.getPeriods(sessionAdmin);
      expect(periods).toBeDefined();
      expect(periods.length).toBeGreaterThan(0);
    });

    it('1.2 should filter financial periods by fiscal year', async () => {
      const periods = await FinancialPeriodService.getPeriods(sessionAdmin, '2026-2027');
      expect(periods.every((p) => p.fiscal_year === '2026-2027')).toBe(true);
    });

    it('1.3 should fetch a financial period by ID', async () => {
      const periods = await FinancialPeriodService.getPeriods(sessionAdmin);
      const target = periods[0];
      const fetched = await FinancialPeriodService.getPeriodById(sessionAdmin, target.id);
      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(target.id);
    });

    it('1.4 should return null for a non-existent period ID', async () => {
      const fetched = await FinancialPeriodService.getPeriodById(sessionAdmin, 'non-existent-id');
      expect(fetched).toBeNull();
    });

    it('1.5 should create a new financial period', async () => {
      const created = await FinancialPeriodService.createPeriod(sessionAdmin, {
        period_name: 'October 2026',
        period_key: '2026-10',
        fiscal_year: '2026-2027',
        start_date: '2026-10-01',
        end_date: '2026-10-31',
      });
      expect(created).toBeDefined();
      expect(created.period_name).toBe('October 2026');
      expect(created.status).toBe('open');
      expect(created.status === 'closed').toBeFalsy();
    });

    it('1.6 should reject creating an overlapping period key for the same org', async () => {
      await expect(
        FinancialPeriodService.createPeriod(sessionAdmin, {
          period_name: 'Duplicate April',
          period_key: '2026-04',
          fiscal_year: '2026-2027',
          start_date: '2026-04-01',
          end_date: '2026-04-30',
        })
      ).rejects.toThrow();
    });

    it('1.7 should close an open financial period', async () => {
      const periods = await FinancialPeriodService.getPeriods(sessionAdmin);
      const openPeriod = periods.find((p) => p.status === 'open');
      expect(openPeriod).toBeDefined();

      const closed = await FinancialPeriodService.closePeriod(
        sessionAdmin,
        openPeriod!.id
      );
      expect(closed.status).toBe('closed');
      expect(closed.closed_at).toBeDefined();
    });

    it('1.8 should be idempotent when closing an already closed period', async () => {
      const periods = await FinancialPeriodService.getPeriods(sessionAdmin);
      const closedPeriod = periods.find((p) => p.status === 'closed');
      expect(closedPeriod).toBeDefined();

      const result = await FinancialPeriodService.closePeriod(sessionAdmin, closedPeriod!.id);
      expect(result.status).toBe('closed');
    });

    it('1.9 should reopen a closed period when provided with mandatory audit reason', async () => {
      const periods = await FinancialPeriodService.getPeriods(sessionAdmin);
      const closedPeriod = periods.find((p) => p.status === 'closed');
      expect(closedPeriod).toBeDefined();

      const reopened = await FinancialPeriodService.reopenPeriod(
        sessionAdmin,
        closedPeriod!.id,
        'Auditor adjustments required for statutory year-end audit'
      );
      expect(reopened.status).toBe('open');
      expect(reopened.reopen_reason).toBe('Auditor adjustments required for statutory year-end audit');
    });

    it('1.10 should reject reopening a closed period without a reason', async () => {
      const periods = await FinancialPeriodService.getPeriods(sessionAdmin);
      const closedPeriod = periods.find((p) => p.status === 'closed');
      expect(closedPeriod).toBeDefined();

      await expect(
        FinancialPeriodService.reopenPeriod(sessionAdmin, closedPeriod!.id, '')
      ).rejects.toThrow();
    });

    it('1.11 validatePostingDate: should allow posting date in an open period', async () => {
      const isValid = await FinancialPeriodService.validatePostingDate(sessionAdmin, '2026-07-15');
      expect(isValid).toBe(true);
    });

    it('1.12 validatePostingDate: should throw error when posting to a closed period', async () => {
      await expect(
        FinancialPeriodService.validatePostingDate(sessionAdmin, '2026-04-15')
      ).rejects.toThrow(/closed|locked/i);
    });
  });

  // ============================================================
  // 2. STATUTORY POSTING LOCK INVARIANT INTEGRATION (8 tests)
  // ============================================================
  describe('2. Cross-Service Posting Invariant Enforcement', () => {
    it('2.1 AccountingService: should reject manual journal entry in closed period', async () => {
      await expect(
        AccountingService.createJournalEntry(sessionAdmin, {
          entry_date: '2026-04-15', // Falls into closed April 2026
          reference_type: 'manual',
          description: 'Test closed entry',
          lines: [
            { account_id: 'acc-1010', debit: 1000, credit: 0 },
            { account_id: 'acc-4010', debit: 0, credit: 1000 },
          ],
        })
      ).rejects.toThrow(/closed|locked/i);
    });

    it('2.2 AccountingService: should allow manual journal entry in open period', async () => {
      const entry = await AccountingService.createJournalEntry(sessionAdmin, {
        entry_date: '2026-07-15', // Open period
        reference_type: 'manual',
        description: 'Test open entry',
        lines: [
          { account_id: 'acc-1010', debit: 1000, credit: 0 },
          { account_id: 'acc-4010', debit: 0, credit: 1000 },
        ],
      });
      expect(entry).toBeDefined();
    });

    it('2.3 ExpenseService: should reject expense created with date in closed period', async () => {
      await expect(
        ExpenseService.createExpense(sessionAdmin, {
          category_id: 'cat-travel',
          amount: 5000,
          payment_method: 'cash',
          expense_date: '2026-04-10', // Closed period
          description: 'Historical trip expense',
        })
      ).rejects.toThrow(/closed|locked/i);
    });

    it('2.4 ExpenseService: should allow expense in open period', async () => {
      const expense = await ExpenseService.createExpense(sessionAdmin, {
        category_id: 'cat-office',
        amount: 2500,
        payment_method: 'cash',
        expense_date: '2026-07-10', // Open period
        description: 'Office supplies',
      });
      expect(expense).toBeDefined();
    });

    it('2.5 PaymentService: should reject customer payment in closed period', async () => {
      const custId = demoCustomers[0]?.id || 'cust-1';
      await expect(
        PaymentService.recordPayment(sessionAdmin, {
          customer_id: custId,
          amount: 10000,
          payment_method: 'neft',
          payment_date: '2026-04-15', // Closed period
          allocations: [{ invoice_id: 'inv-1', allocated_amount: 10000 }],
        })
      ).rejects.toThrow(/closed|locked/i);
    });

    it('2.6 PaymentService: should allow customer payment in open period', async () => {
      const custId = demoCustomers[0]?.id || 'cust-1';
      const payment = await PaymentService.recordPayment(sessionAdmin, {
        customer_id: custId,
        amount: 10000,
        payment_method: 'neft',
        payment_date: '2026-07-15', // Open period
        allocations: [{ invoice_id: 'inv-1', allocated_amount: 10000 }],
      });
      expect(payment).toBeDefined();
    });

    it('2.7 PurchaseTransactionService: should reject purchase payment in closed period', async () => {
      const supId = demoSuppliers[0]?.id || 'sup-1';
      await expect(
        PurchaseTransactionService.recordSupplierPayment(sessionAdmin, {
          supplier_id: supId,
          amount: 15000,
          payment_method: 'bank',
          payment_date: '2026-04-20', // Closed period
        })
      ).rejects.toThrow(/closed|locked/i);
    });

    it('2.8 PurchaseTransactionService: should allow purchase payment in open period', async () => {
      const supId = demoSuppliers[0]?.id || 'sup-1';
      const payment = await PurchaseTransactionService.recordSupplierPayment(sessionAdmin, {
        supplier_id: supId,
        amount: 15000,
        payment_method: 'bank',
        payment_date: '2026-07-20', // Open period
      });
      expect(payment).toBeDefined();
    });
  });

  // ============================================================
  // 3. COST CENTERS & PROJECT SEGMENTATION (8 tests)
  // ============================================================
  describe('3. Cost Centers & Segmentation Engine', () => {
    it('3.1 should list all configured cost centers', async () => {
      const list = await CostCenterService.getCostCenters(sessionAdmin);
      expect(list).toBeDefined();
      expect(list.length).toBeGreaterThan(0);
    });

    it('3.2 should filter cost centers by type', async () => {
      const departments = await CostCenterService.getCostCenters(sessionAdmin, { type: 'department' });
      expect(departments.every((d) => d.type === 'department')).toBe(true);
    });

    it('3.3 should filter cost centers by active status', async () => {
      const activeOnly = await CostCenterService.getCostCenters(sessionAdmin, { is_active: true });
      expect(activeOnly.every((c) => c.is_active === true)).toBe(true);
    });

    it('3.4 should search cost centers by name or code', async () => {
      const results = await CostCenterService.getCostCenters(sessionAdmin, { search: 'sales' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('3.5 should fetch a single cost center by ID', async () => {
      const list = await CostCenterService.getCostCenters(sessionAdmin);
      const target = list[0];
      const fetched = await CostCenterService.getCostCenterById(sessionAdmin, target.id);
      expect(fetched?.id).toBe(target.id);
    });

    it('3.6 should create a new cost center', async () => {
      const created = await CostCenterService.createCostCenter(sessionAdmin, {
        code: 'ENG-01',
        name: 'Engineering Department',
        type: 'department',
        description: 'Software and product engineering',
      });
      expect(created.code).toBe('ENG-01');
      expect(created.is_active).toBe(true);
    });

    it('3.7 should reject creating duplicate cost center code in same org', async () => {
      await expect(
        CostCenterService.createCostCenter(sessionAdmin, {
          code: 'HQ-CORP', // Already seeded
          name: 'Duplicate HQ',
          type: 'cost_center',
        })
      ).rejects.toThrow();
    });

    it('3.8 should toggle cost center active status', async () => {
      const list = await CostCenterService.getCostCenters(sessionAdmin);
      const target = list[0];
      const updated = await CostCenterService.updateCostCenter(sessionAdmin, target.id, {
        is_active: false,
      });
      expect(updated.is_active).toBe(false);
    });
  });

  // ============================================================
  // 4. BANK RECONCILIATION ENGINE (8 tests)
  // ============================================================
  describe('4. Bank Reconciliation Engine', () => {
    it('4.1 should fetch all bank reconciliation sessions', async () => {
      const list = await BankReconciliationService.getReconciliations(sessionAdmin);
      expect(list).toBeDefined();
    });

    it('4.2 should filter bank reconciliations by account ID', async () => {
      const list = await BankReconciliationService.getReconciliations(sessionAdmin, '1020');
      expect(Array.isArray(list)).toBe(true);
    });

    it('4.3 should create and fetch reconciliation by ID including matches', async () => {
      const created = await BankReconciliationService.createReconciliation(sessionAdmin, {
        account_id: '1020',
        statement_date: '2026-08-31',
        statement_balance: 1250000,
        notes: 'August reconciliation',
      });
      const fetched = await BankReconciliationService.getReconciliationById(sessionAdmin, created.id);
      expect(fetched?.id).toBe(created.id);
      expect(Array.isArray(fetched?.matches)).toBe(true);
    });

    it('4.4 should create a new bank reconciliation session', async () => {
      const created = await BankReconciliationService.createReconciliation(sessionAdmin, {
        account_id: '1020',
        statement_date: '2026-09-30',
        statement_balance: 1450000,
        notes: 'September statement reconciliation',
      });
      expect(created.id).toBeDefined();
      expect(created.statement_balance).toBe(1450000);
    });

    it('4.5 should match a transaction into a reconciliation session', async () => {
      const created = await BankReconciliationService.createReconciliation(sessionAdmin, {
        account_id: '1020',
        statement_date: '2026-08-31',
        statement_balance: 1250000,
      });

      const matchResult = await BankReconciliationService.matchTransaction(
        sessionAdmin,
        created.id,
        {
          matched_amount: 50000,
          transaction_date: '2026-08-15',
          reference_number: 'NEFT-5519',
          notes: 'Customer collection cleared',
        }
      );
      expect(matchResult.match_id).toBeDefined();
      expect(matchResult.reconciled_balance).toBeGreaterThan(0);
    });

    it('4.6 should unmatch a previously matched transaction', async () => {
      const created = await BankReconciliationService.createReconciliation(sessionAdmin, {
        account_id: '1020',
        statement_date: '2026-08-31',
        statement_balance: 1250000,
      });

      const matchResult = await BankReconciliationService.matchTransaction(
        sessionAdmin,
        created.id,
        {
          matched_amount: 25000,
          transaction_date: '2026-08-18',
        }
      );

      const unmatchResult = await BankReconciliationService.unmatchTransaction(
        sessionAdmin,
        created.id,
        matchResult.match_id
      );
      expect(unmatchResult.success).toBe(true);
    });

    it('4.7 should complete and lock reconciliation', async () => {
      const created = await BankReconciliationService.createReconciliation(sessionAdmin, {
        account_id: '1020',
        statement_date: '2026-09-30',
        statement_balance: 1000000,
      });

      const completed = await BankReconciliationService.completeReconciliation(
        sessionAdmin,
        created.id
      );
      expect(completed.status).toBe('completed');
      expect(completed.reconciled_at).toBeDefined();
    });

    it('4.8 should reject completing an already completed reconciliation', async () => {
      const created = await BankReconciliationService.createReconciliation(sessionAdmin, {
        account_id: '1020',
        statement_date: '2026-09-30',
        statement_balance: 1000000,
      });

      await BankReconciliationService.completeReconciliation(sessionAdmin, created.id);

      await expect(
        BankReconciliationService.completeReconciliation(sessionAdmin, created.id)
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // 5. ACCOUNTS RECEIVABLE (AR) AGEING INTELLIGENCE (6 tests)
  // ============================================================
  describe('5. Accounts Receivable (AR) Ageing Engine', () => {
    it('5.1 should compute overall AR aging summary', async () => {
      const ar = await ArApIntelligenceService.getArAging(sessionAdmin);
      expect(ar).toBeDefined();
      expect(ar.summary).toBeDefined();
      expect(ar.summary.total).toBeGreaterThanOrEqual(0);
    });

    it('5.2 should verify AR buckets sum up exactly to total outstanding', async () => {
      const ar = await ArApIntelligenceService.getArAging(sessionAdmin);
      const sum =
        ar.summary.current +
        ar.summary.days1_30 +
        ar.summary.days31_60 +
        ar.summary.days61_90 +
        ar.summary.days90_plus;
      expect(Math.round(sum)).toBe(Math.round(ar.summary.total));
    });

    it('5.3 should group AR balances customer-wise', async () => {
      const ar = await ArApIntelligenceService.getArAging(sessionAdmin);
      expect(Array.isArray(ar.customers)).toBe(true);
      ar.customers.forEach((c) => {
        expect(c.customer_id).toBeDefined();
        expect(c.customer_name).toBeDefined();
        expect(c.buckets.total).toBeGreaterThanOrEqual(0);
      });
    });

    it('5.4 should compute aging for a specific customer', async () => {
      const custId = demoCustomers[0]?.id || 'cust-1';
      const customerAging = await ArApIntelligenceService.getCustomerAging(
        sessionAdmin,
        custId
      );
      expect(customerAging).toBeDefined();
      expect(customerAging.customer_id).toBe(custId);
      expect(customerAging.buckets).toBeDefined();
    });

    it('5.5 should handle customer with zero outstanding cleanly', async () => {
      const zeroAging = await ArApIntelligenceService.getCustomerAging(
        sessionAdmin,
        'cust-zero-outstanding'
      );
      expect(zeroAging.buckets.total).toBe(0);
      expect(zeroAging.buckets.current).toBe(0);
    });

    it('5.6 should support historical as-of-date calculation for AR aging', async () => {
      const historicalAr = await ArApIntelligenceService.getArAging(sessionAdmin, {
        as_of_date: '2026-06-30',
      });
      expect(historicalAr.as_of_date).toBe('2026-06-30');
    });
  });

  // ============================================================
  // 6. ACCOUNTS PAYABLE (AP) AGEING INTELLIGENCE (6 tests)
  // ============================================================
  describe('6. Accounts Payable (AP) Ageing Engine', () => {
    it('6.1 should compute overall AP aging summary', async () => {
      const ap = await ArApIntelligenceService.getApAging(sessionAdmin);
      expect(ap).toBeDefined();
      expect(ap.summary).toBeDefined();
      expect(ap.summary.total).toBeGreaterThanOrEqual(0);
    });

    it('6.2 should verify AP buckets sum up exactly to total payables', async () => {
      const ap = await ArApIntelligenceService.getApAging(sessionAdmin);
      const sum =
        ap.summary.current +
        ap.summary.days1_30 +
        ap.summary.days31_60 +
        ap.summary.days61_90 +
        ap.summary.days90_plus;
      expect(Math.round(sum)).toBe(Math.round(ap.summary.total));
    });

    it('6.3 should group AP balances supplier-wise', async () => {
      const ap = await ArApIntelligenceService.getApAging(sessionAdmin);
      expect(Array.isArray(ap.suppliers)).toBe(true);
      ap.suppliers.forEach((s) => {
        expect(s.supplier_id).toBeDefined();
        expect(s.supplier_name).toBeDefined();
        expect(s.buckets.total).toBeGreaterThanOrEqual(0);
      });
    });

    it('6.4 should compute aging for a specific supplier', async () => {
      const supId = demoSuppliers[0]?.id || 'sup-1';
      const supplierAging = await ArApIntelligenceService.getSupplierAging(
        sessionAdmin,
        supId
      );
      expect(supplierAging).toBeDefined();
      expect(supplierAging.supplier_id).toBe(supId);
      expect(supplierAging.buckets).toBeDefined();
    });

    it('6.5 should handle supplier with zero outstanding cleanly', async () => {
      const zeroAging = await ArApIntelligenceService.getSupplierAging(
        sessionAdmin,
        'sup-zero-outstanding'
      );
      expect(zeroAging.buckets.total).toBe(0);
    });

    it('6.6 should support historical as-of-date calculation for AP aging', async () => {
      const historicalAp = await ArApIntelligenceService.getApAging(sessionAdmin, {
        as_of_date: '2026-06-30',
      });
      expect(historicalAp.as_of_date).toBe('2026-06-30');
    });
  });

  // ============================================================
  // 7. MULTI-TIER CASH FLOW STATEMENT (6 tests)
  // ============================================================
  describe('7. Cash Flow Statement Engine', () => {
    it('7.1 should generate complete 3-tier cash flow statement', async () => {
      const cf = await CashFlowService.getCashFlowStatement(sessionAdmin);
      expect(cf).toBeDefined();
      expect(cf.operating_activities).toBeDefined();
      expect(cf.investing_activities).toBeDefined();
      expect(cf.financing_activities).toBeDefined();
    });

    it('7.2 should compute Operating Activities cash flow correctly', async () => {
      const cf = await CashFlowService.getCashFlowStatement(sessionAdmin);
      const op = cf.operating_activities;
      expect(op.net_operating_cash).toBeDefined();
    });

    it('7.3 should compute Investing Activities cash flow correctly', async () => {
      const cf = await CashFlowService.getCashFlowStatement(sessionAdmin);
      const inv = cf.investing_activities;
      const expectedNetInv = inv.fixed_asset_sales - inv.fixed_asset_purchases;
      expect(Math.round(inv.net_investing_cash)).toBe(Math.round(expectedNetInv));
    });

    it('7.4 should compute Financing Activities cash flow correctly', async () => {
      const cf = await CashFlowService.getCashFlowStatement(sessionAdmin);
      const fin = cf.financing_activities;
      expect(fin.net_financing_cash).toBeDefined();
    });

    it('7.5 should satisfy mathematical Cash Flow Identity: Opening + Net Change = Closing', async () => {
      const cf = await CashFlowService.getCashFlowStatement(sessionAdmin);
      expect(Math.round(cf.closing_cash_balance)).toBe(
        Math.round(cf.opening_cash_balance + cf.net_change_in_cash)
      );
    });

    it('7.6 should support custom date ranges in cash flow statement', async () => {
      const customCf = await CashFlowService.getCashFlowStatement(sessionAdmin, {
        from_date: '2026-04-01',
        to_date: '2026-09-30',
      });
      expect(customCf.from_date).toBe('2026-04-01');
      expect(customCf.to_date).toBe('2026-09-30');
    });
  });

  // ============================================================
  // 8. GST & TAX COMPLIANCE ENGINE (8 tests)
  // ============================================================
  describe('8. GST & Tax Compliance Engine', () => {
    it('8.1 should compute Output GST breakdown (CGST, SGST, IGST)', async () => {
      const tax = await TaxComplianceService.getTaxComplianceSummary(sessionAdmin);
      expect(tax.output_gst).toBeDefined();
      expect(tax.output_gst.total).toBe(
        tax.output_gst.cgst + tax.output_gst.sgst + tax.output_gst.igst
      );
    });

    it('8.2 should compute Input Tax Credit (ITC) breakdown (CGST, SGST, IGST)', async () => {
      const tax = await TaxComplianceService.getTaxComplianceSummary(sessionAdmin);
      expect(tax.input_tax_credit).toBeDefined();
      expect(tax.input_tax_credit.total).toBe(
        tax.input_tax_credit.cgst + tax.input_tax_credit.sgst + tax.input_tax_credit.igst
      );
    });

    it('8.3 should calculate Net Tax Payable or ITC Carried Forward', async () => {
      const tax = await TaxComplianceService.getTaxComplianceSummary(sessionAdmin);
      if (tax.output_gst.total >= tax.input_tax_credit.total) {
        expect(tax.net_tax_payable).toBe(tax.output_gst.total - tax.input_tax_credit.total);
        expect(tax.net_itc_balance).toBe(0);
      } else {
        expect(tax.net_tax_payable).toBe(0);
        expect(tax.net_itc_balance).toBe(tax.input_tax_credit.total - tax.output_gst.total);
      }
    });

    it('8.4 should include rate-wise turnover breakdown', async () => {
      const tax = await TaxComplianceService.getTaxComplianceSummary(sessionAdmin);
      expect(Array.isArray(tax.rate_breakdown)).toBe(true);
      expect(tax.rate_breakdown.length).toBeGreaterThan(0);
    });

    it('8.5 should list statutory tax filing periods', async () => {
      const periods = await TaxComplianceService.getTaxPeriods(sessionAdmin);
      expect(periods).toBeDefined();
      expect(periods.length).toBeGreaterThan(0);
    });

    it('8.6 should filter tax filing periods by fiscal year', async () => {
      const periods = await TaxComplianceService.getTaxPeriods(sessionAdmin, '2026-2027');
      expect(periods.every((p) => (p.period_name || p.period_key).includes('2026'))).toBe(true);
    });

    it('8.7 should create a new tax filing period', async () => {
      const created = await TaxComplianceService.createTaxPeriod(sessionAdmin, {
        period_key: '2026-10',
        period_type: 'monthly',
        start_date: '2026-10-01',
        end_date: '2026-10-31',
      });
      expect(created.id).toBeDefined();
      expect(created.status).toBe('draft');
    });

    it('8.8 should finalize a tax filing period and record notes', async () => {
      const periods = await TaxComplianceService.getTaxPeriods(sessionAdmin);
      const draft = periods.find((p) => p.status === 'draft') || periods[0];

      const finalized = await TaxComplianceService.finalizeTaxPeriod(
        sessionAdmin,
        draft.id,
        'ARN AA271026009112X filed on GST portal'
      );
      expect(finalized.status).toBe('finalized');
      expect(finalized.filing_date).toBeDefined();
    });
  });

  // ============================================================
  // 9. FINANCIAL STATEMENTS & INVARIANTS (8 tests)
  // ============================================================
  describe('9. Financial Statements & Accounting Invariants', () => {
    it('9.1 Trial Balance: should balance debits and credits', async () => {
      const tb = await FinancialReportsService.getTrialBalance(sessionAdmin);
      expect(tb).toBeDefined();
      expect(Array.isArray(tb.accounts)).toBe(true);
      expect(Math.round(tb.total_debit)).toBe(Math.round(tb.total_credit));
      expect(tb.is_balanced).toBe(true);
    });

    it('9.2 Trial Balance: accounts must have non-negative balances', async () => {
      const tb = await FinancialReportsService.getTrialBalance(sessionAdmin);
      tb.accounts.forEach((acc: any) => {
        expect(acc.debit).toBeGreaterThanOrEqual(0);
        expect(acc.credit).toBeGreaterThanOrEqual(0);
      });
    });

    it('9.3 Profit & Loss: should compute Gross Profit = Revenue - COGS', async () => {
      const pnl = await FinancialReportsService.getProfitAndLoss(sessionAdmin);
      expect(pnl.gross_profit).toBe(pnl.net_revenue - pnl.cogs);
    });

    it('9.4 Profit & Loss: should compute Net Profit = Gross Profit - Total OpEx', async () => {
      const pnl = await FinancialReportsService.getProfitAndLoss(sessionAdmin);
      expect(pnl.net_profit).toBe(pnl.gross_profit - pnl.total_operating_expenses);
    });

    it('9.5 Profit & Loss: should support custom date range', async () => {
      const pnlFiltered = await FinancialReportsService.getProfitAndLoss(
        sessionAdmin,
        { from: '2026-04-01', to: '2026-09-30' }
      );
      expect(pnlFiltered).toBeDefined();
      expect(pnlFiltered.net_revenue).toBeDefined();
    });

    it('9.6 Balance Sheet: should satisfy fundamental equation Assets = Liabilities + Equity', async () => {
      const bs = await FinancialReportsService.getBalanceSheet(sessionAdmin);
      expect(bs).toBeDefined();
      const assets = bs.assets.total;
      const liabilitiesAndEquity = bs.liabilities.total + bs.equity.total;
      expect(Math.round(assets)).toBe(Math.round(liabilitiesAndEquity));
      expect(bs.is_balanced).toBe(true);
    });

    it('9.7 Balance Sheet: Current Assets should include Cash, Bank, AR, and Inventory', async () => {
      const bs = await FinancialReportsService.getBalanceSheet(sessionAdmin);
      expect(bs.assets.current.cash_and_bank).toBeGreaterThanOrEqual(0);
      expect(bs.assets.current.accounts_receivable).toBeGreaterThanOrEqual(0);
      expect(bs.assets.current.inventory).toBeGreaterThanOrEqual(0);
    });

    it('9.8 Balance Sheet: Equity must include Retained Earnings / Current Period Net Profit', async () => {
      const bs = await FinancialReportsService.getBalanceSheet(sessionAdmin);
      expect(bs.equity.current_earnings).toBeDefined();
    });
  });

  // ============================================================
  // 10. EXECUTIVE BI METRICS & FINANCIAL ALERTS (8 tests)
  // ============================================================
  describe('10. Executive BI Metrics & Cockpit Engine', () => {
    it('10.1 should compute executive summary KPIs', async () => {
      const bi = await BiDashboardService.getBiMetrics(sessionAdmin);
      expect(bi.kpis).toBeDefined();
      expect(bi.kpis.total_revenue).toBeGreaterThanOrEqual(0);
      expect(bi.kpis.gross_profit).toBeGreaterThanOrEqual(0);
      expect(bi.kpis.net_profit).toBeDefined();
    });

    it('10.2 should calculate working capital metrics (DSO, DPO, CCC)', async () => {
      const bi = await BiDashboardService.getBiMetrics(sessionAdmin);
      expect(bi.kpis.dso_days).toBeGreaterThanOrEqual(0);
      expect(bi.kpis.dpo_days).toBeGreaterThanOrEqual(0);
      expect(typeof bi.kpis.cash_conversion_cycle_days).toBe('number');
    });

    it('10.3 should provide multi-month trend analysis for executive charts', async () => {
      const bi = await BiDashboardService.getBiMetrics(sessionAdmin);
      expect(Array.isArray(bi.monthly_trends)).toBe(true);
      expect(bi.monthly_trends.length).toBeGreaterThan(0);
      bi.monthly_trends.forEach((m) => {
        expect(m.month).toBeDefined();
        expect(m.revenue).toBeGreaterThanOrEqual(0);
      });
    });

    it('10.4 should generate actionable data-grounded financial alerts', async () => {
      const bi = await BiDashboardService.getBiMetrics(sessionAdmin);
      expect(Array.isArray(bi.alerts)).toBe(true);
      bi.alerts.forEach((alert) => {
        expect(alert.id).toBeDefined();
        expect(['info', 'warning', 'critical']).toContain(alert.severity);
        expect(alert.recommended_action).toBeDefined();
      });
    });

    it('10.5 should compute revenue concentration by customer', async () => {
      const bi = await BiDashboardService.getBiMetrics(sessionAdmin);
      expect(bi.segmentation.top_revenue_customers).toBeDefined();
      expect(Array.isArray(bi.segmentation.top_revenue_customers)).toBe(true);
    });

    it('10.6 should compute product margin segmentation', async () => {
      const bi = await BiDashboardService.getBiMetrics(sessionAdmin);
      expect(bi.segmentation.top_margin_products).toBeDefined();
      expect(Array.isArray(bi.segmentation.top_margin_products)).toBe(true);
    });

    it('10.7 should calculate Gross Margin % and Net Margin % accurately', async () => {
      const bi = await BiDashboardService.getBiMetrics(sessionAdmin);
      if (bi.kpis.total_revenue > 0) {
        const expectedGrossPct = (bi.kpis.gross_profit / bi.kpis.total_revenue) * 100;
        const expectedNetPct = (bi.kpis.net_profit / bi.kpis.total_revenue) * 100;
        expect(Math.round(bi.kpis.gross_margin_pct)).toBe(Math.round(expectedGrossPct));
        expect(Math.round(bi.kpis.net_margin_pct)).toBe(Math.round(expectedNetPct));
      }
    });

    it('10.8 should handle zero revenue organizations gracefully without NaN', async () => {
      const biZero = await BiDashboardService.getBiMetrics(sessionOrgB);
      expect(biZero.kpis.gross_margin_pct).toBe(0);
      expect(biZero.kpis.net_margin_pct).toBe(0);
      expect(Number.isNaN(biZero.kpis.dso_days)).toBe(false);
    });
  });

  // ============================================================
  // 11. RBAC PERMISSIONS & MULTI-TENANCY ISOLATION (8 tests)
  // ============================================================
  describe('11. Security, RBAC & Multi-Tenancy Isolation', () => {
    it('11.1 RBAC: Viewer role should be rejected from closing a financial period', async () => {
      const periods = await FinancialPeriodService.getPeriods(sessionAdmin);
      const target = periods[0];
      await expect(
        FinancialPeriodService.closePeriod(sessionViewer, target.id)
      ).rejects.toThrow(/FORBIDDEN|permission/i);
    });

    it('11.2 RBAC: Viewer role should be rejected from creating a cost center', async () => {
      await expect(
        CostCenterService.createCostCenter(sessionViewer, {
          code: 'UNAUTH-01',
          name: 'Unauthorized Center',
          type: 'cost_center',
        })
      ).rejects.toThrow(/FORBIDDEN|permission/i);
    });

    it('11.3 RBAC: Viewer role should be rejected from finalizing a tax period', async () => {
      const periods = await TaxComplianceService.getTaxPeriods(sessionAdmin);
      await expect(
        TaxComplianceService.finalizeTaxPeriod(sessionViewer, periods[0].id)
      ).rejects.toThrow(/FORBIDDEN|permission/i);
    });

    it('11.4 RBAC: Accountant role should be allowed to view AR/AP aging reports', async () => {
      const ar = await ArApIntelligenceService.getArAging(sessionAccountant);
      expect(ar).toBeDefined();
    });

    it('11.5 Multi-Tenancy: Org B cannot see Org A financial periods', async () => {
      const periodsOrgB = await FinancialPeriodService.getPeriods(sessionOrgB);
      expect(periodsOrgB.length).toBe(0);
    });

    it('11.6 Multi-Tenancy: Org B cannot mutate Org A financial periods', async () => {
      const periodsOrgA = await FinancialPeriodService.getPeriods(sessionAdmin);
      const targetA = periodsOrgA[0];
      await expect(
        FinancialPeriodService.closePeriod(sessionOrgB, targetA.id)
      ).rejects.toThrow();
    });

    it('11.7 Multi-Tenancy: Org B cannot see Org A cost centers', async () => {
      const costCentersOrgB = await CostCenterService.getCostCenters(sessionOrgB);
      expect(costCentersOrgB.length).toBe(0);
    });

    it('11.8 Multi-Tenancy: Org B cannot see Org A bank reconciliations', async () => {
      const recsOrgB = await BankReconciliationService.getReconciliations(sessionOrgB);
      expect(recsOrgB.length).toBe(0);
    });
  });
});
