'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PlayerForm } from '@/components/player/PlayerForm'
import { PlayerCalendar } from '@/components/player/PlayerCalendar'
import PlayerSkills from '@/components/player/PlayerSkills'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PlayerPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Загрузка карточки игрока...</div>}>
        <PlayerPageContent />
      </Suspense>
    </div>
  )
}

function PlayerPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const playerId = params.id as string

  const [player, setPlayer] = useState<any>(null)
  const [seasonId, setSeasonId] = useState<string>('')
  const [trainings, setTrainings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!playerId) return

    const loadData = async () => {
      setLoading(true)

      // 1. Загружаем игрока
      const { data: playerData } = await supabase.from('players').select('*').eq('id', playerId).single()
      setPlayer(playerData)

      // 2. Определяем сезон (сначала из URL, потом из localStorage, потом активный)
      const urlSeasonId = searchParams.get('season')
      const savedSeasonId = localStorage.getItem('active_season_id')
      
      if (urlSeasonId) {
        setSeasonId(urlSeasonId)
      } else if (savedSeasonId) {
        setSeasonId(savedSeasonId)
      } else {
        const { data: seasonData } = await supabase.from('seasons').select('id').eq('is_active', true).maybeSingle()
        if (seasonData) setSeasonId(seasonData.id)
      }

      // 3. Загружаем тренировки
      const { data: trainingsData } = await supabase.from('training_players').select(`training_id, trainings (*)`).eq('player_id', playerId)

      const actualTrainings = trainingsData
        ?.map((tp: any) => tp.trainings)
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.training_date).getTime() - new Date(a.training_date).getTime()) || []

      setTrainings(actualTrainings)
      setLoading(false)
    }

    loadData()
  }, [playerId, searchParams])

  const handleSaveProfile = async () => {
    if (!player) return
    setSaving(true)
    const { error } = await supabase.from('players').update({
      fio: player.fio,
      birth_date: player.birth_date,
      position: player.position,
      grip: player.grip,
      height: player.height,
      weight: player.weight,
      birth_city: player.birth_city,
      first_school: player.first_school,
      transfer_date: player.transfer_date,
      team: player.team,
      group_name: player.group_name,
      characteristic: player.characteristic,
      injuries: player.injuries,
      photo_url: player.photo_url
    }).eq('id', player.id)
    
    setSaving(false)
    if (error) {
      alert('Ошибка сохранения: ' + error.message)
    } else {
      alert('Данные игрока сохранены!')
    }
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Загрузка данных...</div>
  if (!player) return <div className="p-8 text-center text-red-500">Игрок не найден</div>

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/players" className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{player.fio}</h1>
          <p className="text-sm text-slate-500">
            {player.position} • {player.group_name || 'Без группы'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PlayerForm 
            player={player} 
            setPlayer={setPlayer} 
            age={calculateAge(player.birth_date)} 
            onSave={handleSaveProfile}
            saving={saving}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <PlayerSkills playerId={player.id} seasonId={seasonId} />
          <PlayerCalendar trainings={trainings} />
        </div>
      </div>
    </>
  )
}