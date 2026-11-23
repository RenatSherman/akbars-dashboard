"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type Training = {
  id: string;
  title: string;
  training_date: string;
  start_time: string;
  event_type: string;
  training_format: string | null;
};

type Props = {
  currentDate: Date;
  trainings: Training[];
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
  getEventColor: (t: any) => string;
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarGrid({ currentDate, trainings, selectedDate, onSelectDate, getEventColor }: Props) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startWeekday);
    const days = [];
    const todayIso = toISODate(new Date());

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const iso = toISODate(d);
      days.push({ date: d, iso, inMonth: d.getMonth() === month, isToday: iso === todayIso });
    }
    return days;
  }, [year, month]);

  const trainingsByDate = useMemo(() => {
    const map: Record<string, Training[]> = {};
    for (const t of trainings) {
      if (!map[t.training_date]) map[t.training_date] = [];
      map[t.training_date].push(t);
    }
    return map;
  }, [trainings]);

  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-3">
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((w) => <div key={w} className="text-center text-xs font-semibold text-slate-500 py-2">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayTrainings = trainingsByDate[day.iso] || [];
            const isSelected = selectedDate === day.iso;
            return (
              <button
                key={day.iso}
                onClick={() => onSelectDate(day.iso)}
                className={`
                  relative min-h-[90px] rounded-md border p-1.5 text-left transition
                  hover:border-[#c8102e] hover:bg-red-50/40
                  ${day.inMonth ? "bg-white" : "bg-slate-50 opacity-60"}
                  ${isSelected ? "border-[#c8102e] ring-1 ring-[#c8102e]" : "border-slate-200"}
                `}
              >
                <div className={`text-xs font-semibold mb-1 flex items-center justify-between ${day.isToday ? "text-[#c8102e]" : "text-slate-700"}`}>
                  <span className={day.isToday ? "bg-[#c8102e] text-white rounded-full w-5 h-5 flex items-center justify-center" : ""}>{day.date.getDate()}</span>
                  {dayTrainings.length > 0 && <span className="text-[10px] text-slate-400">{dayTrainings.length}</span>}
                </div>
                <div className="space-y-0.5">
                  {dayTrainings.slice(0, 2).map((t) => (
                    <div key={t.id} className={`text-[10px] leading-tight text-white rounded px-1 py-0.5 truncate ${getEventColor(t)}`}>
                      {t.start_time.slice(0, 5)} {t.title}
                    </div>
                  ))}
                  {dayTrainings.length > 2 && <div className="text-[10px] text-slate-500">+{dayTrainings.length - 2} ещё</div>}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}