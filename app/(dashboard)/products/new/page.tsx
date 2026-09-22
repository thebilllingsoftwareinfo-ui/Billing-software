'use client'

import { useRouter } from 'next/navigation'
import { AddItemView } from '@/components/products/add-item-view'

export default function NewProductPage() {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <AddItemView
        onClose={() => router.push('/products')}
        onSuccess={() => router.push('/products')}
      />
    </div>
  )
}
