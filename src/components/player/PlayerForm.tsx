"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, AlertCircle, Image as ImageIcon, Upload, Loader2 } from "lucide-react";

const GROUPS = ["Звездочки", "Общая группа", "Спецгруппа"];

type Props = {
  player: any;
  setPlayer: (p: any) => void;
  age: number | null;
  onSave: () => void;
  saving: boolean;
};

export function PlayerForm({ player, setPlayer, age, onSave, saving }: Props) {
  const [uploading, setUploading] = useState(false);

  // Функция загрузки фото в Supabase Storage
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Генерируем уникальное имя файла
      const fileName = `${player.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Загружаем в бакет player-photos
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Получаем публичную ссылку
      const { data } = supabase.storage.from('player-photos').getPublicUrl(filePath);
      
      // Обновляем состояние игрока
      setPlayer({ ...player, photo_url: data.publicUrl });
      
    } catch (error: any) {
      alert('Ошибка загрузки фото: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-slate-900">Анкета игрока</CardTitle>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        
        {/* БЛОК ФОТО */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4 relative">
          {player.photo_url ? (
            <img 
              src={player.photo_url} 
              alt={player.fio} 
              className="w-32 h-32 object-cover rounded-full border-4 border-white shadow-sm mb-2"
            />
          ) : (
            <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center mb-2">
              <ImageIcon className="w-12 h-12 text-slate-400" />
            </div>
          )}
          
          <label className="cursor-pointer flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Загрузка...' : 'Загрузить фото'}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleUploadPhoto}
              disabled={uploading}
            />
          </label>
        </div>

        {/* ФИО */}
        <div>
          <label className="text-xs font-medium text-slate-500">ФИО</label>
          <Input value={player.fio || ""} onChange={(e) => setPlayer({ ...player, fio: e.target.value })} />
        </div>
        
        {/* Дата рождения и Возраст */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Дата рождения</label>
            <Input type="date" value={player.birth_date || ""} onChange={(e) => setPlayer({ ...player, birth_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Возраст</label>
            <div className="flex h-10 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {age !== null ? `${age} ${age % 10 === 1 && age % 100 !== 11 ? "год" : [2,3,4].includes(age % 10) && ![12,13,14].includes(age % 100) ? "года" : "лет"}` : "—"}
            </div>
          </div>
        </div>

        {/* Рост и Вес */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Рост</label>
            <Input type="number" value={player.height || ""} onChange={(e) => setPlayer({ ...player, height: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Вес</label>
            <Input type="number" value={player.weight || ""} onChange={(e) => setPlayer({ ...player, weight: Number(e.target.value) })} />
          </div>
        </div>

        {/* Амплуа и Хват */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Амплуа</label>
            <Input value={player.position || ""} onChange={(e) => setPlayer({ ...player, position: e.target.value })} placeholder="Нападающий" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Хват</label>
            <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={player.grip || ""} onChange={(e) => setPlayer({ ...player, grip: e.target.value })}>
              <option value="">—</option>
              <option value="Правый">Правый</option>
              <option value="Левый">Левый</option>
            </select>
          </div>
        </div>

        {/* Город и Школа */}
        <div>
          <label className="text-xs font-medium text-slate-500">Город рождения</label>
          <Input value={player.birth_city || ""} onChange={(e) => setPlayer({ ...player, birth_city: e.target.value })} placeholder="Например: Казань" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">Первая школа</label>
          <Input value={player.first_school || ""} onChange={(e) => setPlayer({ ...player, first_school: e.target.value })} placeholder="Например: Ак Барс или Спартак" />
        </div>

        {player.first_school && player.first_school.trim().toLowerCase() !== "ак барс" && (
          <div className="bg-red-50 p-2 rounded-md border border-red-100">
            <label className="text-xs font-medium text-[#c8102e]">Дата перехода в систему «Ак Барс»</label>
            <Input type="date" value={player.transfer_date || ""} onChange={(e) => setPlayer({ ...player, transfer_date: e.target.value })} className="border-red-200 focus:ring-[#c8102e]" />
          </div>
        )}

        {/* Команда и Группа */}
        <div>
          <label className="text-xs font-medium text-slate-500">Команда</label>
          <Input value={player.team || ""} onChange={(e) => setPlayer({ ...player, team: e.target.value })} placeholder="Например: Ак Барс 2008" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">Группа</label>
          <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={player.group_name} onChange={(e) => setPlayer({ ...player, group_name: e.target.value })}>
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* КРАТКАЯ ХАРАКТЕРИСТИКА */}
        <div className="pt-2 border-t mt-2">
          <label className="text-xs font-medium text-slate-500">Краткая характеристика (сильные/слабые стороны)</label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none min-h-[80px]"
            value={player.characteristic || ""}
            onChange={(e) => setPlayer({ ...player, characteristic: e.target.value })}
            placeholder="Например: Отличный бросок, но нужно работать над катанием..."
          />
        </div>

        {/* БЛОК ТРАВМ */}
        <div className="pt-2 border-t mt-2">
          <div className="flex items-center gap-2 mb-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <label className="text-xs font-bold uppercase">Травмы и ограничения</label>
          </div>
          <textarea
            className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 focus:border-red-400 focus:outline-none min-h-[80px]"
            value={player.injuries || ""}
            onChange={(e) => setPlayer({ ...player, injuries: e.target.value })}
            placeholder="Например: 12.10.2025 - Вывих плеча (пропущено 2 недели)..."
          />
        </div>
      </CardContent>
    </Card>
  );
}