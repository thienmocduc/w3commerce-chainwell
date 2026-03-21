'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Props {
  defaultValue?: string
}

export default function MarketplaceSearch({ defaultValue }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(defaultValue || '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (query.trim()) {
      params.set('q', query.trim())
    } else {
      params.delete('q')
    }
    params.delete('page')
    router.push(`/marketplace?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm kiếm sản phẩm..."
        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
      >
        Tìm
      </button>
    </form>
  )
}
