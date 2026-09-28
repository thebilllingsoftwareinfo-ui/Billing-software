// ============================================================
// lib/services/credit-control.service.ts — Phase 9 Customer Credit Control
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission, can } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  demoCustomers,
  demoInvoices,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export type CreditStatus = 'ok' | 'near_limit' | 'limit_exceeded' | 'blocked';

export interface CustomerCreditProfile {
  customer_id: string;
  customer_name: string;
  credit_limit: number;
  current_outstanding: number;
  available_credit: number;
  utilization_percent: number;
  credit_status: CreditStatus;
  payment_terms_days: number;
}

function checkIsSupabase(session: { org_id?: string; organization_id?: string; user_id?: string }): boolean {
  const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
    orgId !== DEMO_ORG_ID &&
    !session.user_id?.includes('demo')
  );
}

export class CreditControlService {
  /**
   * Evaluates the current credit profile of a customer.
   */
  static async getCustomerCreditProfile(session: AppSession, customerId: string): Promise<CustomerCreditProfile> {
    requirePermission(session.role, 'credit.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    let creditLimit = 0;
    let customerName = 'Customer';
    let paymentTerms = 0;
    let outstanding = 0;

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .select('name, credit_limit, current_balance, default_payment_terms_days')
        .eq('id', customerId)
        .eq('organization_id', orgId)
        .single();
      if (custErr) throw new Error(custErr.message);

      customerName = cust.name;
      creditLimit = Number(cust.credit_limit) || 0;
      paymentTerms = Number(cust.default_payment_terms_days) || 0;
      outstanding = Number(cust.current_balance) || 0;
    } else {
      const cust = demoCustomers.find((c) => c.id === customerId && c.organization_id === orgId) as any;
      if (!cust) throw new Error('Customer not found');

      customerName = cust.name || cust.display_name || 'Customer';
      creditLimit = Number(cust.credit_limit) || 0;
      paymentTerms = Number(cust.default_payment_terms_days ?? cust.credit_period_days) || 0;
      outstanding = Number(cust.current_balance ?? cust.outstanding_balance) || 0;
    }

    let availableCredit = creditLimit > 0 ? Math.max(0, creditLimit - outstanding) : 0;
    let utilization = creditLimit > 0 ? Math.min(100, Math.round((outstanding / creditLimit) * 100)) : 0;

    let status: CreditStatus = 'ok';
    if (creditLimit > 0) {
      if (outstanding > creditLimit) {
        status = 'limit_exceeded';
      } else if (outstanding >= creditLimit * 0.8) {
        status = 'near_limit';
      }
    }

    return {
      customer_id: customerId,
      customer_name: customerName,
      credit_limit: creditLimit,
      current_outstanding: Math.round(outstanding * 100) / 100,
      available_credit: Math.round(availableCredit * 100) / 100,
      utilization_percent: utilization,
      credit_status: status,
      payment_terms_days: paymentTerms,
    };
  }

  /**
   * Assesses an incoming sales transaction against credit limit.
   * Exempts cash or fully paid sales.
   * Allows authorized override if manager/admin provides reason.
   */
  static async evaluateSalesCreditCheck(
    session: AppSession,
    params: {
      customer_id: string;
      invoice_amount: number;
      immediate_payment?: number;
      override_reason?: string;
    }
  ): Promise<{
    allowed: boolean;
    status: CreditStatus;
    exposure: number;
    credit_limit: number;
    warning_message?: string;
  }> {
    const profile = await this.getCustomerCreditProfile(session, params.customer_id);

    // If credit limit is 0, credit control is not restricted or is cash-only
    if (profile.credit_limit <= 0) {
      return {
        allowed: true,
        status: 'ok',
        exposure: profile.current_outstanding,
        credit_limit: 0,
      };
    }

    const immediatePay = Math.max(0, Number(params.immediate_payment) || 0);
    const newExposure = Math.max(0, params.invoice_amount - immediatePay);

    // If invoice is fully paid upfront, no new credit exposure is incurred
    if (newExposure <= 0) {
      return {
        allowed: true,
        status: profile.credit_status,
        exposure: profile.current_outstanding,
        credit_limit: profile.credit_limit,
      };
    }

    const totalExposure = Math.round((profile.current_outstanding + newExposure) * 100) / 100;

    if (totalExposure > profile.credit_limit) {
      // Check if user has override authority
      const hasOverridePerm = can(session.role, 'credit.manage');

      if (hasOverridePerm && params.override_reason && params.override_reason.trim().length > 0) {
        await logAudit(session, 'credit_limit.overridden', 'customers', params.customer_id, {
          total_exposure: totalExposure,
          credit_limit: profile.credit_limit,
          reason: params.override_reason,
        });

        return {
          allowed: true,
          status: 'limit_exceeded',
          exposure: totalExposure,
          credit_limit: profile.credit_limit,
          warning_message: `Credit limit exceeded (₹${totalExposure} / ₹${profile.credit_limit}), authorized by ${session.email || session.user?.email || 'manager'}`,
        };
      }

      throw new Error(
        `CREDIT_LIMIT_EXCEEDED: Customer '${profile.customer_name}' has credit limit of ₹${profile.credit_limit}. ` +
        `Current outstanding ₹${profile.current_outstanding} + new credit ₹${newExposure} = ₹${totalExposure}. ` +
        `Immediate payment or manager authorization required.`
      );
    }

    let warningMsg: string | undefined;
    if (totalExposure >= profile.credit_limit * 0.8) {
      warningMsg = `Customer is near credit limit (₹${totalExposure} / ₹${profile.credit_limit})`;
    }

    return {
      allowed: true,
      status: totalExposure >= profile.credit_limit * 0.8 ? 'near_limit' : 'ok',
      exposure: totalExposure,
      credit_limit: profile.credit_limit,
      warning_message: warningMsg,
    };
  }

  /**
   * Updates customer credit limit and payment terms.
   */
  static async updateCreditLimit(
    session: AppSession,
    customerId: string,
    params: {
      credit_limit: number;
      payment_terms_days?: number;
      reason?: string;
    }
  ): Promise<CustomerCreditProfile> {
    requirePermission(session.role, 'credit.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (params.credit_limit < 0) {
      throw new Error('Credit limit cannot be negative');
    }

    if (isSupabase) {
      const supabase = createAdminClient();
      await supabase
        .from('customers')
        .update({
          credit_limit: params.credit_limit,
          ...(params.payment_terms_days !== undefined && { default_payment_terms_days: params.payment_terms_days }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .eq('organization_id', orgId);
    } else {
      const cust = demoCustomers.find((c) => c.id === customerId && c.organization_id === orgId) as any;
      if (!cust) throw new Error('Customer not found');
      cust.credit_limit = params.credit_limit;
      if (params.payment_terms_days !== undefined) {
        cust.default_payment_terms_days = params.payment_terms_days;
      }
    }

    await logAudit(session, 'credit_limit.updated', 'customers', customerId, {
      credit_limit: params.credit_limit,
      payment_terms_days: params.payment_terms_days,
      reason: params.reason || 'Credit limit adjustment',
    });

    return this.getCustomerCreditProfile(session, customerId);
  }
}
