'use client'

import { ErrorBoundaryView } from '@/components/common/error-boundary-view'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryView error={error} reset={reset} />
}
