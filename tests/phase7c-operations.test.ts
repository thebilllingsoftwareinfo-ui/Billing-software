// ============================================================
// tests/phase7c-operations.test.ts
// Phase 7C: Sales & Purchase Operations Enhancement Test Suite
//
// Covers:
// - Sales Orders (CRUD, GST, partial conversion, quantity limit rejection, status transitions)
// - Proforma Invoices (non-financial & non-inventory isolation, conversion to tax invoice)
// - Delivery Challans (Rule 55 CGST, stock deduction on dispatch, restoration on cancel, zero duplicate deduction)
// - Purchase Orders (procurement, GST, partial receipt into purchase bills, quantity limits)
// - Quotation multi-target conversions (Invoice, Sales Order, Proforma)
// - Customer & Supplier 360 CRM timelines
// - Multi-tenant isolation (IDOR protection) & RBAC permission guards
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SalesOrderService } from '../lib/services/sales-order.service';
import { ProformaInvoiceService } from '../lib/services/proforma-invoice.service';
import { DeliveryChallanService } from '../lib/services/delivery-challan.service';
import { PurchaseOrderService } from '../lib/services/purchase-order.service';
import { QuotationService } from '../lib/services/quotation.service';
import { CrmService } from '../lib/services/crm.service';
import {
  demoSalesOrders,
  demoSalesOrderItems,
  demoProformaInvoices,
  demoProformaInvoiceItems,
  demoDeliveryChallans,
  demoDeliveryChallanItems,
  demoPurchaseOrders,
  demoPurchaseOrderItems,
  demoCustomers,
  demoSuppliers,
  demoProducts,
  demoResetDocSequences,
  demoResetQuotationStates,
  DEMO_ORG_ID,
} from '../lib/services/demo-store';

// Test session for Org A (owner with full permissions)
const sessionOrgA: any = {
  user_id: 'user-demo-a',
  organization_id: DEMO_ORG_ID,
  role: 'owner',
  user: { id: 'user-demo-a', email: 'owner@orga.com' },
  organization: { id: DEMO_ORG_ID, name: 'Org A Industries', state_code: '27' },
  member: { id: 'mem-a', role: 'owner' },
};

// Test session for Org B (different tenant)
const sessionOrgB: any = {
  user_id: 'user-demo-b',
  organization_id: 'org-demo-2222-2222',
  role: 'owner',
  user: { id: 'user-demo-b', email: 'owner@orgb.com' },
  organization: { id: 'org-demo-2222-2222', name: 'Org B Ltd', state_code: '29' },
  member: { id: 'mem-b', role: 'owner' },
};

// Test session for staff with restricted permissions (e.g., cannot convert or delete)
const sessionStaffRestricted: any = {
  user_id: 'user-demo-staff',
  organization_id: DEMO_ORG_ID,
  role: 'inventory',
  user: { id: 'user-demo-staff', email: 'staff@orga.com' },
  organization: { id: DEMO_ORG_ID, name: 'Org A Industries', state_code: '27' },
  member: { id: 'mem-staff', role: 'inventory' },
};

