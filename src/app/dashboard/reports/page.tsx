'use client'

import { Suspense } from 'react'
import ReportsContent from './ReportsContent'

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Загрузка отчетов...</div>}>
      <ReportsContent />
    </Suspense>
  )
}