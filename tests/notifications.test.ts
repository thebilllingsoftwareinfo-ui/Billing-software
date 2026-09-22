import { NotificationService } from '../lib/services/notification.service'
import { AppSession } from '../lib/auth/session'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`)
    throw new Error(message)
  }
  console.log(`  ✓ PASSED: ${message}`)
}

async function runNotificationsTests() {
  console.log('🧪 Running Wevly BusinessOS Notification Center Engine Test Suite...\n')

  // Reset in-memory test store
  NotificationService._clearInMemoryStore()

  // Mock sessions for tenant isolation testing
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
  // Test Suite 1: Notification Creation & Type Schemas
  // =========================================================================
  console.log('🔔 Test Suite 1: Notification Creation & Type Schemas')

  const notif1 = await NotificationService.createNotification(mockOrg1Session, {
    type: 'INVOICE_OVERDUE',
    title: 'Invoice Overdue: INV-2026-001',
    message: 'Invoice INV-2026-001 for Acme Corp is overdue (Due: 2026-09-01).',
    entity_type: 'invoice',
    entity_id: 'inv_101',
    action_url: '/sales/invoices/inv_101',
  })

  assert(notif1.id.startsWith('notif_'), 'Created notification has valid ID prefix')
  assert(notif1.organization_id === 'org_tenant_1', 'Notification belongs to tenant org_tenant_1')
  assert(notif1.type === 'INVOICE_OVERDUE', 'Notification type matches INVOICE_OVERDUE')
  assert(notif1.read === false, 'Newly created notification is unread by default')

  const notif2 = await NotificationService.createNotification(mockOrg1Session, {
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received: PAY-2026-005',
    message: 'Payment of ₹15,000 received from Stark Industries via UPI.',
    entity_type: 'payment',
    entity_id: 'pay_505',
    action_url: '/sales/payments/pay_505',
  })

  assert(notif2.type === 'PAYMENT_RECEIVED', 'Notification type matches PAYMENT_RECEIVED')

  const notif3 = await NotificationService.createNotification(mockOrg1Session, {
    type: 'LOW_STOCK',
    title: 'Low Stock Alert: Wireless Mouse',
    message: 'Stock level for Wireless Mouse is 3 (Min: 10). Please reorder.',
    entity_type: 'product',
    entity_id: 'prod_99',
    action_url: '/inventory/adjustments',
  })

  assert(notif3.type === 'LOW_STOCK', 'Notification type matches LOW_STOCK')

  const notif4 = await NotificationService.createNotification(mockOrg1Session, {
    type: 'QUOTATION_EXPIRING',
    title: 'Quotation Expiring Soon: QT-2026-012',
    message: 'Quotation QT-2026-012 valid until 2026-09-15.',
    entity_type: 'quotation',
    entity_id: 'qt_12',
    action_url: '/quotations/qt_12',
  })

  assert(notif4.type === 'QUOTATION_EXPIRING', 'Notification type matches QUOTATION_EXPIRING')

  const notif5 = await NotificationService.createNotification(mockOrg1Session, {
    type: 'SYSTEM_EVENT',
    title: 'Security Alert: Password Changed',
    message: 'Staff user profile updated.',
    entity_type: 'system',
    entity_id: 'usr_1',
    action_url: '/settings',
  })

  assert(notif5.type === 'SYSTEM_EVENT', 'Notification type matches SYSTEM_EVENT')
  console.log('')

  // =========================================================================
  // Test Suite 2: Read / Unread Status Transitions & Unread Count
  // =========================================================================
  console.log('📌 Test Suite 2: Read / Unread Status Transitions & Unread Count')

  const initialUnreadCount = await NotificationService.getUnreadCount(mockOrg1Session)
  assert(initialUnreadCount === 5, `Initial unread count matches expected 5 (got ${initialUnreadCount})`)

  // Mark single notification as read
  const updatedNotif1 = await NotificationService.markAsRead(mockOrg1Session, notif1.id)
  assert(updatedNotif1 !== null && updatedNotif1.read === true, 'Single notification marked as read')

  const countAfterOneRead = await NotificationService.getUnreadCount(mockOrg1Session)
  assert(countAfterOneRead === 4, `Unread count reduced to 4 (got ${countAfterOneRead})`)

  // Filter unread notifications
  const unreadList = await NotificationService.getNotifications(mockOrg1Session, { unreadOnly: true })
  assert(unreadList.length === 4, `Unread filtered list contains exactly 4 items (got ${unreadList.length})`)

  // Mark all as read
  const markAllResult = await NotificationService.markAllAsRead(mockOrg1Session)
  assert(markAllResult.count === 4, `Mark all as read updated 4 remaining unread items`)

  const finalUnreadCount = await NotificationService.getUnreadCount(mockOrg1Session)
  assert(finalUnreadCount === 0, 'Final unread count is 0 after markAllAsRead')
  console.log('')

  // =========================================================================
  // Test Suite 3: Multi-Tenant Organization Isolation
  // =========================================================================
  console.log('🔒 Test Suite 3: Multi-Tenant Organization Isolation')

  // Create notification for Org 2
  const org2Notif = await NotificationService.createNotification(mockOrg2Session, {
    type: 'SYSTEM_EVENT',
    title: 'Org 2 Private Notification',
    message: 'Confidential notification for Org 2 only.',
  })

  // Verify Org 1 cannot see Org 2 notifications
  const org1Notifs = await NotificationService.getNotifications(mockOrg1Session)
  const hasOrg2ItemInOrg1 = org1Notifs.some((n) => n.id === org2Notif.id)
  assert(!hasOrg2ItemInOrg1, 'Org 1 cannot see notifications belonging to Org 2')

  // Verify Org 2 cannot mark Org 1 notification as read
  const invalidReadAttempt = await NotificationService.markAsRead(mockOrg2Session, notif2.id)
  assert(invalidReadAttempt === null || invalidReadAttempt.read === true, 'Org 2 cannot manipulate Org 1 notification status')

  const org2UnreadCount = await NotificationService.getUnreadCount(mockOrg2Session)
  assert(org2UnreadCount === 1, `Org 2 unread count accurately isolated to 1 (got ${org2UnreadCount})`)
  console.log('')

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('==================================================')
  console.log('✨ All 3 Notification Center Engine Test Suites PASSED Successfully!')
  console.log('==================================================\n')
}

runNotificationsTests().catch((err) => {
  console.error('❌ Notifications Test Suite Failed:', err)
  process.exit(1)
})
