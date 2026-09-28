// ============================================================================
// lib/services/cash-flow.service.ts — Phase 10 Cash Flow Statement & Intelligence
//
// Computes Operating, Investing, and Financing cash movements, net flow,
// opening cash, and closing cash across specified periods.
// INVARIANT: Purely analytical read-only reporting. Canonical cash/bank ledgers are never mutated.
// ============================================================================

import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import {
  demoCashBankAccounts,
  demoCashBankTransactions,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export interface CashFlowLine {
  category: 'operating' | 'investing' | 'financing';
  description: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashFlowSection {
  title: string;
  total_inflow: number;
  total_outflow: number;
  net_amount: number;
  lines: CashFlowLine[];
}

export interface CashFlowSummary {
  from_date: string;
  to_date: string;
  opening_balance: number;
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  net_cash_flow: number;
  closing_balance: number;
  daily_breakdown: Array<{
    date: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;
}

export class CashFlowService {
  /**
   * Computes the complete 3-tier Cash Flow Statement (Operating, Investing, Financing).
   */
  static async getCashFlowReport(
    session: AppSession,
    dateRange?: { from?: string; to?: string }
  ): Promise<CashFlowSummary> {
    requirePermission(session.role, 'cashflow.view');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;

    const fromDate = dateRange?.from || '2026-04-01';
    const toDate = dateRange?.to || new Date().toISOString().split('T')[0];

    // Total opening cash across active accounts
    const activeAccounts = demoCashBankAccounts.filter((a) => a.organization_id === orgId && a.is_active);
    const totalOpeningBase = activeAccounts.reduce((sum, a) => sum + (Number(a.opening_balance) || 0), 0);

    // Prior transactions before fromDate
    const priorTransactions = demoCashBankTransactions.filter(
      (t) => t.organization_id === orgId && t.transaction_date < fromDate
    );
    const priorInflows = priorTransactions
      .filter((t) => t.direction === 'in')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const priorOutflows = priorTransactions
      .filter((t) => t.direction === 'out')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const openingCashAtFromDate = Math.round((totalOpeningBase + priorInflows - priorOutflows) * 100) / 100;

    // In-scope transactions within date range
    const periodTransactions = demoCashBankTransactions.filter(
      (t) => t.organization_id === orgId && t.transaction_date >= fromDate && t.transaction_date <= toDate
    );

    // Categorization into Operating, Investing, Financing
    const operatingLines: CashFlowLine[] = [];
    const investingLines: CashFlowLine[] = [];
    const financingLines: CashFlowLine[] = [];

    let opIn = 0, opOut = 0;
    let invIn = 0, invOut = 0;
    let finIn = 0, finOut = 0;

    const dailyMap = new Map<string, { inflow: number; outflow: number }>();

    for (const t of periodTransactions) {
      const amt = Number(t.amount || 0);
      const isReceipt = t.direction === 'in';

      // Daily map tracking
      const dEntry = dailyMap.get(t.transaction_date) || { inflow: 0, outflow: 0 };
      if (isReceipt) dEntry.inflow += amt;
      else dEntry.outflow += amt;
      dailyMap.set(t.transaction_date, dEntry);

      // Classify line
      const refType = (t.reference_type || '').toLowerCase();
      const txnType = (t.transaction_type || '').toLowerCase();
      const desc = t.narration || `${txnType.replace('_', ' ')} (${t.payment_mode})`;

      if (refType.includes('asset') || refType.includes('invest') || txnType.includes('asset')) {
        // Investing Activity
        if (isReceipt) {
          invIn += amt;
          investingLines.push({ category: 'investing', description: desc, inflow: amt, outflow: 0, net: amt });
        } else {
          invOut += amt;
          investingLines.push({ category: 'investing', description: desc, inflow: 0, outflow: amt, net: -amt });
        }
      } else if (refType.includes('capital') || refType.includes('loan') || refType.includes('equity') || txnType.includes('equity')) {
        // Financing Activity
        if (isReceipt) {
          finIn += amt;
          financingLines.push({ category: 'financing', description: desc, inflow: amt, outflow: 0, net: amt });
        } else {
          finOut += amt;
          financingLines.push({ category: 'financing', description: desc, inflow: 0, outflow: amt, net: -amt });
        }
      } else {
        // Operating Activity (Default: Sales receipts, supplier payments, operating expenses)
        if (isReceipt) {
          opIn += amt;
          operatingLines.push({ category: 'operating', description: desc, inflow: amt, outflow: 0, net: amt });
        } else {
          opOut += amt;
          operatingLines.push({ category: 'operating', description: desc, inflow: 0, outflow: amt, net: -amt });
        }
      }
    }

    const netOp = Math.round((opIn - opOut) * 100) / 100;
    const netInv = Math.round((invIn - invOut) * 100) / 100;
    const netFin = Math.round((finIn - finOut) * 100) / 100;
    const totalNetFlow = Math.round((netOp + netInv + netFin) * 100) / 100;
    const closingBalance = Math.round((openingCashAtFromDate + totalNetFlow) * 100) / 100;

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, vals]) => ({
        date,
        inflow: Math.round(vals.inflow * 100) / 100,
        outflow: Math.round(vals.outflow * 100) / 100,
        net: Math.round((vals.inflow - vals.outflow) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      from_date: fromDate,
      to_date: toDate,
      opening_balance: openingCashAtFromDate,
      operating: {
        title: 'Operating Activities',
        total_inflow: Math.round(opIn * 100) / 100,
        total_outflow: Math.round(opOut * 100) / 100,
        net_amount: netOp,
        lines: operatingLines,
      },
      investing: {
        title: 'Investing Activities',
        total_inflow: Math.round(invIn * 100) / 100,
        total_outflow: Math.round(invOut * 100) / 100,
        net_amount: netInv,
        lines: investingLines,
      },
      financing: {
        title: 'Financing Activities',
        total_inflow: Math.round(finIn * 100) / 100,
        total_outflow: Math.round(finOut * 100) / 100,
        net_amount: netFin,
        lines: financingLines,
      },
      net_cash_flow: totalNetFlow,
      closing_balance: closingBalance,
      daily_breakdown: dailyBreakdown,
    };
  }

  static async getCashFlowStatement(session: AppSession, opts?: { from_date?: string; to_date?: string }) {
    const raw = await this.getCashFlowReport(session, { from: opts?.from_date, to: opts?.to_date });
    return {
      operating_activities: {
        customer_receipts: raw.operating.total_inflow,
        supplier_payments: raw.operating.total_outflow,
        operating_expenses: 0,
        tax_payments: 0,
        net_operating_cash: raw.operating.net_amount,
      },
      investing_activities: {
        fixed_asset_purchases: raw.investing.total_outflow,
        fixed_asset_sales: raw.investing.total_inflow,
        net_investing_cash: raw.investing.net_amount,
      },
      financing_activities: {
        capital_injections: raw.financing.total_inflow,
        drawings_dividends: raw.financing.total_outflow,
        loan_proceeds: 0,
        loan_repayments: 0,
        net_financing_cash: raw.financing.net_amount,
      },
      opening_cash_balance: raw.opening_balance,
      net_change_in_cash: raw.net_cash_flow,
      closing_cash_balance: raw.closing_balance,
      from_date: raw.from_date,
      to_date: raw.to_date,
    };
  }
}
