'use client'

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts'
import { CheckCircle2, Loader2, Settings2, Plus, Trash2 } from 'lucide-react'

type Skill = {
  id: string
  category: string
  subcategory: string | null
  skill_name: string
}

type Props = {
  playerId: string
  seasonId: string
}

function PlayerSkillsContent({ playerId, seasonId }: Props) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [scores, setScores] = useState<Record<string, { current: number; plan: number; fact: number }>>({})
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  
  // Состояние для редактирования структуры
  const [isEditingStructure, setIsEditingStructure] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newSubcategory, setNewSubcategory] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')

  const loadSkills = async () => {
    const { data: sData } = await supabase.from('skill_structure').select('*').order('category').order('skill_name')
    setSkills(sData || [])
  }

  useEffect(() => {
    if (!playerId || !seasonId) return
    const init = async () => {
      setLoading(true)
      await loadSkills()

      const { data: scoresData } = await supabase.from('player_skills').select('skill_id, score, skill_type').eq('player_id', playerId).eq('season_id', seasonId)
      const newScores: Record<string, { current: number; plan: number; fact: number }> = {}
      
      scoresData?.forEach((row) => {
        if (!newScores[row.skill_id]) newScores[row.skill_id] = { current: 0, plan: 0, fact: 0 }
        if (row.skill_type === 'current') newScores[row.skill_id].current = row.score
        if (row.skill_type === 'plan') newScores[row.skill_id].plan = row.score
        if (row.skill_type === 'fact') newScores[row.skill_id].fact = row.score
      })
      setScores(newScores)
      setLoading(false)
    }
    init()
  }, [playerId, seasonId])

  const groupedSkills = useMemo(() => {
    const map: Record<string, Record<string, Skill[]>> = {}
    skills.forEach(skill => {
      const cat = skill.category || 'Без раздела'
      const sub = skill.subcategory || 'Без подраздела'
      if (!map[cat]) map[cat] = {}
      if (!map[cat][sub]) map[cat][sub] = []
      map[cat][sub].push(skill)
    })
    return map
  }, [skills])

  const chartData = useMemo(() => {
    return skills.slice(0, 8).map(skill => {
      const data = scores[skill.id] || { current: 0, plan: 0, fact: 0 }
      return { subject: skill.skill_name, current: data.current, plan: data.plan, fact: data.fact, fullMark: 10 }
    })
  }, [skills, scores])

  const saveScore = useCallback(async (skillId: string, field: 'current' | 'plan' | 'fact', num: number) => {
    setSavingStatus('saving')
    await supabase.from('player_skills').delete().eq('player_id', playerId).eq('season_id', seasonId).eq('skill_id', skillId).eq('skill_type', field)
    if (num > 0) {
      await supabase.from('player_skills').insert({ player_id: playerId, skill_id: skillId, season_id: seasonId, skill_type: field, score: num })
    }
    setSavingStatus('saved')
    setTimeout(() => setSavingStatus('idle'), 2000)
  }, [playerId, seasonId])

  const handleScoreChange = (skillId: string, field: 'current' | 'plan' | 'fact', value: string) => {
    const num = Math.min(10, Math.max(0, Number(value) || 0))
    setScores(prev => ({ ...prev, [skillId]: { ...prev[skillId], [field]: num } }))
    saveScore(skillId, field, num)
  }

  // --- ФУНКЦИИ УПРАВЛЕНИЯ СТРУКТУРОЙ ---
  const handleAddCategory = async () => {
    if (!newCategory) return
    await supabase.from('skill_structure').insert({ category: newCategory, subcategory: 'Общее', skill_name: 'Новый навык' })
    setNewCategory('')
    await loadSkills()
  }

  const handleAddSubcategory = async () => {
    if (!selectedCategory || !newSubcategory) return
    await supabase.from('skill_structure').insert({ category: selectedCategory, subcategory: newSubcategory, skill_name: 'Новый навык' })
    setNewSubcategory('')
    await loadSkills()
  }

  const handleAddSkill = async () => {
    if (!selectedCategory || !selectedSubcategory || !newSkillName) return
    await supabase.from('skill_structure').insert({ category: selectedCategory, subcategory: selectedSubcategory, skill_name: newSkillName })
    setNewSkillName('')
    await loadSkills()
  }

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Удалить этот навык? Оценки тоже удалятся.')) return
    await supabase.from('skill_structure').delete().eq('id', id)
    await loadSkills()
  }

  const handleRenameSkill = async (id: string, currentName: string) => {
    const newName = prompt('Новое название навыка:', currentName)
    if (newName && newName !== currentName) {
      await supabase.from('skill_structure').update({ skill_name: newName }).eq('id', id)
      await loadSkills()
    }
  }

  // Переименование категории (раздела)
  const handleRenameCategory = async (oldCat: string) => {
    const newCat = prompt('Новое название раздела:', oldCat)
    if (newCat && newCat !== oldCat) {
      await supabase.from('skill_structure').update({ category: newCat }).eq('category', oldCat)
      await loadSkills()
    }
  }

  // Удаление категории (раздела)
  const handleDeleteCategory = async (cat: string) => {
    if (!confirm(`Удалить весь раздел "${cat}" и все навыки в нём?`)) return
    await supabase.from('skill_structure').delete().eq('category', cat)
    await loadSkills()
  }

  // Переименование подкатегории (подраздела)
  const handleRenameSubcategory = async (cat: string, oldSub: string) => {
    const newSub = prompt('Новое название подраздела:', oldSub)
    if (newSub && newSub !== oldSub) {
      await supabase.from('skill_structure').update({ subcategory: newSub }).eq('category', cat).eq('subcategory', oldSub)
      await loadSkills()
    }
  }

  // Удаление подкатегории (подраздела)
  const handleDeleteSubcategory = async (cat: string, sub: string) => {
    if (!confirm(`Удалить подраздел "${sub}" и все навыки в нём?`)) return
    await supabase.from('skill_structure').delete().eq('category', cat).eq('subcategory', sub)
    await loadSkills()
  }


  if (loading) return <div className="p-4 text-sm text-slate-500">Загрузка навыков...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Ведомость развития (Сезон)</h3>
          <p className="text-xs text-slate-500 mt-1">Изменения оценок сохраняются автоматически.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            {savingStatus === 'saving' && <span className="flex items-center gap-1.5 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Сохранение...</span>}
            {savingStatus === 'saved' && <span className="flex items-center gap-1.5 text-green-600"><CheckCircle2 className="h-4 w-4" /> Сохранено</span>}
          </div>
          <button
            onClick={() => setIsEditingStructure(!isEditingStructure)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              isEditingStructure ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            {isEditingStructure ? 'Завершить настройку' : 'Редактировать структуру'}
          </button>
        </div>
      </div>

      {/* ПАНЕЛЬ РЕДАКТИРОВАНИЯ СТРУКТУРЫ */}
      {isEditingStructure && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Settings2 className="w-4 h-4"/> Добавление элементов</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Добавить раздел */}
            <div className="flex gap-2">
              <input placeholder="Новый раздел" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
              <button onClick={handleAddCategory} className="bg-slate-800 text-white px-2 py-1 rounded text-sm hover:bg-slate-700"><Plus className="w-4 h-4"/></button>
            </div>

            {/* Добавить подраздел */}
            <div className="flex gap-2">
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-1/3 rounded border border-slate-300 px-2 py-1 text-sm">
                <option value="">Раздел</option>
                {Object.keys(groupedSkills).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Подраздел" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
              <button onClick={handleAddSubcategory} className="bg-slate-800 text-white px-2 py-1 rounded text-sm hover:bg-slate-700"><Plus className="w-4 h-4"/></button>
            </div>

            {/* Добавить навык */}
            <div className="flex gap-2">
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-1/3 rounded border border-slate-300 px-2 py-1 text-sm">
                <option value="">Раздел</option>
                {Object.keys(groupedSkills).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={selectedSubcategory} onChange={e => setSelectedSubcategory(e.target.value)} className="w-1/3 rounded border border-slate-300 px-2 py-1 text-sm">
                <option value="">Подраздел</option>
                {selectedCategory && groupedSkills[selectedCategory] && Object.keys(groupedSkills[selectedCategory]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input placeholder="Навык" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
              <button onClick={handleAddSkill} className="bg-slate-800 text-white px-2 py-1 rounded text-sm hover:bg-slate-700"><Plus className="w-4 h-4"/></button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Профиль игрока</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar name="Сейчас" dataKey="current" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
                <Radar name="План" dataKey="plan" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeDasharray="3 3" />
                <Radar name="Итог" dataKey="fact" stroke="#c8102e" fill="#c8102e" fillOpacity={0.3} />
                <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-8 rounded-xl border border-slate-200 bg-white p-4">
          <div className="max-h-[500px] space-y-6 overflow-y-auto pr-2">
            {Object.entries(groupedSkills).map(([cat, subs]) => (
              <div key={cat} className="space-y-2">
                {/* ЗАГОЛОВОК РАЗДЕЛА */}
                <div className="flex items-center justify-between border-b pb-1 group">
                  <h4 
                    className={`text-xs font-bold uppercase tracking-wider text-slate-500 ${isEditingStructure ? 'cursor-pointer hover:underline text-slate-800' : ''}`}
                    onClick={() => isEditingStructure && handleRenameCategory(cat)}
                    title={isEditingStructure ? "Нажмите, чтобы переименовать раздел" : ""}
                  >
                    {cat}
                  </h4>
                  {isEditingStructure && (
                    <button onClick={() => handleDeleteCategory(cat)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {Object.entries(subs).map(([sub, list]) => (
                  <div key={sub} className="space-y-1">
                    {/* ЗАГОЛОВОК ПОДРАЗДЕЛА */}
                    <div className="flex items-center justify-between group pl-2">
                      <h5 
                        className={`text-xs font-medium text-slate-600 ${isEditingStructure ? 'cursor-pointer hover:underline text-slate-800' : ''}`}
                        onClick={() => isEditingStructure && handleRenameSubcategory(cat, sub)}
                        title={isEditingStructure ? "Нажмите, чтобы переименовать подраздел" : ""}
                      >
                        {sub}
                      </h5>
                      {isEditingStructure && (
                        <button onClick={() => handleDeleteSubcategory(cat, sub)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 px-2 text-[10px] text-slate-400 uppercase font-semibold mb-1">
                      <span className="flex-1 pl-2">Навык</span>
                      <span className="w-14 text-center">Сейчас</span>
                      <span className="w-14 text-center">План</span>
                      <span className="w-14 text-center">Итог</span>
                      <span className="w-10 text-center">Дин.</span>
                      {isEditingStructure && <span className="w-8"></span>}
                    </div>

                    {list.map(skill => {
                      const data = scores[skill.id] || { current: 0, plan: 0, fact: 0 }
                      const progress = data.fact > 0 && data.current > 0 ? data.fact - data.current : null

                      return (
                        <div key={skill.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-slate-50">
                          <span 
                            className={`flex-1 pl-2 text-sm text-slate-700 ${isEditingStructure ? 'cursor-pointer hover:underline' : ''}`}
                            onClick={() => isEditingStructure && handleRenameSkill(skill.id, skill.skill_name)}
                            title={isEditingStructure ? "Нажмите, чтобы переименовать" : ""}
                          >
                            {skill.skill_name}
                          </span>
                          
                          <input type="number" min="0" max="10" value={data.current || ''} onChange={(e) => handleScoreChange(skill.id, 'current', e.target.value)} className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500" placeholder="0" />
                          <input type="number" min="0" max="10" value={data.plan || ''} onChange={(e) => handleScoreChange(skill.id, 'plan', e.target.value)} className="w-14 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm text-blue-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0" />
                          <input type="number" min="0" max="10" value={data.fact || ''} onChange={(e) => handleScoreChange(skill.id, 'fact', e.target.value)} className="w-14 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-center text-sm text-red-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold" placeholder="0" />

                          <div className="w-10 flex justify-center">
                            {progress !== null && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${progress > 0 ? 'text-green-700 bg-green-100' : progress < 0 ? 'text-red-700 bg-red-100' : 'text-slate-500 bg-slate-100'}`}>
                                {progress > 0 ? `+${progress}` : progress === 0 ? '0' : progress}
                              </span>
                            )}
                          </div>

                          {isEditingStructure && (
                            <button onClick={() => handleDeleteSkill(skill.id)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlayerSkills(props: Props) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Загрузка навыков...</div>}>
      <PlayerSkillsContent {...props} />
    </Suspense>
  )
}