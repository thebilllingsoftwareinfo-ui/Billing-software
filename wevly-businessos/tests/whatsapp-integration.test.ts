import { WhatsAppService } from '../lib/services/whatsapp.service'
import { MetaWhatsAppProvider, MockWhatsAppProvider, WHATSAPP_TEMPLATES } from '../lib/whatsapp/meta-provider'
import { AppSession } from '../lib/auth/session'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`)
    throw new Error(message)
  }
  console.log(`  ✓ PASSED: ${message}`)
}

async function runWhatsAppTests() {
  console.log('🧪 Running Wevly BusinessOS WhatsApp Integration Architecture Test Suite...\n')

  WhatsAppService._clearInMemoryStore()

  const mockOrg1Session: AppSession = {
    user: { id: 'usr_1', email: 'owner@org1.com', full_name: 'Org1 Owner', avatar_url: null },
    organization: { id: 'org_tenant_1', name: 'Org 1 Corp', gstin: '27AAAAA0000A1Z5', logo_url: null },
    member: { id: 'mem_1', role: 'OWNER', status: 'active' },
  } as any

  const mockOrg2Session: AppSession = {
    user: { id: 'usr_2', email: 'owner@org2.com', full_name: 'Org2 Owner', avatar_url: null },
    organization: { id: 'org_tenant_2', name: 'Org 2 Corp', gstin: '27BBBBB0000B1Z5', logo_url: null },
    member: { id: 'mem_2', role: 'OWNER', status: 'active' },
  } as any

  // =========================================================================
  // Test Suite 1: Provider Abstraction & Template Previews for 4 Core Events
  // =========================================================================
  console.log('📱 Test Suite 1: Provider Abstraction & Template Previews')

  const metaProvider = new MetaWhatsAppProvider('mock_server_secret_key', '10987654321')
  const mockProvider = new MockWhatsAppProvider()

  // 1. invoice.created
  const invPreview = metaProvider.formatTemplatePreview('invoice.created', {
    customer_name: 'Acme Corp',
    invoice_number: 'INV-2026-001',
    total_amount: '₹12,500',
    due_date: '2026-09-30',
    pdf_link: 'https://app.wevly.com/inv/1.pdf',
  })
  assert(invPreview.includes('Acme Corp') && invPreview.includes('INV-2026-001') && invPreview.includes('₹12,500'), 'invoice.created template formats correctly')

  // 2. invoice.overdue
  const reminderPreview = metaProvider.formatTemplatePreview('invoice.overdue', {
    customer_name: 'Stark Industries',
    invoice_number: 'INV-2026-009',
    outstanding_amount: '₹5,000',
    due_date: '2026-09-01',
    payment_link: 'https://app.wevly.com/pay/9',
  })
  assert(reminderPreview.includes('Stark Industries') && reminderPreview.includes('₹5,000'), 'invoice.overdue template formats correctly')

  // 3. payment.received
  const receiptPreview = metaProvider.formatTemplatePreview('payment.received', {
    customer_name: 'Wayne Enterprises',
    payment_number: 'PAY-2026-015',
    amount_paid: '₹20,000',
    remaining_balance: '₹0',
    receipt_link: 'https://app.wevly.com/rec/15',
  })
  assert(receiptPreview.includes('Wayne Enterprises') && receiptPreview.includes('₹20,000'), 'payment.received template formats correctly')

  // 4. quotation.created
  const quotePreview = metaProvider.formatTemplatePreview('quotation.created', {
    customer_name: 'Cyberdyne Systems',
    quotation_number: 'QT-2026-004',
    total_amount: '₹45,000',
    valid_until: '2026-10-15',
    quote_link: 'https://app.wevly.com/qt/4',
  })
  assert(quotePreview.includes('Cyberdyne Systems') && quotePreview.includes('QT-2026-004'), 'quotation.created template formats correctly')
  console.log('')

  // =========================================================================
  // Test Suite 2: Customer Opt-In & Consent Guard Enforcement
  // =========================================================================
  console.log('🛡️ Test Suite 2: Customer Opt-In & Consent Guard Enforcement')

  const optOutPhone = '+919999900000'
  const optInPhone = '+919876543210'

  // Set explicit opt-out for optOutPhone
  WhatsAppService.setCustomerOptIn(optOutPhone, false)
  WhatsAppService.setCustomerOptIn(optInPhone, true)

  // Attempt sending message to opted-out customer
  const blockedMessage = await WhatsAppService.sendInvoiceCreated(mockOrg1Session, {
    id: 'inv_optout',
    invoice_number: 'INV-BLOCKED-01',
    customer_name: 'Opted Out Customer',
    customer_phone: optOutPhone,
    total_amount_paise: 500000,
  })

  assert(blockedMessage.status === 'OPT_OUT_BLOCKED', 'Opted-out customer message transmission is blocked with OPT_OUT_BLOCKED status')
  assert(blockedMessage.error_message !== null, 'Blocked message contains clear consent error explanation')

  // Attempt sending message to opted-in customer
  const allowedMessage = await WhatsAppService.sendInvoiceCreated(mockOrg1Session, {
    id: 'inv_optin',
    invoice_number: 'INV-ALLOWED-01',
    customer_name: 'Opted In Customer',
    customer_phone: optInPhone,
    total_amount_paise: 750000,
  })

  assert(allowedMessage.status === 'SENT', 'Opted-in customer message transmits successfully with SENT status')
  assert(allowedMessage.provider_message_id !== null, 'Sent message returns provider message reference ID')
  console.log('')

  // =========================================================================
  // Test Suite 3: Event-Driven Transactional Messaging Helpers
  // =========================================================================
  console.log('⚡ Test Suite 3: Event-Driven Transactional Messaging Helpers')

  // Payment confirmation message
  const payMsg = await WhatsAppService.sendPaymentConfirmation(mockOrg1Session, {
    id: 'pay_777',
    payment_number: 'PAY-2026-777',
    customer_name: 'Acme Corp',
    customer_phone: optInPhone,
    amount_paise: 1000000,
    remaining_balance_paise: 250000,
  })
  assert(payMsg.template_type === 'payment.received', 'Payment receipt sends payment.received template')
  assert(payMsg.parameters.amount_paid === '₹10,000.00', 'Payment receipt formats amount_paid parameter')

  // Quotation created message
  const qtMsg = await WhatsAppService.sendQuotationCreated(mockOrg1Session, {
    id: 'qt_888',
    quotation_number: 'QT-2026-888',
    customer_name: 'Stark Industries',
    customer_phone: optInPhone,
    total_amount_paise: 1500000,
    valid_until: '2026-10-01',
  })
  assert(qtMsg.template_type === 'quotation.created', 'Quotation sharing sends quotation.created template')
  console.log('')

  // =========================================================================
  // Test Suite 4: Multi-Tenant Tenant Isolation Predicate
  // =========================================================================
  console.log('🔒 Test Suite 4: Multi-Tenant Tenant Isolation Predicate')

  // Create message log for Org 2
  await WhatsAppService.sendInvoiceCreated(mockOrg2Session, {
    id: 'inv_org2',
    invoice_number: 'INV-ORG2-99',
    customer_name: 'Org2 Private Customer',
    customer_phone: optInPhone,
    total_amount_paise: 300000,
  })

  const org1Logs = await WhatsAppService.getMessageLogs(mockOrg1Session)
  const hasOrg2LogInOrg1 = org1Logs.some((l) => l.entity_id === 'inv_org2')
  assert(!hasOrg2LogInOrg1, 'Org 1 cannot access outbound WhatsApp logs of Org 2')

  const org2Logs = await WhatsAppService.getMessageLogs(mockOrg2Session)
  assert(org2Logs.length === 1 && org2Logs[0].entity_id === 'inv_org2', 'Org 2 message logs strictly isolated')
  console.log('')

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('==================================================')
  console.log('✨ All 4 WhatsApp Integration Engine Test Suites PASSED Successfully!')
  console.log('==================================================\n')
}

runWhatsAppTests().catch((err) => {
  console.error('❌ WhatsApp Test Suite Failed:', err)
  process.exit(1)
})
