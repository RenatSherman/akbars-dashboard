'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Save, Trash2, BookmarkPlus, LayoutTemplate, Trash } from 'lucide-react'

type EventType = 'training' | 'game'
type TrainingFormat = 'personal' | 'team' | 'individual'

export type CalendarEvent = {
  id: string
  title: string
  training_date: string
  start_time: string | null
  end_time: string | null
  group_name: string | null
  description: string | null
  event_type: EventType
  training_format: TrainingFormat | null
  opponent: string | null
  score: string | null
}

type Player = { id: string; fio: string; group_name: string | null }
type Exercise = { id: string; category: string; subcategory: string | null; name: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  eventToEdit?: CalendarEvent | null
  defaultDate?: string
  seasonId: string
}

const FORMAT_LABELS: Record<TrainingFormat, string> = {
  personal: 'Персональная',
  team: 'Командная',
  individual: 'Самостоятельная',
}

const GROUPS = ['Звездочки', 'Общая группа', 'Спецгруппа']
const TEMPLATES_KEY = 'akbars_training_templates_v1'

type Template = {
  id: string
  name: string
  training_format: TrainingFormat
  description: string
  exerciseIds: string[]
}

export default function EventModal({ isOpen, onClose, onSaved, eventToEdit, defaultDate, seasonId }: Props) {
  const isEdit = !!eventToEdit

  const [eventType, setEventType] = useState<EventType>('training')
  const [trainingFormat, setTrainingFormat] = useState<TrainingFormat>('team')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [opponent, setOpponent] = useState('')
  const [score, setScore] = useState('')

  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set())

  const [playerFilter, setPlayerFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [templates, setTemplates] = useState<Template[]>([])
  const [templateName, setTemplateName] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      setLoading(true)
      const [{ data: p }, { data: e }] = await Promise.all([
        supabase.from('players').select('id, fio, group_name').order('fio'),
        supabase.from('exercises').select('id, category, subcategory, name').order('category').order('name'),
      ])
      setPlayers(p || [])
      setExercises(e || [])
      setLoading(false)
    }
    load()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY)
      setTemplates(raw ? JSON.parse(raw) : [])
    } catch { setTemplates([]) }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const init = async () => {
      if (eventToEdit) {
        setEventType(eventToEdit.event_type)
        setTrainingFormat(eventToEdit.training_format || 'team')
        setTitle(eventToEdit.title || '')
        setDate(eventToEdit.training_date || '')
        setStartTime(eventToEdit.start_time || '')
        setEndTime(eventToEdit.end_time || '')
        setGroupName(eventToEdit.group_name || '')
        setDescription(eventToEdit.description || '')
        setOpponent(eventToEdit.opponent || '')
        setScore(eventToEdit.score || '')

        const [{ data: tp }, { data: te }] = await Promise.all([
          supabase.from('training_players').select('player_id').eq('training_id', eventToEdit.id),
          supabase.from('training_exercises').select('exercise_id').eq('training_id', eventToEdit.id),
        ])
        setSelectedPlayers(new Set((tp || []).map((r: any) => r.player_id)))
        setSelectedExercises(new Set((te || []).map((r: any) => r.exercise_id)))
      } else {
        setEventType('training')
        setTrainingFormat('team')
        setTitle('')
        setDate(defaultDate || '')
        setStartTime('')
        setEndTime('')
        setGroupName('')
        setDescription('')
        setOpponent('')
        setScore('')
        setSelectedPlayers(new Set())
        setSelectedExercises(new Set())
      }
      setPlayerFilter('')
      setTemplateName('')
    }
    init()
  }, [isOpen, eventToEdit, defaultDate])

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  }

  const filteredPlayers = useMemo(() => {
    if (!playerFilter) return players
    return players.filter((p) => p.group_name === playerFilter)
  }, [players, playerFilter])

  const selectAllFilteredPlayers = () => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev)
      filteredPlayers.forEach((p) => next.add(p.id))
      return next
    })
  }
  const clearFilteredPlayers = () => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev)
      filteredPlayers.forEach((p) => next.delete(p.id))
      return next
    })
  }

  const groupedExercises = useMemo(() => {
    return exercises.reduce<Record<string, Record<string, Exercise[]>>>((acc, ex) => {
      const cat = ex.category || 'Без раздела'
      const sub = ex.subcategory || 'Без подраздела'
      acc[cat] = acc[cat] || {}
      acc[cat][sub] = acc[cat][sub] || []
      acc[cat][sub].push(ex)
      return acc
    }, {})
  }, [exercises])

  const subAllSelected = (list: Exercise[]) => list.every((e) => selectedExercises.has(e.id))
  const catAllSelected = (subs: Record<string, Exercise[]>) => Object.values(subs).every((list) => subAllSelected(list))

  const toggleSub = (list: Exercise[]) => {
    setSelectedExercises((prev) => {
      const next = new Set(prev)
      const all = list.every((e) => next.has(e.id))
      list.forEach((e) => (all ? next.delete(e.id) : next.add(e.id)))
      return next
    })
  }
  const toggleCat = (subs: Record<string, Exercise[]>) => {
    const allList = Object.values(subs).flat()
    setSelectedExercises((prev) => {
      const next = new Set(prev)
      const all = allList.every((e) => next.has(e.id))
      allList.forEach((e) => (all ? next.delete(e.id) : next.add(e.id)))
      return next
    })
  }

  const saveTemplate = () => {
    if (!templateName.trim()) return alert('Введите название шаблона')
    const tpl: Template = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      training_format: trainingFormat,
      description,
      exerciseIds: Array.from(selectedExercises),
    }
    const next = [...templates, tpl]
    setTemplates(next)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next))
    setTemplateName('')
  }

  const applyTemplate = (tpl: Template) => {
    setTrainingFormat(tpl.training_format)
    setDescription(tpl.description)
    setSelectedExercises(new Set(tpl.exerciseIds))
  }

  const deleteTemplate = (id: string) => {
    if (!confirm('Удалить шаблон?')) return
    const next = templates.filter((t) => t.id !== id)
    setTemplates(next)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next))
  }

  const handleDelete = async () => {
    if (!eventToEdit) return
    if (!confirm('Удалить это событие? Действие необратимо.')) return
    setSaving(true)
    const { error } = await supabase.from('trainings').delete().eq('id', eventToEdit.id)
    setSaving(false)
    if (error) return alert('Ошибка удаления: ' + error.message)
    onSaved()
    onClose()
  }

  const handleSave = async () => {
    if (!title.trim() || !date) return alert('Заполните название и дату')
    setSaving(true)

    const payload = {
      title: title.trim(),
      training_date: date,
      start_time: startTime || null,
      end_time: endTime || null,
      group_name: groupName || null,
      description: description || null,
      event_type: eventType,
      training_format: eventType === 'training' ? trainingFormat : null,
      opponent: eventType === 'game' ? opponent || null : null,
      score: eventType === 'game' ? score || null : null,
      season_id: seasonId
    }

    let trainingId = eventToEdit?.id

    if (isEdit && trainingId) {
      const { error } = await supabase.from('trainings').update(payload).eq('id', trainingId)
      if (error) { setSaving(false); return alert('Ошибка обновления: ' + error.message) }
      await supabase.from('training_players').delete().eq('training_id', trainingId)
      await supabase.from('training_exercises').delete().eq('training_id', trainingId)
    } else {
      const { data, error } = await supabase.from('trainings').insert(payload).select('id').single()
      if (error || !data) { setSaving(false); return alert('Ошибка создания: ' + (error?.message || 'неизвестно')) }
      trainingId = data.id
    }

    const playerRows = Array.from(selectedPlayers).map((pid) => ({ training_id: trainingId, player_id: pid }))
    const exerciseRows = Array.from(selectedExercises).map((eid) => ({ training_id: trainingId, exercise_id: eid }))

    if (playerRows.length) {
      const { error } = await supabase.from('training_players').insert(playerRows)
      if (error) { setSaving(false); return alert('Ошибка сохранения игроков: ' + error.message) }
    }
    if (exerciseRows.length) {
      const { error } = await supabase.from('training_exercises').insert(exerciseRows)
      if (error) { setSaving(false); return alert('Ошибка сохранения упражнений: ' + error.message) }
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEdit ? 'Редактировать событие' : 'Новое событие'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-2">
            <button onClick={() => setEventType('training')} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${eventType === 'training' ? 'border-slate-400 bg-slate-100 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Тренировка</button>
            <button onClick={() => setEventType('game')} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${eventType === 'game' ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Игра</button>
          </div>

          {eventType === 'training' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Формат</label>
              <div className="flex gap-2">
                {(Object.keys(FORMAT_LABELS) as TrainingFormat[]).map((f) => (
                  <button key={f} onClick={() => setTrainingFormat(f)} className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${trainingFormat === f ? 'border-slate-400 bg-slate-100 text-slate-900 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{FORMAT_LABELS[f]}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Название</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" placeholder="Например: Командная тренировка" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Дата</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Начало</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Конец</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Группа (необязательно)</label>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" placeholder="Звездочки / Общая / Спецгруппа" />
          </div>

          {eventType === 'game' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Соперник</label>
                <input value={opponent} onChange={(e) => setOpponent(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Счет</label>
                <input value={score} onChange={(e) => setScore(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" placeholder="3:2" />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
          </div>

          {eventType === 'training' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><LayoutTemplate className="h-4 w-4" /> Шаблоны тренировок</div>
              <div className="mb-2 flex gap-2">
                <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Название шаблона" className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none" />
                <button onClick={saveTemplate} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white"><BookmarkPlus className="h-4 w-4" /> Сохранить</button>
              </div>
              {templates.length === 0 ? (
                <p className="text-xs text-slate-500">Шаблонов пока нет.</p>
              ) : (
                <div className="space-y-1">
                  {templates.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-700">{t.name}</div>
                        <div className="text-xs text-slate-500">{FORMAT_LABELS[t.training_format]} · {t.exerciseIds.length} упр.</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => applyTemplate(t)} className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100">Применить</button>
                        <button onClick={() => deleteTemplate(t.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Игроки ({selectedPlayers.size})</label>
              <button onClick={() => setSelectedPlayers(new Set())} className="text-xs text-slate-500 hover:text-slate-800">Снять всех</button>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-1">
              <button onClick={() => setPlayerFilter('')} className={`rounded-full border px-3 py-0.5 text-xs ${playerFilter === '' ? 'border-slate-400 bg-slate-100 text-slate-900' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Все</button>
              {GROUPS.map((g) => (
                <button key={g} onClick={() => setPlayerFilter(g)} className={`rounded-full border px-3 py-0.5 text-xs ${playerFilter === g ? 'border-slate-400 bg-slate-100 text-slate-900' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{g}</button>
              ))}
              <span className="mx-1 text-slate-300">|</span>
              <button onClick={selectAllFilteredPlayers} className="rounded-full border border-slate-300 px-3 py-0.5 text-xs text-slate-700 hover:bg-slate-50">+ Выбрать всех</button>
              <button onClick={clearFilteredPlayers} className="rounded-full border border-slate-300 px-3 py-0.5 text-xs text-slate-700 hover:bg-slate-50">− Снять всех</button>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {loading && <p className="p-2 text-sm text-slate-400">Загрузка...</p>}
              {!loading && filteredPlayers.length === 0 && <p className="p-2 text-sm text-slate-400">Нет игроков</p>}
              <div className="grid grid-cols-2 gap-1">
                {filteredPlayers.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={selectedPlayers.has(p.id)} onChange={() => setSelectedPlayers((s) => toggle(s, p.id))} className="accent-slate-600" />
                    <span className="truncate text-slate-700">{p.fio}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {eventType === 'training' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Упражнения ({selectedExercises.size})</label>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {loading && <p className="p-2 text-sm text-slate-400">Загрузка...</p>}
                {!loading && exercises.length === 0 && <p className="p-2 text-sm text-slate-400">Справочник пуст</p>}
                {Object.entries(groupedExercises).map(([cat, subs]) => (
                  <details key={cat} className="mb-1">
                    <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100">
                      <input type="checkbox" checked={catAllSelected(subs)} onChange={(e) => { e.stopPropagation(); toggleCat(subs) }} onClick={(e) => e.stopPropagation()} className="accent-slate-600" />
                      {cat}
                    </summary>
                    <div className="ml-5">
                      {Object.entries(subs).map(([sub, list]) => (
                        <details key={sub} className="mb-1">
                          <summary className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
                            <input type="checkbox" checked={subAllSelected(list)} onChange={(e) => { e.stopPropagation(); toggleSub(list) }} onClick={(e) => e.stopPropagation()} className="accent-slate-600" />
                            {sub}
                          </summary>
                          <div className="ml-5">
                            {list.map((ex) => (
                              <label key={ex.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                                <input type="checkbox" checked={selectedExercises.has(ex.id)} onChange={() => setSelectedExercises((s) => toggle(s, ex.id))} className="accent-slate-600" />
                                <span className="text-slate-700">{ex.name}</span>
                              </label>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <div>{isEdit && <button onClick={handleDelete} disabled={saving} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 disabled:opacity-50 transition-colors"><Trash2 className="h-4 w-4" /> Удалить</button>}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg border border-slate-400 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}