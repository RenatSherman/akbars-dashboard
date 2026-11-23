'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Users, FileText, BookOpen, Database, LogOut, Plus, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const MENU_ITEMS = [
  { href: '/dashboard/calendar', label: 'Календарь тренера', icon: Calendar },
  { href: '/dashboard/players', label: 'Игроки', icon: Users },
  { href: '/dashboard/reports', label: 'Отчеты', icon: FileText },
  { href: '/dashboard/exercises', label: 'Справочник упражнений', icon: BookOpen },
  { href: '/dashboard/data', label: 'Управление данными', icon: Database },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const [seasons, setSeasons] = useState<any[]>([])
  const [activeSeason, setActiveSeason] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newSeasonName, setNewSeasonName] = useState('')

  useEffect(() => {
    const loadSeasons = async () => {
      const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })
      if (data) {
        setSeasons(data)
        
        // Проверяем, есть ли выбранный сезон в URL или localStorage
        const searchParams = new URLSearchParams(window.location.search)
        const urlSeasonId = searchParams.get('season')
        const savedSeasonId = localStorage.getItem('active_season_id')
        
        const currentId = urlSeasonId || savedSeasonId
        const found = data.find(s => s.id === currentId)
        
        setActiveSeason(found || data.find(s => s.is_active) || data[0])
      }
    }
    loadSeasons()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const seasonId = e.target.value
    localStorage.setItem('active_season_id', seasonId)
    
    // Добавляем параметр в URL и перезагружаем страницу
    const url = new URL(window.location.href)
    url.searchParams.set('season', seasonId)
    window.location.href = url.toString()
  }

  const handleCreateSeason = async () => {
    if (!newSeasonName) return
    const year = new Date().getFullYear()
    
    await supabase.from('seasons').update({ is_active: false }).eq('is_active', true)

    const { data, error } = await supabase.from('seasons').insert({
      name: newSeasonName,
      start_date: `${year}-09-01`,
      end_date: `${year + 1}-05-31`,
      is_active: true
    }).select().single()

    if (!error && data) {
      setIsCreating(false)
      setNewSeasonName('')
      localStorage.setItem('active_season_id', data.id)
      window.location.href = `${window.location.pathname}?season=${data.id}`
    } else {
      alert('Ошибка создания сезона: ' + error?.message)
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-[#0a2e22] text-white flex flex-col">
      {/* Шапка */}
      <div className="flex h-auto flex-col justify-center border-b border-white/10 px-6 py-4 shrink-0">
        <span className="text-lg font-bold tracking-wide">АК БАРС</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Служба развития игроков</span>
      </div>

      {/* Меню */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* НИЗ: Сезоны и Выход */}
      <div className="border-t border-white/10 p-3 shrink-0 space-y-3">
        
        {/* Блок сезонов (малозаметный) */}
        <div>
          {isCreating ? (
            <div className="flex gap-1 bg-white/5 p-1 rounded">
              <input
                type="text"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="2026/2027"
                className="w-full bg-transparent px-1 py-0.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button onClick={handleCreateSeason} className="text-green-400 hover:text-green-300 text-xs px-1">OK</button>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white text-xs px-1">X</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="shrink-0">Сезон:</span>
              <select
                value={activeSeason?.id || ''}
                onChange={handleSeasonChange}
                className="flex-1 bg-transparent border-none text-slate-300 hover:text-white focus:outline-none cursor-pointer truncate"
              >
                {seasons.map(s => (
                  <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>
                ))}
              </select>
              <button onClick={() => setIsCreating(true)} className="hover:text-white shrink-0" title="Создать сезон">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Выйти
        </button>
      </div>
    </aside>
  )
}