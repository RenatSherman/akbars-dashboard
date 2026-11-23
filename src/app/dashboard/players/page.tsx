"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, User, Plus, ChevronRight } from "lucide-react";

type Player = {
  id: string;
  fio: string;
  group_name: string;
  photo_url: string | null;
  birth_date: string | null;
  position: string | null;
  team: string | null;
};

const GROUPS = ["Звездочки", "Общая группа", "Спецгруппа"];

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("Все");

  useEffect(() => {
    async function fetchPlayers() {
      const { data, error } = await supabase.from("players").select("id, fio, group_name, photo_url, birth_date, position, team").order("fio");
      if (!error && data) setPlayers(data);
      setLoading(false);
    }
    fetchPlayers();
  }, []);

  // Фильтрация по поиску и таблеткам
  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.fio.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = activeGroup === "Все" || p.group_name === activeGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Игроки</h1>
          <p className="text-slate-500 text-sm">Состав команды и аналитика</p>
        </div>
        <Link href="/dashboard/players/new">
          <Button variant="outline" className="border-[#0a2e22] text-[#0a2e22] hover:bg-[#0a2e22]/10">
            <Plus className="w-4 h-4 mr-2" /> Добавить игрока
          </Button>
        </Link>
      </div>

      {/* Фильтры и Поиск */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {["Все", ...GROUPS].map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                activeGroup === g
                  ? "border-[#c8102e] text-[#c8102e] bg-red-50/30 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Поиск по ФИО..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {/* Таблица игроков */}
      <Card className="overflow-hidden border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-16">Фото</th>
                <th className="px-4 py-3">ФИО</th>
                <th className="px-4 py-3">Группа</th>
                <th className="px-4 py-3">Амплуа</th>
                <th className="px-4 py-3">Команда</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Загрузка...</td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Игроки не найдены.</td>
                </tr>
              ) : (
                filteredPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition group">
                    <td className="px-4 py-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.fio} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-900">
                      <Link href={`/dashboard/players/${p.id}`} className="hover:text-[#c8102e] transition">
                        {p.fio}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {p.group_name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{p.position || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{p.team || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/dashboard/players/${p.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-400 group-hover:text-[#c8102e] group-hover:bg-red-50 transition">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}