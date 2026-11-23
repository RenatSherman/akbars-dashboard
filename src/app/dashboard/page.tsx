import { redirect } from "next/navigation";

export default function DashboardPage() {
  // При заходе на /dashboard автоматически перекидываем на /dashboard/calendar
  redirect("/dashboard/calendar");
}