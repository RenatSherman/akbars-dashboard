'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Activity, Target, TrendingUp, AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const MONTHS_FULL = ['Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май']
const MONTH_NUMS = [9, 10, 11, 12, 1, 2, 3, 4, 5]

export default function ReportsContent() {
  const searchParams = useSearchParams()
  const [seasonId, setSeasonId] = useState<string>('')
  const [seasonName, setSeasonName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  const [currentMonthIndex, setCurrentMonthIndex] = useState(2) // По умолчанию Ноябрь

  const [players, setPlayers] = useState<any[]>([])
  const [skills, setSkills] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [trainings, setTrainings] = useState<any[]>([])
  const [trainingPlayers, setTrainingPlayers] = useState<any[]>([])

  useEffect(() => {
    const urlSeasonId = searchParams.get('season')
    const savedSeasonId = localStorage.getItem('active_season_id')
    
    const fetchSeason = async (id: string) => {
      const { data } = await supabase.from('seasons').select('name').eq('id', id).single()
      if (data) setSeasonName(data.name)
    }

    if (urlSeasonId) {
      setSeasonId(urlSeasonId)
      fetchSeason(urlSeasonId)
    } else if (savedSeasonId) {
      setSeasonId(savedSeasonId)
      fetchSeason(savedSeasonId)
    } else {
      supabase.from('seasons').select('id, name').eq('is_active', true).maybeSingle().then(({ data }) => {
        if (data) {
          setSeasonId(data.id)
          setSeasonName(data.name)
        }
      })
    }
  }, [searchParams])

  useEffect(() => {
    if (!seasonId) return
    const loadData = async () => {
      setLoading(true)
      const [pRes, sRes, scRes, tRes, tpRes] = await Promise.all([
        supabase.from('players').select('id, fio, group_name, photo_url, injuries').order('fio'),
        supabase.from('skill_structure').select('*').order('category').order('skill_name'),
        supabase.from('player_skills').select('*').eq('season_id', seasonId),
        supabase.from('trainings').select('id, training_date, event_type').eq('season_id', seasonId),
        supabase.from('training_players').select('training_id, player_id')
      ])

      if (pRes.data) setPlayers(pRes.data)
      if (sRes.data) setSkills(sRes.data)
      if (scRes.data) setScores(scRes.data)
      if (tRes.data) setTrainings(tRes.data)
      if (tpRes.data) setTrainingPlayers(tpRes.data)
      
      setLoading(false)
    }
    loadData()
  }, [seasonId])

  const stats = useMemo(() => {
    const totalPlayers = players.length
    const facts = scores.filter(s => s.skill_type === 'fact')
    const plans = scores.filter(s => s.skill_type === 'plan')
    const avgFact = facts.length ? (facts.reduce((a, b) => a + b.score, 0) / facts.length).toFixed(1) : '0'
    const avgPlan = plans.length ? (plans.reduce((a, b) => a + b.score, 0) / plans.length).toFixed(1) : '0'
    return { totalPlayers, avgFact, avgPlan }
  }, [players, scores])

  const heatmapData = useMemo(() => {
    const categories = Array.from(new Set(skills.map(s => s.category)))
    const rows = players.map(player => {
      const playerScores = categories.map(cat => {
        const catSkillIds = skills.filter(s => s.category === cat).map(s => s.id)
        const playerCatScores = scores.filter(s => 
          s.player_id === player.id && 
          catSkillIds.includes(s.skill_id) && 
          (s.skill_type === 'fact' || s.skill_type === 'current')
        )
        if (playerCatScores.length === 0) return null
        const avg = playerCatScores.reduce((a, b) => a + b.score, 0) / playerCatScores.length
        return Math.round(avg * 10) / 10
      })
      return { player, scores: playerScores }
    })
    return { categories, rows }
  }, [players, skills, scores])

  // Данные для выбранного месяца (для печати)
  const currentMonthData = useMemo(() => {
    const monthNum = MONTH_NUMS[currentMonthIndex]
    const year = new Date().getFullYear()
    
    const monthTrainings = trainings.filter(t => {
      const d = new Date(t.training_date)
      return d.getMonth() + 1 === monthNum && d.getFullYear() === year
    })

    const trainingStats = players.map(player => {
      const attended = monthTrainings.filter(t => 
        trainingPlayers.some(tp => tp.training_id === t.id && tp.player_id === player.id)
      ).length
      return { player, attended }
    }).sort((a, b) => b.attended - a.attended)

    return { monthTrainings, trainingStats }
  }, [players, trainings, trainingPlayers, currentMonthIndex])

  const handlePrintPDF = () => {
    window.print()
  }

  const prevMonth = () => {
    if (currentMonthIndex > 0) setCurrentMonthIndex(i => i - 1)
  }

  const nextMonth = () => {
    if (currentMonthIndex < 8) setCurrentMonthIndex(i => i + 1)
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Загрузка отчетов...</div>

  return (
    <>
      {/* Экранный интерфейс */}
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Аналитика и отчеты</h1>
            <p className="text-sm text-slate-500">Данные за {seasonName || 'выбранный сезон'}</p>
          </div>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 rounded-lg border border-slate-400 bg-transparent px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Отчет за месяц (PDF)
          </button>
        </div>

        {/* Верхние карточки */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Всего игроков</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalPlayers}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
            <div className="bg-green-100 p-3 rounded-lg text-green-600"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Средний факт</p>
              <p className="text-2xl font-bold text-slate-800">{stats.avgFact} <span className="text-sm text-slate-400">/ 10</span></p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
            <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><Target className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Средний план</p>
              <p className="text-2xl font-bold text-slate-800">{stats.avgPlan} <span className="text-sm text-slate-400">/ 10</span></p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
            <div className="bg-amber-100 p-3 rounded-lg text-amber-600"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Прогресс группы</p>
              <p className="text-2xl font-bold text-slate-800">
                {Number(stats.avgFact) - Number(stats.avgPlan) > 0 ? '+' : ''}{(Number(stats.avgFact) - Number(stats.avgPlan)).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Календарь посещаемости */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Посещаемость по дням</h2>
                <p className="text-xs text-slate-500">Зеленый — был. Красный — травма. Серый — пропуск.</p>
              </div>
              
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button onClick={prevMonth} disabled={currentMonthIndex === 0} className="p-1 hover:bg-white rounded text-slate-600 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-800 w-24 text-center capitalize">
                  {MONTHS_FULL[currentMonthIndex]}
                </span>
                <button onClick={nextMonth} disabled={currentMonthIndex === 8} className="p-1 hover:bg-white rounded text-slate-600 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-2 py-2 font-medium text-xs text-slate-500 border-b min-w-[140px] sticky left-0 bg-white z-10">Игрок</th>
                    {Array.from({length: new Date(new Date().getFullYear(), MONTH_NUMS[currentMonthIndex], 0).getDate()}, (_, i) => i + 1).map(day => (
                      <th key={day} className="px-1 py-2 font-medium text-[10px] text-slate-400 text-center border-b w-6">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => {
                    const monthNum = MONTH_NUMS[currentMonthIndex]
                    const year = new Date().getFullYear()
                    const daysInMonth = new Date(year, monthNum, 0).getDate()
                    
                    return (
                      <tr key={player.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-2 py-2 font-medium text-slate-700 flex items-center gap-1 sticky left-0 bg-white z-10">
                          <span className="truncate max-w-[120px]">{player.fio}</span>
                          {player.injuries && (
                            <span title={player.injuries} className="cursor-help text-red-500 shrink-0">
                              <AlertCircle className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                        {Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => {
                          const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          const dayTrainings = trainings.filter(t => t.training_date === dateStr)
                          
                          if (dayTrainings.length === 0) return <td key={day} className="px-0.5 py-1 text-center"><div className="w-5 h-5 mx-auto" /></td>
                          
                          const isAssigned = dayTrainings.some(t => trainingPlayers.some(tp => tp.training_id === t.id && tp.player_id === player.id))
                          
                          if (isAssigned) return <td key={day} className="px-0.5 py-1 text-center"><div className="w-5 h-5 mx-auto rounded-sm bg-green-500" title="Был на тренировке" /></td>
                          if (player.injuries) return <td key={day} className="px-0.5 py-1 text-center"><div className="w-5 h-5 mx-auto rounded-sm bg-red-400" title="Пропуск из-за травмы" /></td>
                          return <td key={day} className="px-0.5 py-1 text-center"><div className="w-5 h-5 mx-auto rounded-sm bg-slate-200" title="Пропуск" /></td>
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Карта навыков */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden flex flex-col">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Карта навыков</h2>
              <p className="text-xs text-slate-500">Средние оценки по разделам (Факт).</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Игрок</th>
                    {heatmapData.categories.map(cat => (
                      <th key={cat} className="px-2 py-3 font-medium text-center">{cat}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {heatmapData.rows.map(({ player, scores }) => (
                    <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 font-medium text-slate-700 flex items-center gap-2">
                        <span className="truncate max-w-[120px]">{player.fio}</span>
                      </td>
                      {scores.map((score, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          {score !== null ? (
                            <div 
                              className="w-8 h-8 mx-auto rounded-md flex items-center justify-center font-bold text-xs"
                              style={{
                                backgroundColor: score >= 8 ? '#dcfce7' : score >= 6 ? '#fef9c3' : score >= 4 ? '#ffedd5' : '#fee2e2',
                                color: score >= 8 ? '#166534' : score >= 6 ? '#854d0e' : score >= 4 ? '#9a3412' : '#991b1b'
                              }}
                            >
                              {score}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ПЕЧАТНАЯ ВЕРСИЯ ОТЧЕТА */}
      <div className="hidden print:block p-8 bg-white text-black text-sm">
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-wider">ХК «Ак Барс»</h1>
          <h2 className="text-lg mt-1">Служба развития воспитанников</h2>
          <h3 className="text-xl font-semibold mt-4">Отчет за {MONTHS_FULL[currentMonthIndex]} {new Date().getFullYear()}</h3>
          <p className="text-xs text-gray-500 mt-2">Сезон: {seasonName}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-gray-300 p-4 rounded">
            <div className="text-xs text-gray-500 uppercase">Всего игроков</div>
            <div className="text-xl font-bold">{stats.totalPlayers}</div>
          </div>
          <div className="border border-gray-300 p-4 rounded">
            <div className="text-xs text-gray-500 uppercase">Тренировок за месяц</div>
            <div className="text-xl font-bold">{currentMonthData.monthTrainings.length}</div>
          </div>
          <div className="border border-gray-300 p-4 rounded">
            <div className="text-xs text-gray-500 uppercase">Средний балл группы</div>
            <div className="text-xl font-bold">{stats.avgFact} / 10</div>
          </div>
        </div>

        <div className="mb-8">
          <h4 className="font-bold border-b border-gray-300 pb-1 mb-3 uppercase text-xs">Посещаемость за месяц</h4>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border border-gray-300">Игрок</th>
                <th className="p-2 border border-gray-300 text-center">Тренировок</th>
                <th className="p-2 border border-gray-300">Примечание (Травмы)</th>
              </tr>
            </thead>
            <tbody>
              {currentMonthData.trainingStats.map(({ player, attended }) => (
                <tr key={player.id}>
                  <td className="p-2 border border-gray-300">{player.fio}</td>
                  <td className="p-2 border border-gray-300 text-center font-bold">{attended}</td>
                  <td className="p-2 border border-gray-300 text-red-600 text-[10px]">{player.injuries || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h4 className="font-bold border-b border-gray-300 pb-1 mb-3 uppercase text-xs">Средние показатели навыков</h4>
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1 border border-gray-300">Игрок</th>
                {heatmapData.categories.map(cat => (
                  <th key={cat} className="p-1 border border-gray-300 text-center">{cat}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.rows.map(({ player, scores }) => (
                <tr key={player.id}>
                  <td className="p-1 border border-gray-300 font-medium">{player.fio}</td>
                  {scores.map((score, i) => (
                    <td key={i} className="p-1 border border-gray-300 text-center">
                      {score !== null ? score : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-500">
          <div>Сформировано в системе «Ак Барс»</div>
          <div>Дата: {new Date().toLocaleDateString('ru-RU')}</div>
        </div>
      </div>
    </>
  )
}