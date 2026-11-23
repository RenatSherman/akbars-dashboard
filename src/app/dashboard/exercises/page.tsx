"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X } from "lucide-react";

type Exercise = { id: string; category: string; subcategory: string; name: string; };

export default function ExercisesPage() {
  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState<Exercise[]>([]);
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});
  
  // Модалка
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalType, setModalType] = useState<"category" | "subcategory" | "exercise">("exercise");
  const [modalTarget, setModalTarget] = useState<any>(null);
  const [formCategory, setFormCategory] = useState("");
  const [formSubcategory, setFormSubcategory] = useState("");
  const [formName, setFormName] = useState("");

  useEffect(() => {
    fetchExercises();
  }, []);

  async function fetchExercises() {
    setLoading(true);
    const { data } = await supabase.from("exercises").select("*");
    if (data) setStructure(data);
    setLoading(false);
  }

  const grouped = useMemo(() => {
    const res: Record<string, Record<string, Exercise[]>> = {};
    for (const s of structure) {
      if (!res[s.category]) res[s.category] = {};
      if (!res[s.category][s.subcategory]) res[s.category][s.subcategory] = [];
      res[s.category][s.subcategory].push(s);
    }
    return res;
  }, [structure]);

  function toggleNode(key: string) { setOpenNodes(prev => ({ ...prev, [key]: !prev[key] })); }

  function openAddModal(type: "category" | "subcategory" | "exercise", target: any) {
    setModalMode("add"); setModalType(type); setModalTarget(target);
    setFormCategory(target?.category || ""); setFormSubcategory(target?.subcategory || ""); setFormName("");
    setModalOpen(true);
  }
  function openEditModal(type: "category" | "subcategory" | "exercise", target: any) {
    setModalMode("edit"); setModalType(type); setModalTarget(target);
    setFormCategory(target.category || ""); setFormSubcategory(target.subcategory || ""); setFormName(target.name || "");
    setModalOpen(true);
  }

  async function handleModalSave() {
    if (!formCategory.trim()) return alert("Введите раздел");
    if (modalMode === "add") {
      if (modalType === "category") {
        await supabase.from("exercises").insert({ category: formCategory.trim(), subcategory: "Основное", name: "Новое упражнение" });
      } else if (modalType === "subcategory") {
        await supabase.from("exercises").insert({ category: modalTarget.category, subcategory: formSubcategory.trim(), name: "Новое упражнение" });
      } else {
        if (!formSubcategory.trim() || !formName.trim()) return alert("Заполните поля");
        await supabase.from("exercises").insert({ category: modalTarget.category, subcategory: modalTarget.subcategory, name: formName.trim() });
      }
    } else {
      await supabase.from("exercises").update({ category: formCategory.trim(), subcategory: formSubcategory.trim(), name: formName.trim() || modalTarget.name }).eq("id", modalTarget.id);
    }
    setModalOpen(false);
    await fetchExercises();
  }

  async function handleDeleteNode(type: "category" | "subcategory" | "exercise", target: any) {
    let query = supabase.from("exercises").delete();
    if (type === "category") {
      if (!confirm(`Удалить раздел "${target.category}"?`)) return;
      query = query.eq("category", target.category);
    } else if (type === "subcategory") {
      if (!confirm(`Удалить подраздел "${target.subcategory}"?`)) return;
      query = query.eq("category", target.category).eq("subcategory", target.subcategory);
    } else {
      if (!confirm(`Удалить упражнение "${target.name}"?`)) return;
      query = query.eq("id", target.id);
    }
    await query;
    await fetchExercises();
  }

  if (loading) return <div className="text-center py-20">Загрузка...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Справочник упражнений</h1>
          <p className="text-slate-500 text-sm">Управление базой упражнений</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => openAddModal("category", null)}>
          <Plus className="w-4 h-4 mr-1" /> Раздел
        </Button>
      </div>

      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="space-y-4">
            {Object.keys(grouped).length === 0 && <p className="text-sm text-slate-500">Справочник пуст. Добавьте раздел.</p>}
            {Object.keys(grouped).map(cat => {
              const isCatOpen = openNodes[`cat-${cat}`] !== false;
              return (
                <div key={cat} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                  <div className="bg-slate-100 px-3 py-2 border-b select-none">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleNode(`cat-${cat}`)}>
                      <div className="flex items-center gap-2">
                        {isCatOpen ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                        <span className="font-bold text-slate-900 text-sm">{cat}</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-1">
                      <button onClick={() => openAddModal("subcategory", { category: cat })} className="text-slate-500 hover:text-green-600 transition"><Plus className="w-4 h-4" /></button>
                      <button onClick={() => openEditModal("category", { category: cat, id: grouped[cat][Object.keys(grouped[cat])[0]]?.[0]?.id || "" })} className="text-slate-500 hover:text-blue-600 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteNode("category", { category: cat })} className="text-slate-500 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  
                  {isCatOpen && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {Object.keys(grouped[cat]).map(subcat => {
                        const isOpen = openNodes[`${cat}-${subcat}`];
                        const items = grouped[cat][subcat];
                        return (
                          <div key={subcat}>
                            <div className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition cursor-pointer" onClick={() => toggleNode(`${cat}-${subcat}`)}>
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                <span className="font-medium">{subcat}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{items.length}</span>
                              </div>
                            </div>
                            {isOpen && (
                              <div className="px-3 pb-3 pt-1 space-y-2">
                                <div className="flex justify-end gap-3 mb-2">
                                  <button onClick={(e) => { e.stopPropagation(); openAddModal("exercise", { category: cat, subcategory: subcat }); }} className="text-slate-500 hover:text-green-600 transition"><Plus className="w-4 h-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); openEditModal("subcategory", { category: cat, subcategory: subcat, id: items[0].id }); }} className="text-slate-500 hover:text-blue-600 transition"><Pencil className="w-4 h-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteNode("subcategory", { category: cat, subcategory: subcat }); }} className="text-slate-500 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                {items.map(ex => (
                                  <div key={ex.id} className="group flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                                    <span className="text-sm text-slate-700">{ex.name}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                      <button onClick={() => openEditModal("exercise", ex)} className="text-slate-400 hover:text-blue-600"><Pencil className="w-3 h-3" /></button>
                                      <button onClick={() => handleDeleteNode("exercise", ex)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-slate-900">{modalMode === "add" ? "Добавить" : "Изменить"} {modalType === "category" ? "раздел" : modalType === "subcategory" ? "подраздел" : "упражнение"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {(modalType === "category" || modalMode === "edit") && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Раздел</label>
                  <Input value={formCategory} onChange={e => setFormCategory(e.target.value)} disabled={modalType !== "category" && modalMode === "add"} placeholder="Например: Катание" />
                </div>
              )}
              {(modalType === "subcategory" || modalType === "exercise" || modalMode === "edit") && modalType !== "category" && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Подраздел</label>
                  <Input value={formSubcategory} onChange={e => setFormSubcategory(e.target.value)} disabled={modalType === "exercise" && modalMode === "add"} placeholder="Например: Скольжение" />
                </div>
              )}
              {(modalType === "exercise" || modalMode === "edit") && modalType !== "category" && modalType !== "subcategory" && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Название упражнения</label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Например: Змейка" />
                </div>
              )}
              {modalType === "subcategory" && modalMode === "add" && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Название подраздела</label>
                  <Input value={formSubcategory} onChange={e => setFormSubcategory(e.target.value)} placeholder="Например: Скольжение" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Отмена</Button>
              <Button onClick={handleModalSave} className="bg-[#c8102e] hover:bg-[#a00d25] text-white">Сохранить</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}