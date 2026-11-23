import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Trophy } from "lucide-react";

export function PlayerCalendar({ trainings }: { trainings: any[] }) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-slate-900">Календарь тренировок игрока</CardTitle>
        <CardDescription>Назначенные тренировки и игры</CardDescription>
      </CardHeader>
      <CardContent>
        {trainings.length === 0 ? (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
            <p className="text-slate-400 text-sm">Пока нет назначенных событий.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trainings.map(t => (
              <div key={t.id} className="flex items-start gap-4 p-3 rounded-lg border border-slate-200 bg-white hover:border-[#0a2e22] transition">
                <div className="flex flex-col items-center justify-center bg-white border border-slate-200 text-slate-700 rounded-md w-14 h-14 shrink-0">
                  <span className="text-[10px] uppercase opacity-80">{new Date(t.training_date).toLocaleString('ru-RU', { month: 'short' }).replace('.', '')}</span>
                  <span className="text-xl font-bold leading-none">{new Date(t.training_date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    {t.event_type === "game" && <Trophy className="w-4 h-4 text-amber-500" />}
                    {t.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {t.start_time.slice(0,5)} — {t.end_time.slice(0,5)}</span>
                  </div>
                  {t.event_type === "game" && (t.opponent || t.score) && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded p-1 border border-amber-100 mt-1 inline-block">
                      {t.opponent && <span>Соперник: {t.opponent}. </span>}
                      {t.score && <span>Счет: {t.score}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}