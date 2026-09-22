export function LoadingSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-44 bg-gray-200 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 rounded-md mt-2" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white border border-gray-200 rounded-2xl p-5" />
        ))}
      </div>

      <div className="h-80 bg-white border border-gray-200 rounded-2xl" />
    </div>
  )
}
