'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import EventModal, { CalendarEvent } from '@/components/calendar/EventModal'
import { useSearchParams } from 'next/navigation'

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const FORMAT_COLORS: Record<string, string> = {
  personal: '#2563eb',
  team: '#16a34a',
  individual: '#9333ea',
}
const GAME_COLOR = '#ea580c'

function getDaysGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startWeekday = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date | null; iso: string | null }[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null, iso: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date, iso })
  }
  return cells
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Загрузка календаря...</div>}>
      <CalendarPageContent />
    </Suspense>
  )
}

function CalendarPageContent() {
  const searchParams = useSearchParams()
  const [seasonId, setSeasonId] = useState<string>('')
  
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDay, setSelectedDay] = useState<string>(toIso(today))

  const [modalOpen, setModalOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined)

  // 1. Определяем сезон
  useEffect(() => {
    const urlSeasonId = searchParams.get('season')
    const savedSeasonId = localStorage.getItem('active_season_id')
    if (urlSeasonId) setSeasonId(urlSeasonId)
    else if (savedSeasonId) setSeasonId(savedSeasonId)
    else {
      supabase.from('seasons').select('id').eq('is_active', true).maybeSingle().then(({ data }) => {
        if (data) setSeasonId(data.id)
      })
    }
  }, [searchParams])

  // 2. Загружаем события
  const loadEvents = useCallback(async () => {
    if (!seasonId) return
    setLoading(true)
    const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    // Фильтруем по сезону
    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('season_id', seasonId)
      .gte('training_date', first)
      .lte('training_date', last)
      .order('training_date')
    
    if (error) console.error(error)
    setEvents(data || [])
    setLoading(false)
  }, [year, month, seasonId])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const e of events) {
      map[e.training_date] = map[e.training_date] || []
      map[e.training_date].push(e)
    }
    return map
  }, [events])

  const cells = getDaysGrid(year, month)

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  const openCreate = (iso?: string) => {
    setEditEvent(null)
    setDefaultDate(iso || selectedDay)
    setModalOpen(true)
  }

  const openEdit = (event: CalendarEvent) => {
    setEditEvent(event)
    setDefaultDate(undefined)
    setModalOpen(true)
  }

  const colorForEvent = (e: CalendarEvent) => {
    if (e.event_type === 'game') return GAME_COLOR
    return FORMAT_COLORS[e.training_format || 'team'] || '#16a34a'
  }

  const selectedDayEvents = eventsByDay[selectedDay] || []
  const selectedDayLabel = (() => {
    const [y, m, d] = selectedDay.split('-').map(Number)
    return `${d} ${MONTHS[m - 1]} ${y}`
  })()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-800">Календарь тренера</h1>
          {loading && <span className="text-xs text-slate-400">загрузка...</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-slate-700">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => openCreate()}
            className="ml-3 flex items-center gap-2 rounded-lg border border-slate-400 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Добавить
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 bg-white px-6 py-2 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: FORMAT_COLORS.personal }} />
          Персональная
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: FORMAT_COLORS.team }} />
          Командная
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: FORMAT_COLORS.individual }} />
          Самостоятельная
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: GAME_COLOR }} />
          Игра
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-1 text-center text-xs font-semibold uppercase text-slate-500">
                {d}
              </div>
            ))}
            {cells.map((cell, idx) => {
              const isSelected = cell.iso && cell.iso === selectedDay
              return (
                <div
                  key={idx}
                  onClick={() => cell.iso && setSelectedDay(cell.iso)}
                  onDoubleClick={() => cell.iso && openCreate(cell.iso)}
                  className={`min-h-[110px] cursor-pointer rounded-lg border p-1.5 transition-colors ${
                    cell.date
                      ? isSelected
                        ? 'border-slate-500 bg-slate-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-transparent bg-slate-50/40'
                  }`}
                  title={cell.iso ? 'Клик — показать в панели, двойной клик — создать' : ''}
                >
                  {cell.date && (
                    <>
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={`text-xs font-medium ${
                            isSelected ? 'text-slate-900' : 'text-slate-600'
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {(eventsByDay[cell.iso!] || []).map((e) => (
                          <button
                            key={e.id}
                            onClick={(ev) => {
                              ev.stopPropagation()
                              openEdit(e)
                            }}
                            className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white"
                            style={{ background: colorForEvent(e) }}
                            title={`${e.title}${e.start_time ? ' · ' + e.start_time.slice(0, 5) : ''}`}
                          >
                            {e.start_time ? e.start_time.slice(0, 5) + ' ' : ''}
                            {e.title}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <aside className="hidden w-80 flex-shrink-0 border-l border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Выбранный день</div>
            <div className="mt-1 text-base font-semibold text-slate-800">{selectedDayLabel}</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {selectedDayEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                На этот день событий нет
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents
                  .slice()
                  .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                  .map((e) => {
                    const tag =
                      e.event_type === 'game'
                        ? 'Игра'
                        : e.training_format === 'personal'
                        ? 'Персональная'
                        : e.training_format === 'individual'
                        ? 'Самостоятельная'
                        : 'Командная'
                    return (
                      <button
                        key={e.id}
                        onClick={() => openEdit(e)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-400 hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                            style={{ background: colorForEvent(e) }}
                          >
                            {tag}
                          </span>
                          {e.start_time && (
                            <span className="text-xs text-slate-500">
                              {e.start_time.slice(0, 5)}
                              {e.end_time ? `–${e.end_time.slice(0, 5)}` : ''}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-800">{e.title}</div>
                        {e.group_name && (
                          <div className="text-xs text-slate-500">Группа: {e.group_name}</div>
                        )}
                        {e.event_type === 'game' && (e.opponent || e.score) && (
                          <div className="mt-1 text-xs text-slate-600">
                            {e.opponent && <>Соперник: {e.opponent}</>}
                            {e.score && <> · Счет: {e.score}</>}
                          </div>
                        )}
                      </button>
                    )
                  })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3">
            <button
              onClick={() => openCreate(selectedDay)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-400 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" /> Добавить на этот день
            </button>
          </div>
        </aside>
      </div>

      <EventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadEvents}
        eventToEdit={editEvent}
        defaultDate={defaultDate}
        seasonId={seasonId}
      />
    </div>
  )
}