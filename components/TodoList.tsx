"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { HouseTodo, Person, TodoPriority } from "@/lib/types";
import { deleteTodo, saveTodo, toggleTodoStatus } from "@/lib/actions/todos";
import { relDay, thaiDate } from "@/lib/format";

type Props = {
  initialTodos: HouseTodo[];
  people: Person[];
};

const CATEGORIES = [
  { label: "งานบ้าน", icon: "🧹" },
  { label: "ซ่อมแซม", icon: "🔧" },
  { label: "ติดต่อช่าง", icon: "📞" },
  { label: "จ่ายบิล", icon: "💡" },
  { label: "ซื้อของ", icon: "🛍️" },
  { label: "อื่นๆ", icon: "📌" },
];

const PRIORITIES: Array<{ key: TodoPriority; label: string; badgeClass: string }> = [
  { key: "urgent", label: "🔴 ด่วนมาก", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  { key: "high", label: "🟠 สำคัญ", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "normal", label: "🟢 ปกติ", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "low", label: "⚪ เรื่อยๆ", badgeClass: "bg-slate-50 text-slate-600 border-slate-200" },
];

export default function TodoList({ initialTodos, people }: Props) {
  const router = useRouter();
  const [todos, setTodos] = useState<HouseTodo[]>(initialTodos);
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<HouseTodo | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formPriority, setFormPriority] = useState<TodoPriority>("normal");
  const [formPersonId, setFormPersonId] = useState<string>("");
  const [formDueDate, setFormDueDate] = useState<string>("");

  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  }

  const pendingList = useMemo(() => {
    return todos.filter((t) => t.status === "pending");
  }, [todos]);

  const doneList = useMemo(() => {
    return todos.filter((t) => t.status === "done");
  }, [todos]);

  const currentList = tab === "pending" ? pendingList : doneList;

  const filteredList = useMemo(() => {
    if (selectedCat === "all") return currentList;
    return currentList.filter((t) => t.category === selectedCat);
  }, [currentList, selectedCat]);

  function openCreate() {
    setEditingTodo(null);
    setFormTitle("");
    setFormNote("");
    setFormCategory("");
    setFormPriority("normal");
    setFormPersonId("");
    setFormDueDate("");
    setSheetOpen(true);
  }

  function openEdit(t: HouseTodo) {
    setEditingTodo(t);
    setFormTitle(t.title);
    setFormNote(t.note || "");
    setFormCategory(t.category || "");
    setFormPriority(t.priority || "normal");
    setFormPersonId(t.person_id || "");
    setFormDueDate(t.due_date ? t.due_date.slice(0, 10) : "");
    setSheetOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;

    startTransition(async () => {
      const res = await saveTodo({
        id: editingTodo?.id,
        title: formTitle.trim(),
        note: formNote.trim() || null,
        category: formCategory || null,
        priority: formPriority,
        personId: formPersonId || null,
        dueDate: formDueDate || null,
      });

      if (res.ok) {
        const assignedPerson = people.find((p) => p.id === formPersonId) || null;
        const saved: HouseTodo = { ...res.todo, person: assignedPerson };

        setTodos((prev) => {
          if (editingTodo) {
            return prev.map((item) => (item.id === saved.id ? saved : item));
          }
          return [saved, ...prev];
        });

        setSheetOpen(false);
        flash(editingTodo ? "แก้ไขรายการแล้ว" : "เพิ่มงานใหม่สำเร็จ");
        router.refresh();
      } else {
        flash(res.error);
      }
    });
  }

  function handleToggle(t: HouseTodo) {
    const nextStatus = t.status === "pending" ? "done" : "pending";
    // Optimistic update
    setTodos((prev) =>
      prev.map((item) =>
        item.id === t.id
          ? {
              ...item,
              status: nextStatus,
              completed_at: nextStatus === "done" ? new Date().toISOString() : null,
            }
          : item
      )
    );

    startTransition(async () => {
      const res = await toggleTodoStatus(t.id, nextStatus);
      if (res.ok) {
        flash(nextStatus === "done" ? "ทำเสร็จแล้ว เยี่ยมมาก! 🎉" : "ย้ายกลับมาสิ่งที่ต้องทำ");
        router.refresh();
      } else {
        // Rollback
        setTodos((prev) =>
          prev.map((item) => (item.id === t.id ? t : item))
        );
        flash(res.error);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("ต้องการลบรายการนี้ใช่ไหม?")) return;

    startTransition(async () => {
      const res = await deleteTodo(id);
      if (res.ok) {
        setTodos((prev) => prev.filter((item) => item.id !== id));
        setSheetOpen(false);
        flash("ลบรายการแล้ว");
        router.refresh();
      } else {
        flash(res.error);
      }
    });
  }

  function formatDue(dateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);

    const isOverdue = due.getTime() < today.getTime();
    const rel = relDay(dateStr);

    return {
      text: rel,
      isOverdue,
    };
  }

  return (
    <div className="space-y-5 pt-2">
      {/* ── ปุ่มย้อนกลับ ── */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>หน้าหลัก</span>
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">📝 สิ่งที่ต้องทำในบ้าน</h1>
          <p className="mt-0.5 text-xs font-medium text-ink-soft">
            {pendingList.length > 0
              ? `เหลืองานที่ต้องทำ ${pendingList.length} อย่าง`
              : "ไม่มีงานค้าง จัดการครบแล้ว!"}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-purple-800 active:scale-95"
        >
          <span>＋</span>
          <span>เพิ่มงาน</span>
        </button>
      </div>

      {/* ── Tabs: สิ่งที่ต้องทำ / เสร็จแล้ว ── */}
      <div className="flex rounded-2xl bg-purple-100/60 p-1">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
            tab === "pending"
              ? "bg-white text-ink shadow-2xs"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          สิ่งที่ต้องทำ ({pendingList.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("done")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
            tab === "done"
              ? "bg-white text-ink shadow-2xs"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          เสร็จแล้ว ({doneList.length})
        </button>
      </div>

      {/* ── หมวดหมู่ชิป ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCat("all")}
          className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
            selectedCat === "all"
              ? "bg-purple-700 text-white shadow-2xs"
              : "border border-purple-200 bg-white text-ink-soft hover:bg-purple-50"
          }`}
        >
          ทั้งหมด
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setSelectedCat(c.label)}
            className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              selectedCat === c.label
                ? "bg-purple-700 text-white shadow-2xs"
                : "border border-purple-200 bg-white text-ink-soft hover:bg-purple-50"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* ── รายการสิ่งที่ต้องทำ ── */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-purple-200 p-8 text-center bg-white/50">
            <p className="text-4xl">✨</p>
            <p className="mt-2 text-sm font-bold text-ink">
              {tab === "pending" ? "ไม่มีงานที่ต้องทำ" : "ยังไม่มีรายการที่เสร็จ"}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {tab === "pending"
                ? "แตะปุ่ม \"＋ เพิ่มงาน\" เพื่อจดบันทึกงานบ้านใหม่ได้เลย"
                : "งานที่ทำเสร็จแล้วจะถูกย้ายมารวมไว้ที่นี่"}
            </p>
          </div>
        ) : (
          filteredList.map((t) => {
            const isDone = t.status === "done";
            const priorityConfig = PRIORITIES.find((p) => p.key === t.priority) || PRIORITIES[2];
            const dueInfo = t.due_date ? formatDue(t.due_date) : null;

            return (
              <div
                key={t.id}
                className={`group rounded-3xl border-2 p-4 transition-all shadow-sm ${
                  isDone
                    ? "border-slate-200/80 bg-slate-50/70 opacity-75"
                    : "border-purple-200/80 bg-white hover:border-purple-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggle(t)}
                    aria-label={isDone ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"}
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl border-2 transition-all active:scale-90 ${
                      isDone
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                        : "border-purple-300 bg-purple-50/50 hover:border-purple-500 text-transparent"
                    }`}
                  >
                    ✓
                  </button>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-base font-bold leading-snug transition-all ${
                          isDone ? "line-through text-ink-soft" : "text-ink"
                        }`}
                      >
                        {t.title}
                      </h3>
                    </div>

                    {t.note ? (
                      <p className="mt-1 text-xs text-ink-soft/90 leading-relaxed whitespace-pre-line">
                        {t.note}
                      </p>
                    ) : null}

                    {/* Tags & Badges */}
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                      {/* Priority */}
                      <span
                        className={`rounded-lg border px-2 py-0.5 font-bold ${priorityConfig.badgeClass}`}
                      >
                        {priorityConfig.label}
                      </span>

                      {/* Category */}
                      {t.category ? (
                        <span className="rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 font-bold text-purple-800">
                          {t.category}
                        </span>
                      ) : null}

                      {/* Person */}
                      {t.person ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-mint-200 bg-mint-50 px-2 py-0.5 font-bold text-mint-900">
                          <span>{t.person.avatar}</span>
                          <span>{t.person.name}</span>
                        </span>
                      ) : null}

                      {/* Due Date */}
                      {dueInfo ? (
                        <span
                          className={`rounded-lg border px-2 py-0.5 font-bold ${
                            isDone
                              ? "border-slate-200 bg-slate-100 text-slate-600"
                              : dueInfo.isOverdue
                              ? "border-rose-300 bg-rose-100 text-rose-800 animate-pulse"
                              : "border-sky-200 bg-sky-50 text-sky-800"
                          }`}
                        >
                          📅 {dueInfo.isOverdue && !isDone ? `เกินกำหนด (${dueInfo.text})` : dueInfo.text}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="shrink-0 rounded-xl border border-purple-200 bg-purple-50/60 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 active:scale-95"
                  >
                    แก้ไข
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Sheet เพิ่ม/แก้ไขงาน ── */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border-2 border-purple-200 bg-white p-6 shadow-xl animate-slide sm:animate-pop max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <h2 className="text-lg font-black text-ink">
                {editingTodo ? "✏️ แก้ไขสิ่งที่ต้องทำ" : "＋ เพิ่มสิ่งที่ต้องทำใหม่"}
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-ink-soft hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* 1. หัวข้อสิ่งที่ต้องทำ */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  สิ่งที่ต้องทำ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น ซ่อมก๊อกน้ำรั่ว, สั่งแก๊สหุงต้ม, ซักผ้าม่าน"
                  className="h-12 w-full rounded-2xl border-2 border-purple-200 bg-white px-4 text-sm font-bold text-ink placeholder:text-ink-soft/50 outline-none focus:border-purple-600 shadow-2xs"
                />
              </div>

              {/* 2. มอบหมายให้ใคร */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  มอบหมายให้ใคร
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setFormPersonId("")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                      !formPersonId
                        ? "bg-purple-700 text-white shadow-xs"
                        : "border border-purple-200 bg-white text-ink hover:bg-purple-50"
                    }`}
                  >
                    <span>🏡</span>
                    <span>ทุกคนในบ้าน</span>
                  </button>
                  {people.map((p) => {
                    const isSel = formPersonId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFormPersonId(p.id)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                          isSel
                            ? "bg-purple-700 text-white shadow-xs"
                            : "border border-purple-200 bg-white text-ink hover:bg-purple-50"
                        }`}
                      >
                        <span>{p.avatar}</span>
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. หมวดหมู่งาน */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  หมวดหมู่
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setFormCategory(formCategory === cat.label ? "" : cat.label)}
                      className={`shrink-0 rounded-2xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                        formCategory === cat.label
                          ? "bg-purple-700 text-white shadow-2xs"
                          : "border border-purple-200 bg-white text-ink-soft hover:bg-purple-50"
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. ความสำคัญ (Priority) */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  ความสำคัญ
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PRIORITIES.map((p) => {
                    const isSel = formPriority === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setFormPriority(p.key)}
                        className={`rounded-2xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                          isSel
                            ? "border-purple-600 bg-purple-700 text-white shadow-2xs"
                            : "border-slate-200 bg-white text-ink hover:bg-slate-50"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. กำหนดเสร็จ (Due Date) */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  กำหนดเสร็จ (ถ้ามี)
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="h-12 w-full rounded-2xl border-2 border-purple-200 bg-white px-4 text-sm font-bold text-ink outline-none focus:border-purple-600 shadow-2xs"
                />
              </div>

              {/* 6. รายละเอียดเพิ่มเติม (Note) */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  rows={3}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="เช่น เบอร์โทรช่าง 08X-XXX-XXXX หรือจุดที่ต้องซ่อม"
                  className="w-full rounded-2xl border border-purple-200 bg-white p-3 text-xs font-medium text-ink outline-none focus:border-purple-600"
                />
              </div>

              {/* ปุ่มบันทึก & ลบ */}
              <div className="flex gap-2 pt-2">
                {editingTodo ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingTodo.id)}
                    disabled={pending}
                    className="rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-98"
                  >
                    ลบ
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  disabled={pending}
                  className="h-12 flex-1 rounded-2xl border-2 border-slate-200 font-bold text-ink-soft hover:bg-slate-50 active:scale-98"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={pending || !formTitle.trim()}
                  className="h-12 flex-1 rounded-2xl bg-purple-700 font-bold text-white shadow-sm hover:bg-purple-800 active:scale-98 disabled:opacity-50"
                >
                  {pending ? "กำลังบันทึก…" : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Toast ── */}
      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90%] animate-slide rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
