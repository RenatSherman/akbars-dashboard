import { Suspense } from 'react'
import Sidebar from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Правильно: Sidebar использует usePathname, поэтому он должен быть в Suspense */}
      <Suspense fallback={<div className="w-64 bg-[#0a2e22] fixed inset-y-0 left-0" />}>
        <Sidebar />
      </Suspense>
      <main className="ml-64 flex-1">
        {children}
      </main>
    </div>
  )
}