import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/phase6-inventory.test.ts',
      'tests/phase7a-expenses-payments.test.ts',
      'tests/phase7b-crm.test.ts',
      'tests/phase7c-operations.test.ts',
      'tests/phase8-warehouses.test.ts',
      'tests/phase8-hardening.test.ts',
      'tests/phase9-sales-pricing.test.ts',
      'tests/phase10-financial-intelligence.test.ts',
      'tests/business-profile-single-source.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