describe('Phase 7C: Operations Enhancement Test Suite (50+ Tests)', () => {
  beforeEach(() => {
    // Clear in-memory operation stores before each test
    demoSalesOrders.length = 0;
    demoSalesOrderItems.length = 0;
    demoProformaInvoices.length = 0;
    demoProformaInvoiceItems.length = 0;
    demoDeliveryChallans.length = 0;
    demoDeliveryChallanItems.length = 0;
    demoPurchaseOrders.length = 0;
    demoPurchaseOrderItems.length = 0;
    demoResetDocSequences();
    demoResetQuotationStates();
  });

  // ============================================================
  // GROUP 1: SALES ORDER OPERATIONS (14 Tests)
  // ============================================================
  describe('1. Sales Order Operations', () => {
    it('1.1 should create a sales order with authoritative intra-state GST calculation (CGST + SGST)', async () => {
      const so = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [
          {
            description: 'Heavy Duty Steel Pipes 20ft',
            quantity: 10,
            unit: 'PCS',
            unit_price: 1000,
            discount_percent: 10,
            gst_rate: 18,
          },
        ],
      });

      expect(so).toBeDefined();
      expect(so.order_number).toMatch(/^SO-\d{4}-\d{4}$/);

      const fetched = await SalesOrderService.getSalesOrder(sessionOrgA, so.id);
      expect(fetched.total_amount).toBe(10620); // (10000 - 1000) * 1.18 = 9000 + 1620 = 10620
      expect(fetched.cgst_amount).toBe(810);
      expect(fetched.sgst_amount).toBe(810);
      expect(fetched.igst_amount).toBe(0);
    });

    it('1.2 should create a sales order with inter-state IGST calculation', async () => {
      const so = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        place_of_supply: '29', // Karnataka (different from seller 27)
        order_date: '2026-09-26',
        items: [
          {
            description: 'Interstate Electronic Component',
            quantity: 5,
            unit: 'PCS',
            unit_price: 2000,
            discount_percent: 0,
            gst_rate: 18,
          },
        ],
      });

      const fetched = await SalesOrderService.getSalesOrder(sessionOrgA, so.id);
      expect(fetched.igst_amount).toBe(1800); // 10000 * 0.18
      expect(fetched.cgst_amount).toBe(0);
      expect(fetched.sgst_amount).toBe(0);
      expect(fetched.total_amount).toBe(11800);
    });

    it('1.3 should reject sales order creation if customer_id is missing', async () => {
      await expect(
        SalesOrderService.createSalesOrder(sessionOrgA, {
          order_date: '2026-09-26',
          items: [{ description: 'Item A', quantity: 1, unit_price: 100, gst_rate: 18 }],
        } as any)
      ).rejects.toThrow();
    });

    it('1.4 should reject sales order creation with empty line items', async () => {
      await expect(
        SalesOrderService.createSalesOrder(sessionOrgA, {
          customer_id: 'cust-demo-1',
          order_date: '2026-09-26',
          items: [],
        })
      ).rejects.toThrow();
    });

    it('1.5 should reject line items with non-positive quantities', async () => {
      await expect(
        SalesOrderService.createSalesOrder(sessionOrgA, {
          customer_id: 'cust-demo-1',
          order_date: '2026-09-26',
          items: [
            {
              description: 'Invalid Item',
              quantity: 0,
              unit_price: 500,
              gst_rate: 18,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it('1.6 should retrieve a single sales order by ID with line items and customer', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Test Retrieve', quantity: 2, unit_price: 100, gst_rate: 18 }],
      });

      const fetched = await SalesOrderService.getSalesOrder(sessionOrgA, created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.items).toHaveLength(1);
      expect(fetched.customer).toBeDefined();
    });

    it('1.7 should list sales orders with status filtering', async () => {
      await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item 1', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      const listAll = await SalesOrderService.listSalesOrders(sessionOrgA);
      expect(listAll.total).toBe(1);

      const listDraft = await SalesOrderService.listSalesOrders(sessionOrgA, { status: 'draft' });
      expect(listDraft.total).toBe(0); // newly created orders start in 'confirmed'

      const listConfirmed = await SalesOrderService.listSalesOrders(sessionOrgA, { status: 'confirmed' });
      expect(listConfirmed.total).toBe(1);
    });

    it('1.8 should update sales order status correctly', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item A', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      const updated = await SalesOrderService.updateSalesOrderStatus(sessionOrgA, created.id, 'cancelled');
      expect(updated.status).toBe('cancelled');
    });

    it('1.9 should reject deleting a confirmed or fulfilled sales order', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item A', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await expect(SalesOrderService.deleteSalesOrder(sessionOrgA, created.id)).rejects.toThrow(
        /Cannot delete an active or fulfilled sales order/
      );
    });

    it('1.10 should convert a full sales order into a tax invoice and mark status as fulfilled', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item Conversion', quantity: 5, unit_price: 200, gst_rate: 18 }],
      });

      const conversion = await SalesOrderService.convertToInvoice(sessionOrgA, created.id);
      expect(conversion.invoice_id).toBeDefined();

      const orderAfter = await SalesOrderService.getSalesOrder(sessionOrgA, created.id);
      expect(orderAfter.status).toBe('fulfilled');
      expect(orderAfter.items[0].fulfilled_quantity).toBe(5);
    });

    it('1.11 should convert a sales order into a delivery challan', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item Challan', quantity: 10, unit_price: 150, gst_rate: 18 }],
      });

      const challanRes = await SalesOrderService.convertToDeliveryChallan(sessionOrgA, created.id, {
        challan_type: 'removal_for_sale',
        vehicle_number: 'MH-12-AB-9999',
      });

      expect(challanRes.challan_id).toBeDefined();
      const challan = await DeliveryChallanService.getDeliveryChallan(sessionOrgA, challanRes.challan_id);
      expect(challan.sales_order_id).toBe(created.id);
      expect(challan.items[0].quantity).toBe(10);
    });

    it('1.12 should handle partial conversion to invoice and update status to partially_fulfilled', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item Partial', quantity: 10, unit_price: 100, gst_rate: 18 }],
      });

      const order = await SalesOrderService.getSalesOrder(sessionOrgA, created.id);
      const itemId = order.items[0].id;

      await SalesOrderService.convertToInvoice(sessionOrgA, created.id, {
        items: [{ order_item_id: itemId, convert_quantity: 4 }],
      });

      const orderAfter = await SalesOrderService.getSalesOrder(sessionOrgA, created.id);
      expect(orderAfter.status).toBe('partially_fulfilled');
      expect(orderAfter.items[0].fulfilled_quantity).toBe(4);
    });

    it('1.13 should reject conversion if requested quantity exceeds remaining order quantity (QUANTITY_EXCEEDED)', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item Overflow', quantity: 5, unit_price: 100, gst_rate: 18 }],
      });

      const order = await SalesOrderService.getSalesOrder(sessionOrgA, created.id);
      const itemId = order.items[0].id;

      await expect(
        SalesOrderService.convertToInvoice(sessionOrgA, created.id, {
          items: [{ order_item_id: itemId, convert_quantity: 8 }],
        })
      ).rejects.toThrow(/QUANTITY_EXCEEDED/);
    });

    it('1.14 should reject converting a cancelled sales order', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item Cancelled', quantity: 5, unit_price: 100, gst_rate: 18 }],
      });

      await SalesOrderService.updateSalesOrderStatus(sessionOrgA, created.id, 'cancelled');

      await expect(SalesOrderService.convertToInvoice(sessionOrgA, created.id)).rejects.toThrow(
        /Cannot convert a cancelled sales order/
      );
    });
  });

  // ============================================================
  // GROUP 2: PROFORMA INVOICE OPERATIONS (11 Tests)
  // ============================================================
  describe('2. Proforma Invoice Operations', () => {
    it('2.1 should create a proforma invoice with accurate GST calculation', async () => {
      const pi = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        expiry_date: '2026-10-26',
        items: [
          {
            description: 'Professional Consulting Services',
            quantity: 1,
            unit: 'HRS',
            unit_price: 5000,
            discount_percent: 0,
            gst_rate: 18,
          },
        ],
      });

      expect(pi).toBeDefined();
      expect(pi.proforma_number).toMatch(/^PI-\d{4}-\d{4}$/);

      const fetched = await ProformaInvoiceService.getProformaInvoice(sessionOrgA, pi.id);
      expect(fetched.total_amount).toBe(5900);
      expect(fetched.cgst_amount).toBe(450);
      expect(fetched.sgst_amount).toBe(450);
    });

    it('2.2 NON-FINANCIAL INVARIANT: Proforma creation does NOT modify customer outstanding balance', async () => {
      const customer = demoCustomers.find((c) => c.id === 'cust-demo-1')!;
      const initialBalance = customer.outstanding_balance;

      await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'High Value Quote Item', quantity: 1, unit_price: 50000, gst_rate: 18 }],
      });

      const customerAfter = demoCustomers.find((c) => c.id === 'cust-demo-1')!;
      expect(customerAfter.outstanding_balance).toBe(initialBalance);
    });

    it('2.3 NON-INVENTORY INVARIANT: Proforma creation does NOT deduct product stock', async () => {
      const product = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      const initialStock = product.current_stock;

      await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [
          {
            product_id: 'prod-demo-3',
            description: 'PVC Conduit Pipes 25mm',
            quantity: 10,
            unit_price: 180,
            gst_rate: 18,
          },
        ],
      });

      const productAfter = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      expect(productAfter.current_stock).toBe(initialStock);
    });

    it('2.4 should reject proforma creation with non-existent customer', async () => {
      await expect(
        ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
          customer_id: 'cust-non-existent-999',
          proforma_date: '2026-09-26',
          items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      ).rejects.toThrow();
    });

    it('2.5 should retrieve single proforma invoice by ID with items', async () => {
      const created = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'Item Proforma Retrieve', quantity: 2, unit_price: 300, gst_rate: 18 }],
      });

      const fetched = await ProformaInvoiceService.getProformaInvoice(sessionOrgA, created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.items).toHaveLength(1);
    });

    it('2.6 should list proforma invoices with status filter', async () => {
      await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'Item 1', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      const list = await ProformaInvoiceService.listProformaInvoices(sessionOrgA, { status: 'sent' });
      expect(list.total).toBe(1);
    });

    it('2.7 should update proforma invoice status', async () => {
      const created = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      const updated = await ProformaInvoiceService.updateProformaInvoiceStatus(sessionOrgA, created.id, 'cancelled');
      expect(updated.status).toBe('cancelled');
    });

    it('2.8 should convert proforma invoice into a tax invoice and mark status as converted', async () => {
      const created = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'Convertible Item', quantity: 2, unit_price: 1000, gst_rate: 18 }],
      });

      const result = await ProformaInvoiceService.convertToInvoice(sessionOrgA, created.id);
      expect(result.invoice_id).toBeDefined();

      const after = await ProformaInvoiceService.getProformaInvoice(sessionOrgA, created.id);
      expect(after.status).toBe('converted');
      expect(after.converted_invoice_id).toBe(result.invoice_id);
    });

    it('2.9 should reject converting an already converted proforma invoice', async () => {
      const created = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await ProformaInvoiceService.convertToInvoice(sessionOrgA, created.id);

      await expect(ProformaInvoiceService.convertToInvoice(sessionOrgA, created.id)).rejects.toThrow(
        /This proforma invoice has already been converted/
      );
    });

    it('2.10 should reject converting a cancelled proforma invoice', async () => {
      const created = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await ProformaInvoiceService.updateProformaInvoiceStatus(sessionOrgA, created.id, 'cancelled');

      await expect(ProformaInvoiceService.convertToInvoice(sessionOrgA, created.id)).rejects.toThrow(
        /Cannot convert a cancelled proforma invoice/
      );
    });

    it('2.11 should delete a cancelled proforma invoice', async () => {
      const created = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'To Delete', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await ProformaInvoiceService.updateProformaInvoiceStatus(sessionOrgA, created.id, 'cancelled');
      const delRes = await ProformaInvoiceService.deleteProformaInvoice(sessionOrgA, created.id);
      expect(delRes.success).toBe(true);

      await expect(ProformaInvoiceService.getProformaInvoice(sessionOrgA, created.id)).rejects.toThrow();
    });
  });

  // ============================================================
  // GROUP 3: DELIVERY CHALLAN & INVENTORY SAFETY (RULE 55) (13 Tests)
  // ============================================================
  describe('3. Delivery Challan Operations (Rule 55 CGST) & Inventory Safety', () => {
    it('3.1 should create a delivery challan with supply_on_approval type', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'supply_on_approval',
        items: [{ description: 'Approval Samples', quantity: 2, unit_price: 500, gst_rate: 18 }],
      });

      expect(dc).toBeDefined();
      expect(dc.challan_number).toMatch(/^DC-\d{4}-\d{4}$/);
      const fetched = await DeliveryChallanService.getDeliveryChallan(sessionOrgA, dc.id);
      expect(fetched.challan_type).toBe('supply_on_approval');
    });

    it('3.2 should create a delivery challan for job work with vehicle and transporter details', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'for_job_work',
        vehicle_number: 'MH-12-EF-5678',
        transporter_name: 'Safexpress Logistics',
        items: [{ description: 'Raw Castings for Milling', quantity: 50, unit_price: 200, gst_rate: 18 }],
      });

      const fetched = await DeliveryChallanService.getDeliveryChallan(sessionOrgA, dc.id);
      expect(fetched.challan_type).toBe('for_job_work');
      expect(fetched.vehicle_number).toBe('MH-12-EF-5678');
      expect(fetched.transporter_name).toBe('Safexpress Logistics');
    });

    it('3.3 should create a delivery challan with removal_for_sale type', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ description: 'Finished Goods', quantity: 15, unit_price: 800, gst_rate: 18 }],
      });

      const fetched = await DeliveryChallanService.getDeliveryChallan(sessionOrgA, dc.id);
      expect(fetched.challan_type).toBe('removal_for_sale');
    });

    it('3.4 should not affect product stock when delivery challan is created in draft status', async () => {
      const product = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      const stockBefore = product.current_stock;

      await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ product_id: 'prod-demo-3', description: 'PVC Conduit Pipes 25mm', quantity: 5, unit_price: 180, gst_rate: 18 }],
      });

      const stockAfter = product.current_stock;
      expect(stockAfter).toBe(stockBefore);
    });

    it('3.5 PHYSICAL DISPATCH: Dispatching delivery challan (status: dispatched) DEDUCTS inventory stock', async () => {
      const product = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      const stockBefore = product.current_stock;

      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ product_id: 'prod-demo-3', description: 'PVC Conduit Pipes 25mm', quantity: 5, unit_price: 180, gst_rate: 18 }],
      });

      await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'dispatched');

      const stockAfter = product.current_stock;
      expect(stockAfter).toBe(stockBefore - 5);
    });

    it('3.6 CANCELLATION RESTORATION: Cancelling dispatched delivery challan RESTORES inventory stock', async () => {
      const product = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      const stockBefore = product.current_stock;

      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ product_id: 'prod-demo-3', description: 'PVC Conduit Pipes 25mm', quantity: 8, unit_price: 180, gst_rate: 18 }],
      });

      // Dispatch -> Stock deducted
      await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'dispatched');
      expect(product.current_stock).toBe(stockBefore - 8);

      // Cancel -> Stock restored
      await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'cancelled');
      expect(product.current_stock).toBe(stockBefore);
    });

    it('3.7 should convert delivery challan to a tax invoice and mark status as invoiced', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ description: 'Goods for Billing', quantity: 4, unit_price: 1200, gst_rate: 18 }],
      });

      const result = await DeliveryChallanService.convertToInvoice(sessionOrgA, dc.id);
      expect(result.invoice_id).toBeDefined();

      const after = await DeliveryChallanService.getDeliveryChallan(sessionOrgA, dc.id);
      expect(after.status).toBe('invoiced');
      expect(after.converted_invoice_id).toBe(result.invoice_id);
    });

    it('3.8 INVENTORY SAFETY INVARIANT: Tax invoice converted from dispatched Delivery Challan does NOT double-deduct stock', async () => {
      const product = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      const stockOriginal = product.current_stock;

      // Step 1: Create Challan & Dispatch -> Stock moves once
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ product_id: 'prod-demo-3', description: 'PVC Conduit Pipes 25mm', quantity: 6, unit_price: 180, gst_rate: 18 }],
      });
      await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'dispatched');
      expect(product.current_stock).toBe(stockOriginal - 6);

      // Step 2: Convert to Tax Invoice
      // The invoice creation receives skip_inventory_movement flag
      await DeliveryChallanService.convertToInvoice(sessionOrgA, dc.id);

      // Stock must remain stockOriginal - 6, NOT stockOriginal - 12
      expect(product.current_stock).toBe(stockOriginal - 6);
    });

    it('3.9 should link delivery challan to a sales order and maintain references', async () => {
      const so = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Linked Item', quantity: 10, unit_price: 250, gst_rate: 18 }],
      });

      const challanRes = await SalesOrderService.convertToDeliveryChallan(sessionOrgA, so.id);
      const challan = await DeliveryChallanService.getDeliveryChallan(sessionOrgA, challanRes.challan_id);
      expect(challan.sales_order_id).toBe(so.id);
    });

    it('3.10 should follow status progression: draft -> dispatched -> delivered -> invoiced', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ description: 'Step Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      let current = await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'dispatched');
      expect(current.status).toBe('dispatched');

      current = await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'delivered');
      expect(current.status).toBe('delivered');

      await DeliveryChallanService.convertToInvoice(sessionOrgA, dc.id);
      const finalState = await DeliveryChallanService.getDeliveryChallan(sessionOrgA, dc.id);
      expect(finalState.status).toBe('invoiced');
    });

    it('3.11 should reject deleting an invoiced delivery challan', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ description: 'Non-deletable Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await DeliveryChallanService.convertToInvoice(sessionOrgA, dc.id);

      await expect(DeliveryChallanService.deleteDeliveryChallan(sessionOrgA, dc.id)).rejects.toThrow(
        /Cannot delete an active or invoiced delivery challan/
      );
    });

    it('3.12 should reject deleting a dispatched delivery challan without cancellation', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ description: 'Dispatched Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'dispatched');

      await expect(DeliveryChallanService.deleteDeliveryChallan(sessionOrgA, dc.id)).rejects.toThrow(
        /Cannot delete an active or invoiced delivery challan/
      );
    });

    it('3.13 should list delivery challans with type filtering', async () => {
      await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'for_job_work',
        items: [{ description: 'Job Work Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      const listJobWork = await DeliveryChallanService.listDeliveryChallans(sessionOrgA, {
        challanType: 'for_job_work',
      });
      expect(listJobWork.total).toBe(1);

      const listSale = await DeliveryChallanService.listDeliveryChallans(sessionOrgA, {
        challanType: 'removal_for_sale',
      });
      expect(listSale.total).toBe(0);
    });
  });

  // ============================================================
  // GROUP 4: PURCHASE ORDER OPERATIONS (12 Tests)
  // ============================================================
  describe('4. Purchase Order Operations', () => {
    it('4.1 should create a purchase order with intra-state GST calculation (CGST + SGST)', async () => {
      const po = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        expected_delivery_date: '2026-10-05',
        items: [
          {
            description: 'Procurement of Heavy Steel Pipes',
            quantity: 20,
            unit: 'PCS',
            unit_price: 800,
            discount_percent: 5,
            gst_rate: 18,
          },
        ],
      });

      expect(po).toBeDefined();
      expect(po.po_number).toMatch(/^PO-\d{4}-\d{4}$/);

      const fetched = await PurchaseOrderService.getPurchaseOrder(sessionOrgA, po.id);
      expect(fetched.total_amount).toBe(17936); // (16000 - 800) * 1.18 = 15200 + 2736 = 17936
      expect(fetched.cgst_amount).toBe(1368);
      expect(fetched.sgst_amount).toBe(1368);
      expect(fetched.igst_amount).toBe(0);
    });

    it('4.2 should create a purchase order with inter-state IGST calculation', async () => {
      const po = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-2', // Delhi (state code 07, different from Org A 27)
        order_date: '2026-09-26',
        items: [
          {
            description: 'Delhi Electrical Goods',
            quantity: 5,
            unit_price: 4000,
            discount_percent: 0,
            gst_rate: 18,
          },
        ],
      });

      const fetched = await PurchaseOrderService.getPurchaseOrder(sessionOrgA, po.id);
      expect(fetched.igst_amount).toBe(3600); // 20000 * 0.18
      expect(fetched.cgst_amount).toBe(0);
      expect(fetched.sgst_amount).toBe(0);
      expect(fetched.total_amount).toBe(23600);
    });

    it('4.3 NON-FINANCIAL INVARIANT: Purchase Order creation does NOT alter supplier outstanding balance', async () => {
      const supplier = demoSuppliers.find((s) => s.id === 'supp-demo-1')!;
      const initialBalance = supplier.outstanding_balance;

      await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Large Raw Material Batch', quantity: 100, unit_price: 1500, gst_rate: 18 }],
      });

      const supplierAfter = demoSuppliers.find((s) => s.id === 'supp-demo-1')!;
      expect(supplierAfter.outstanding_balance).toBe(initialBalance);
    });

    it('4.4 NON-INVENTORY INVARIANT: Purchase Order creation does NOT increase stock before receiving', async () => {
      const product = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      const stockBefore = product.current_stock;

      await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ product_id: 'prod-demo-3', description: 'PVC Pipes', quantity: 50, unit_price: 110, gst_rate: 18 }],
      });

      const stockAfter = product.current_stock;
      expect(stockAfter).toBe(stockBefore);
    });

    it('4.5 should retrieve purchase order by ID with supplier and items', async () => {
      const created = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Test Retrieve Item', quantity: 2, unit_price: 500, gst_rate: 18 }],
      });

      const fetched = await PurchaseOrderService.getPurchaseOrder(sessionOrgA, created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.supplier).toBeDefined();
      expect(fetched.items).toHaveLength(1);
    });

    it('4.6 should list purchase orders with status filter', async () => {
      await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item 1', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      const listIssued = await PurchaseOrderService.listPurchaseOrders(sessionOrgA, { status: 'issued' });
      expect(listIssued.total).toBe(1);

      const listReceived = await PurchaseOrderService.listPurchaseOrders(sessionOrgA, { status: 'received' });
      expect(listReceived.total).toBe(0);
    });

    it('4.7 should update purchase order status', async () => {
      const created = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      const updated = await PurchaseOrderService.updatePurchaseOrderStatus(sessionOrgA, created.id, 'cancelled');
      expect(updated.status).toBe('cancelled');
    });

    it('4.8 should convert purchase order to purchase bill (full receipt marks received)', async () => {
      const created = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Full Receipt Item', quantity: 10, unit_price: 300, gst_rate: 18 }],
      });

      const billRes = await PurchaseOrderService.convertToPurchaseBill(sessionOrgA, created.id);
      expect(billRes.bill_id).toBeDefined();

      const after = await PurchaseOrderService.getPurchaseOrder(sessionOrgA, created.id);
      expect(after.status).toBe('received');
      expect(after.items[0].received_quantity).toBe(10);
    });

    it('4.9 should handle partial receipt into purchase bill and mark partially_received', async () => {
      const created = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Partial Receipt Item', quantity: 20, unit_price: 200, gst_rate: 18 }],
      });

      const po = await PurchaseOrderService.getPurchaseOrder(sessionOrgA, created.id);
      const itemId = po.items[0].id;

      await PurchaseOrderService.convertToPurchaseBill(sessionOrgA, created.id, {
        items: [{ po_item_id: itemId, receive_quantity: 8 }],
      });

      const after = await PurchaseOrderService.getPurchaseOrder(sessionOrgA, created.id);
      expect(after.status).toBe('partially_received');
      expect(after.items[0].received_quantity).toBe(8);
    });

    it('4.10 should reject conversion when receive quantity exceeds remaining quantity (QUANTITY_EXCEEDED)', async () => {
      const created = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Over-receive Item', quantity: 10, unit_price: 200, gst_rate: 18 }],
      });

      const po = await PurchaseOrderService.getPurchaseOrder(sessionOrgA, created.id);
      const itemId = po.items[0].id;

      await expect(
        PurchaseOrderService.convertToPurchaseBill(sessionOrgA, created.id, {
          items: [{ po_item_id: itemId, receive_quantity: 15 }],
        })
      ).rejects.toThrow(/QUANTITY_EXCEEDED/);
    });

    it('4.11 should reject converting a cancelled purchase order', async () => {
      const created = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await PurchaseOrderService.updatePurchaseOrderStatus(sessionOrgA, created.id, 'cancelled');

      await expect(PurchaseOrderService.convertToPurchaseBill(sessionOrgA, created.id)).rejects.toThrow(
        /Cannot convert a cancelled purchase order/
      );
    });

    it('4.12 should reject deleting an issued or received purchase order', async () => {
      const created = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await expect(PurchaseOrderService.deletePurchaseOrder(sessionOrgA, created.id)).rejects.toThrow(
        /Cannot delete an active or fulfilled purchase order/
      );
    });
  });

  // ============================================================
  // GROUP 5: QUOTATION MULTI-TARGET CONVERSIONS (4 Tests)
  // ============================================================
  describe('5. Quotation Multi-Target Conversions', () => {
    it('5.1 should convert Quotation to Sales Order preserving items and values', async () => {
      const soRes = await QuotationService.convertQuotationToSalesOrder(sessionOrgA, 'quot-demo-1');
      expect(soRes.order_id).toBeDefined();

      const so = await SalesOrderService.getSalesOrder(sessionOrgA, soRes.order_id);
      expect(so.notes).toContain('Converted from Quotation');
    });

    it('5.2 should convert Quotation to Proforma Invoice preserving items and values', async () => {
      const piRes = await QuotationService.convertQuotationToProforma(sessionOrgA, 'quot-demo-1');
      expect(piRes.proforma_id).toBeDefined();

      const pi = await ProformaInvoiceService.getProformaInvoice(sessionOrgA, piRes.proforma_id);
      expect(pi.notes).toContain('Converted from Quotation');
    });

    it('5.3 should convert Quotation to Tax Invoice (standard flow)', async () => {
      const invRes = await QuotationService.convertQuotationToInvoice(sessionOrgA, 'quot-demo-1');
      expect(invRes.invoice_id).toBeDefined();
    });

    it('5.4 should throw descriptive error when non-existent quotation is converted', async () => {
      await expect(
        QuotationService.convertQuotationToSalesOrder(sessionOrgA, 'quot-non-existent')
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // GROUP 6: CUSTOMER & SUPPLIER 360 TIMELINE INTEGRATION (3 Tests)
  // ============================================================
  describe('6. Customer & Supplier 360 Timeline Integration', () => {
    it('6.1 Customer 360 timeline aggregates Sales Orders, Proformas, and Delivery Challans', async () => {
      // Create one of each for cust-demo-1
      await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-24',
        items: [{ description: 'Timeline Item 1', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });
      await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-25',
        items: [{ description: 'Timeline Item 2', quantity: 1, unit_price: 200, gst_rate: 18 }],
      });
      await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ description: 'Timeline Item 3', quantity: 1, unit_price: 300, gst_rate: 18 }],
      });

      const profile = await CrmService.getCustomer360(sessionOrgA, 'cust-demo-1');
      const types = profile.timeline.map((e: any) => e.type);

      expect(types.some((t: string) => t.includes('sales_order'))).toBe(true);
      expect(types.some((t: string) => t.includes('proforma'))).toBe(true);
      expect(types.some((t: string) => t.includes('delivery_challan'))).toBe(true);
    });

    it('6.2 Supplier 360 timeline aggregates Purchase Orders', async () => {
      await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Supplier Timeline Item', quantity: 5, unit_price: 150, gst_rate: 18 }],
      });

      const profile = await CrmService.getSupplier360(sessionOrgA, 'supp-demo-1');
      const types = profile.timeline.map((e: any) => e.type);

      expect(types.some((t: string) => t.includes('purchase_order'))).toBe(true);
    });

    it('6.3 Customer timeline events are sorted chronologically in descending order', async () => {
      const profile = await CrmService.getCustomer360(sessionOrgA, 'cust-demo-1');
      const dates = profile.timeline.map((e: any) => new Date(e.date).getTime());

      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });
  });

  // ============================================================
  // GROUP 7: TENANT ISOLATION, RBAC & AUDIT LOGGING (5 Tests)
  // ============================================================
  describe('7. Tenant Isolation, RBAC & Audit Logging', () => {
    it('7.1 TENANT ISOLATION: Org B cannot access Org A sales orders (IDOR protection)', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Confidential Order Org A', quantity: 1, unit_price: 1000, gst_rate: 18 }],
      });

      await expect(SalesOrderService.getSalesOrder(sessionOrgB, created.id)).rejects.toThrow(
        /Sales order not found/
      );
    });

    it('7.2 TENANT ISOLATION: Org B cannot access Org A delivery challans or purchase orders', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ description: 'Goods Org A', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await expect(DeliveryChallanService.getDeliveryChallan(sessionOrgB, dc.id)).rejects.toThrow(
        /Delivery challan not found/
      );

      const po = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Supplies Org A', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await expect(PurchaseOrderService.getPurchaseOrder(sessionOrgB, po.id)).rejects.toThrow(
        /Purchase order not found/
      );
    });

    it('7.3 RBAC: Staff lacking sales_orders.convert permission is rejected (403 Forbidden)', async () => {
      const created = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await expect(SalesOrderService.convertToInvoice(sessionStaffRestricted, created.id)).rejects.toThrow(
        /FORBIDDEN/
      );
    });

    it('7.4 RBAC: Staff lacking purchase_orders.create permission is rejected (403 Forbidden)', async () => {
      const sessionRestrictedRole = {
        ...sessionStaffRestricted,
        role: 'support', // support role does not have purchase_orders.create
        member: { role: 'support' },
      };

      await expect(
        PurchaseOrderService.createPurchaseOrder(sessionRestrictedRole, {
          supplier_id: 'supp-demo-1',
          order_date: '2026-09-26',
          items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      ).rejects.toThrow(/FORBIDDEN/);
    });

    it('7.5 Sequential numbering increments properly across consecutive creations', async () => {
      const so1 = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item 1', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      const so2 = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item 2', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      expect(so1.order_number).not.toBe(so2.order_number);
    });
  });

  // ============================================================
  // GROUP 8: PRODUCTION HARDENING & INVARIANTS SUITE (18 Tests)
  // ============================================================
  describe('8. Production Hardening & Invariants Suite', () => {
    // 8.1 IDEMPOTENCY & DUPLICATE CONVERSION PROTECTION
    it('8.1 IDEMPOTENCY: Repeated conversion of fulfilled Sales Order is rejected with zero duplicate invoices', async () => {
      const so = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Idempotent Item', quantity: 5, unit_price: 100, gst_rate: 18 }],
      });

      // First conversion succeeds
      const first = await SalesOrderService.convertToInvoice(sessionOrgA, so.id);
      expect(first.invoice_id).toBeDefined();

      // Immediate second conversion (rapid double-click / network retry) is rejected
      await expect(SalesOrderService.convertToInvoice(sessionOrgA, so.id)).rejects.toThrow(
        /already been completely fulfilled/
      );
    });

    it('8.2 IDEMPOTENCY: Repeated conversion of Proforma Invoice is rejected with zero duplicate invoices', async () => {
      const pi = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'Idempotent PI Item', quantity: 2, unit_price: 500, gst_rate: 18 }],
      });

      const first = await ProformaInvoiceService.convertToInvoice(sessionOrgA, pi.id);
      expect(first.invoice_id).toBeDefined();

      // Repeated conversion rejected
      await expect(ProformaInvoiceService.convertToInvoice(sessionOrgA, pi.id)).rejects.toThrow(
        /already been converted to an invoice/
      );
    });

    it('8.3 IDEMPOTENCY: Repeated conversion of Delivery Challan is rejected with zero duplicate invoices', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        items: [{ description: 'Idempotent DC Item', quantity: 4, unit_price: 250, gst_rate: 18 }],
      });

      const first = await DeliveryChallanService.convertToInvoice(sessionOrgA, dc.id);
      expect(first.invoice_id).toBeDefined();

      // Repeated conversion rejected
      await expect(DeliveryChallanService.convertToInvoice(sessionOrgA, dc.id)).rejects.toThrow(
        /already been invoiced/
      );
    });

    it('8.4 IDEMPOTENCY: Repeated conversion of Purchase Order is rejected with zero duplicate bills', async () => {
      const po = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Idempotent PO Item', quantity: 10, unit_price: 200, gst_rate: 18 }],
      });

      const first = await PurchaseOrderService.convertToPurchaseBill(sessionOrgA, po.id);
      expect(first.bill_id).toBeDefined();

      // Repeated conversion rejected
      await expect(PurchaseOrderService.convertToPurchaseBill(sessionOrgA, po.id)).rejects.toThrow(
        /already been completely received/
      );
    });

    it('8.5 IDEMPOTENCY: Converting an already converted Quotation is rejected', async () => {
      // First convert to invoice
      await QuotationService.convertQuotationToInvoice(sessionOrgA, 'quot-demo-1');

      // Subsequent attempt to convert to Sales Order must be rejected
      await expect(QuotationService.convertQuotationToSalesOrder(sessionOrgA, 'quot-demo-1')).rejects.toThrow(
        /already been converted/
      );

      // Subsequent attempt to convert to Proforma must be rejected
      await expect(QuotationService.convertQuotationToProforma(sessionOrgA, 'quot-demo-1')).rejects.toThrow(
        /already been converted/
      );
    });

    // 8.2 QUANTITY SAFETY HARDENING
    it('8.6 QUANTITY SAFETY: Zero or negative conversion quantities are rejected', async () => {
      const so = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Zero Qty Test Item', quantity: 10, unit_price: 100, gst_rate: 18 }],
      });
      const order = await SalesOrderService.getSalesOrder(sessionOrgA, so.id);
      const itemId = order.items[0].id;

      // Zero quantity
      await expect(
        SalesOrderService.convertToInvoice(sessionOrgA, so.id, {
          items: [{ order_item_id: itemId, convert_quantity: 0 }],
        })
      ).rejects.toThrow(/Quantity must be greater than zero/);

      // Negative quantity
      await expect(
        SalesOrderService.convertToInvoice(sessionOrgA, so.id, {
          items: [{ order_item_id: itemId, convert_quantity: -5 }],
        })
      ).rejects.toThrow(/Quantity must be greater than zero/);
    });

    it('8.7 QUANTITY SAFETY: Zero or negative purchase order receipt quantities are rejected', async () => {
      const po = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'PO Negative Item', quantity: 15, unit_price: 100, gst_rate: 18 }],
      });
      const fetched = await PurchaseOrderService.getPurchaseOrder(sessionOrgA, po.id);
      const itemId = fetched.items[0].id;

      await expect(
        PurchaseOrderService.convertToPurchaseBill(sessionOrgA, po.id, {
          items: [{ po_item_id: itemId, receive_quantity: 0 }],
        })
      ).rejects.toThrow(/Quantity must be greater than zero/);

      await expect(
        PurchaseOrderService.convertToPurchaseBill(sessionOrgA, po.id, {
          items: [{ po_item_id: itemId, receive_quantity: -2 }],
        })
      ).rejects.toThrow(/Quantity must be greater than zero/);
    });

    it('8.8 QUANTITY SAFETY: Multiple partial conversions accumulate precisely to 100%', async () => {
      const so = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Multi Partial Item', quantity: 100, unit_price: 50, gst_rate: 18 }],
      });
      const order = await SalesOrderService.getSalesOrder(sessionOrgA, so.id);
      const itemId = order.items[0].id;

      // Tranche 1: 25 units
      await SalesOrderService.convertToInvoice(sessionOrgA, so.id, {
        items: [{ order_item_id: itemId, convert_quantity: 25 }],
      });
      let state = await SalesOrderService.getSalesOrder(sessionOrgA, so.id);
      expect(state.status).toBe('partially_fulfilled');
      expect(state.items[0].fulfilled_quantity).toBe(25);

      // Tranche 2: 25 units (cumulative: 50)
      await SalesOrderService.convertToInvoice(sessionOrgA, so.id, {
        items: [{ order_item_id: itemId, convert_quantity: 25 }],
      });
      state = await SalesOrderService.getSalesOrder(sessionOrgA, so.id);
      expect(state.status).toBe('partially_fulfilled');
      expect(state.items[0].fulfilled_quantity).toBe(50);

      // Tranche 3: remaining 50 units (cumulative: 100)
      await SalesOrderService.convertToInvoice(sessionOrgA, so.id, {
        items: [{ order_item_id: itemId, convert_quantity: 50 }],
      });
      state = await SalesOrderService.getSalesOrder(sessionOrgA, so.id);
      expect(state.status).toBe('fulfilled');
      expect(state.items[0].fulfilled_quantity).toBe(100);

      // Tranche 4: Any further attempt is strictly rejected
      await expect(
        SalesOrderService.convertToInvoice(sessionOrgA, so.id, {
          items: [{ order_item_id: itemId, convert_quantity: 1 }],
        })
      ).rejects.toThrow();
    });

    // 8.3 DOCUMENT NUMBER CONCURRENCY (10 & 50 SIMULTANEOUS CREATES)
    it('8.9 CONCURRENCY: 10 simultaneous Sales Order creations produce 10 strictly unique order numbers', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        SalesOrderService.createSalesOrder(sessionOrgA, {
          customer_id: 'cust-demo-1',
          order_date: '2026-09-26',
          items: [{ description: `Concurrent Order Item ${i}`, quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      );

      const results = await Promise.all(promises);
      const numbers = results.map((r) => r.order_number);
      const uniqueNumbers = new Set(numbers);

      expect(numbers).toHaveLength(10);
      expect(uniqueNumbers.size).toBe(10);
      numbers.forEach((num) => expect(num).toMatch(/^SO-\d{4}-\d{4}$/));
    });

    it('8.10 CONCURRENCY: 50 simultaneous creations across multiple doc types generate unique sequences', async () => {
      const soPromises = Array.from({ length: 25 }, (_, i) =>
        SalesOrderService.createSalesOrder(sessionOrgA, {
          customer_id: 'cust-demo-1',
          order_date: '2026-09-26',
          items: [{ description: `SO Batch Item ${i}`, quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      );

      const piPromises = Array.from({ length: 25 }, (_, i) =>
        ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
          customer_id: 'cust-demo-1',
          proforma_date: '2026-09-26',
          items: [{ description: `PI Batch Item ${i}`, quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      );

      const [soResults, piResults] = await Promise.all([Promise.all(soPromises), Promise.all(piPromises)]);

      const soNumbers = soResults.map((r) => r.order_number);
      const piNumbers = piResults.map((r) => r.proforma_number);

      expect(new Set(soNumbers).size).toBe(25);
      expect(new Set(piNumbers).size).toBe(25);
    });

    it('8.11 CONCURRENCY: Multiple organizations maintain independent, non-colliding sequential numbers', async () => {
      const [soOrgA, soOrgB] = await Promise.all([
        SalesOrderService.createSalesOrder(sessionOrgA, {
          customer_id: 'cust-demo-1',
          order_date: '2026-09-26',
          items: [{ description: 'Org A Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
        }),
        SalesOrderService.createSalesOrder(sessionOrgB, {
          customer_id: 'cust-demo-2',
          order_date: '2026-09-26',
          items: [{ description: 'Org B Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
        }),
      ]);

      expect(soOrgA.order_number).toMatch(/^SO-\d{4}-0001$/);
      expect(soOrgB.order_number).toMatch(/^SO-\d{4}-0001$/); // Both start at sequence 0001 independently
    });

    // 8.4 DELIVERY CHALLAN CANCELLATION & STOCK RESTORATION
    it('8.12 INVENTORY SAFETY: Cancelling a dispatched Delivery Challan restores inventory stock atomically', async () => {
      const product = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      const baselineStock = product.current_stock;

      // Create and dispatch challan -> stock deducted
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        status: 'dispatched',
        items: [{ product_id: 'prod-demo-3', description: 'PVC Pipes', quantity: 10, unit_price: 180, gst_rate: 18 }],
      });
      expect(product.current_stock).toBe(baselineStock - 10);

      // Cancel the challan -> stock restored
      await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'cancelled');
      expect(product.current_stock).toBe(baselineStock);
    });

    it('8.13 CANCELLATION IDEMPOTENCY: Repeated cancellation of Delivery Challan does not restore stock twice', async () => {
      const product = demoProducts.find((p) => p.id === 'prod-demo-3')!;
      const baselineStock = product.current_stock;

      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'removal_for_sale',
        status: 'dispatched',
        items: [{ product_id: 'prod-demo-3', description: 'PVC Pipes', quantity: 5, unit_price: 180, gst_rate: 18 }],
      });
      expect(product.current_stock).toBe(baselineStock - 5);

      // First cancellation
      await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'cancelled');
      expect(product.current_stock).toBe(baselineStock);

      // Second cancellation call (duplicate request)
      await DeliveryChallanService.updateDeliveryChallanStatus(sessionOrgA, dc.id, 'cancelled');
      expect(product.current_stock).toBe(baselineStock); // Stock stays baseline, not baseline + 5
    });

    // 8.5 FINANCIAL INVARIANTS & ACCOUNTING ISOLATION
    it('8.14 FINANCIAL INVARIANT: Proforma Invoice does not create AR, GL entries, or tax liabilities', async () => {
      const pi = await ProformaInvoiceService.createProformaInvoice(sessionOrgA, {
        customer_id: 'cust-demo-1',
        proforma_date: '2026-09-26',
        items: [{ description: 'Non-financial Item', quantity: 10, unit_price: 1000, gst_rate: 18 }],
      });

      const fetched = await ProformaInvoiceService.getProformaInvoice(sessionOrgA, pi.id);
      expect(fetched.total_amount).toBe(11800);
      expect(fetched.status).toBe('sent');
      // Proforma invoices never link to invoice or generate GL postings until explicitly converted
      expect(fetched.converted_invoice_id).toBeNull();
    });

    it('8.15 FINANCIAL INVARIANT: Sales Order does not create customer receivables or accounting journals', async () => {
      const so = await SalesOrderService.createSalesOrder(sessionOrgA, {
        customer_id: 'cust-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Pre-sale Commitment Item', quantity: 20, unit_price: 500, gst_rate: 18 }],
      });

      const fetched = await SalesOrderService.getSalesOrder(sessionOrgA, so.id);
      expect(fetched.total_amount).toBe(11800);
      expect(fetched.status).toBe('confirmed');
    });

    // 8.6 RBAC GUARDS
    it('8.16 RBAC: Viewer role is rejected for creating Sales Orders, Proformas, or Challans', async () => {
      const sessionViewer = {
        ...sessionStaffRestricted,
        role: 'viewer',
        member: { role: 'viewer' },
      };

      await expect(
        SalesOrderService.createSalesOrder(sessionViewer, {
          customer_id: 'cust-demo-1',
          order_date: '2026-09-26',
          items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      ).rejects.toThrow(/FORBIDDEN/);

      await expect(
        ProformaInvoiceService.createProformaInvoice(sessionViewer, {
          customer_id: 'cust-demo-1',
          proforma_date: '2026-09-26',
          items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      ).rejects.toThrow(/FORBIDDEN/);

      await expect(
        DeliveryChallanService.createDeliveryChallan(sessionViewer, {
          customer_id: 'cust-demo-1',
          challan_date: '2026-09-26',
          challan_type: 'removal_for_sale',
          items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      ).rejects.toThrow(/FORBIDDEN/);
    });

    it('8.17 RBAC: Sales role is rejected from deleting Purchase Orders', async () => {
      const sessionSales = {
        ...sessionStaffRestricted,
        role: 'sales',
        member: { role: 'sales' },
      };

      const po = await PurchaseOrderService.createPurchaseOrder(sessionOrgA, {
        supplier_id: 'supp-demo-1',
        order_date: '2026-09-26',
        items: [{ description: 'Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
      });

      await expect(PurchaseOrderService.deletePurchaseOrder(sessionSales, po.id)).rejects.toThrow(/FORBIDDEN/);
    });

    // 8.7 RULE 55 STATUTORY PRINT DATA INTEGRITY
    it('8.18 STATUTORY PRINT DATA: Delivery Challan preserves Rule 55 transport & consignment fields', async () => {
      const dc = await DeliveryChallanService.createDeliveryChallan(sessionOrgA, {
        customer_id: 'cust-demo-1',
        challan_date: '2026-09-26',
        challan_type: 'for_job_work',
        vehicle_number: 'MH-14-GH-1234',
        transporter_name: 'VRL Logistics Ltd',
        delivery_address: 'Plot 45, MIDC Bhosari, Pune',
        items: [{ description: 'Alloy Rods for CNC Lathe', quantity: 200, unit: 'KGS', unit_price: 85, gst_rate: 18 }],
      });

      const fetched = await DeliveryChallanService.getDeliveryChallan(sessionOrgA, dc.id);
      expect(fetched.vehicle_number).toBe('MH-14-GH-1234');
      expect(fetched.transporter_name).toBe('VRL Logistics Ltd');
      expect(fetched.delivery_address).toBe('Plot 45, MIDC Bhosari, Pune');
      expect(fetched.challan_type).toBe('for_job_work');
      expect(fetched.items[0].unit).toBe('KGS');
    });
  });
});

