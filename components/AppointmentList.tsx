"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Appointment, Person } from "@/lib/types";
import {
  saveAppointment,
  savePerson,
  updateAppointmentStatus,
} from "@/lib/actions/appointments";
import { relDay, thaiDate, thaiTime } from "@/lib/format";

type Props = {
  initialAppointments: Appointment[];
  initialPeople: Person[];
};

const CATEGORIES = ["หมอ", "ฟัน", "วัคซีน", "โรงเรียน", "อื่นๆ"];
const REMIND_OPTIONS = [
  { label: "ไม่เตือน", hours: null },
  { label: "3 ชม.", hours: 3 },
  { label: "1 วัน (24 ชม.)", hours: 24 },
  { label: "3 วัน (72 ชม.)", hours: 72 },
  { label: "1 สัปดาห์ (168 ชม.)", hours: 168 },
];

const AVATARS = ["🧒", "👧", "👶", "🧑", "👩", "👨", "👵", "👴", "🐱", "🐶"];

export default function AppointmentList({
  initialAppointments,
  initialPeople,
}: Props) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  // Form states for Appointment
  const [formPersonId, setFormPersonId] = useState<string>("");
  const [formTitle, setFormTitle] = useState("");
  const [formDateTime, setFormDateTime] = useState("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formRemindHours, setFormRemindHours] = useState<number | null>(24);
  const [formCustomHours, setFormCustomHours] = useState<string>("");
  const [formLocation, setFormLocation] = useState("");
  const [formNote, setFormNote] = useState("");

  // Form states for New Person inline
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonAvatar, setNewPersonAvatar] = useState("🧒");
  const [newPersonKind, setNewPersonKind] = useState<"child" | "adult">("child");

  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  }

  // แยกใกล้ถึง กับ ผ่านไปแล้ว
  const upcomingList = useMemo(() => {
    return appointments
      .filter((a) => a.status === "upcoming")
      .sort((a, b) => new Date(a.appointment_at).getTime() - new Date(b.appointment_at).getTime());
  }, [appointments]);

  const pastList = useMemo(() => {
    return appointments
      .filter((a) => a.status !== "upcoming")
      .sort((a, b) => new Date(b.appointment_at).getTime() - new Date(a.appointment_at).getTime());
  }, [appointments]);

  const currentList = tab === "upcoming" ? upcomingList : pastList;

  const filteredList = useMemo(() => {
    if (selectedCat === "all") return currentList;
    return currentList.filter((a) => a.category === selectedCat);
  }, [currentList, selectedCat]);

  function openCreate() {
    setEditingAppt(null);
    setFormPersonId(people[0]?.id || "");
    setFormTitle("");
    // Default to tomorrow 09:00 in local time
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm for datetime-local
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setFormDateTime(localISOTime);
    setFormCategory("");
    setFormRemindHours(24);
    setFormCustomHours("");
    setFormLocation("");
    setFormNote("");
    setAddingPerson(false);
    setSheetOpen(true);
  }

  function openEdit(a: Appointment) {
    setEditingAppt(a);
    setFormPersonId(a.person_id);
    setFormTitle(a.title);
    const d = new Date(a.appointment_at);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setFormDateTime(localISOTime);
    setFormCategory(a.category || "");
    setFormRemindHours(a.remind_before_hours);
    const standard = REMIND_OPTIONS.some((o) => o.hours === a.remind_before_hours);
    setFormCustomHours(standard ? "" : String(a.remind_before_hours || ""));
    setFormLocation(a.location || "");
    setFormNote(a.note || "");
    setAddingPerson(false);
    setSheetOpen(true);
  }

  function handleSavePerson(e: React.FormEvent) {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    startTransition(async () => {
      const res = await savePerson({
        name: newPersonName.trim(),
        avatar: newPersonAvatar,
        kind: newPersonKind,
      });
      if (res.ok) {
        setPeople((prev) => [...prev, res.person]);
        setFormPersonId(res.person.id);
        setAddingPerson(false);
        setNewPersonName("");
        flash(`เพิ่ม "${res.person.name}" แล้ว`);
      } else {
        flash(res.error);
      }
    });
  }

  function handleSaveAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formPersonId || !formDateTime) return;

    const remindHours = formCustomHours
      ? Number(formCustomHours)
      : formRemindHours;

    startTransition(async () => {
      const res = await saveAppointment({
        id: editingAppt?.id,
        personId: formPersonId,
        title: formTitle.trim(),
        category: formCategory || null,
        appointmentAt: new Date(formDateTime).toISOString(),
        location: formLocation.trim() || null,
        note: formNote.trim() || null,
        remindBeforeHours: remindHours,
      });

      if (res.ok) {
        const person = people.find((p) => p.id === formPersonId);
        const saved = { ...res.appointment, person };
        setAppointments((prev) => {
          if (editingAppt) {
            return prev.map((a) => (a.id === saved.id ? saved : a));
          }
          return [...prev, saved];
        });
        setSheetOpen(false);
        flash(editingAppt ? "แก้ไขนัดหมายแล้ว" : "สร้างนัดหมายสำเร็จ");
        router.refresh();
      } else {
        flash(res.error);
      }
    });
  }

  function handleStatus(id: string, status: "done" | "cancelled") {
    startTransition(async () => {
      const res = await updateAppointmentStatus(id, status);
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
        flash(status === "done" ? "บันทึกว่าเสร็จแล้ว ✓" : "ยกเลิกนัดแล้ว");
        router.refresh();
      } else {
        flash(res.error);
      }
    });
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
          <h1 className="text-2xl font-black text-ink">📅 นัดหมาย</h1>
          <p className="mt-0.5 text-xs font-medium text-ink-soft">
            {upcomingList.length > 0
              ? `มีนัดหมายใกล้ถึง ${upcomingList.length} รายการ`
              : "ไม่มีนัดหมายที่ค้างอยู่"}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-mint-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-mint-800 active:scale-95"
        >
          <span>＋</span>
          <span>เพิ่มนัด</span>
        </button>
      </div>

      {/* ── Tabs: ใกล้ถึง / ผ่านไปแล้ว ── */}
      <div className="flex rounded-2xl bg-mint-100/60 p-1">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
            tab === "upcoming"
              ? "bg-white text-ink shadow-2xs"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          ใกล้ถึง ({upcomingList.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("past")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
            tab === "past"
              ? "bg-white text-ink shadow-2xs"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          ผ่านไปแล้ว ({pastList.length})
        </button>
      </div>

      {/* ── หมวดหมู่ชิป ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCat("all")}
          className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
            selectedCat === "all"
              ? "bg-mint-700 text-white shadow-2xs"
              : "border border-mint-200 bg-white text-ink-soft hover:bg-mint-50"
          }`}
        >
          ทั้งหมด
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedCat(c)}
            className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              selectedCat === c
                ? "bg-mint-700 text-white shadow-2xs"
                : "border border-mint-200 bg-white text-ink-soft hover:bg-mint-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ── รายการนัดหมาย ── */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-mint-200 p-8 text-center bg-white/50">
            <p className="text-4xl">📅</p>
            <p className="mt-2 text-sm font-bold text-ink">
              {tab === "upcoming" ? "ไม่มีนัดหมายใกล้ถึง" : "ไม่มีประวัตินัดหมาย"}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              แตะปุ่ม "＋ เพิ่มนัด" เพื่อสร้างนัดใหม่ได้เลย
            </p>
          </div>
        ) : (
          filteredList.map((a) => {
            const isUpcoming = a.status === "upcoming";
            const relStr = relDay(a.appointment_at);
            const dateStr = thaiDate(a.appointment_at);
            const timeStr = thaiTime(a.appointment_at);

            return (
              <div
                key={a.id}
                className={`rounded-3xl border-2 p-4 transition-all shadow-sm ${
                  isUpcoming
                    ? "border-mint-200/90 bg-white"
                    : "border-slate-200/70 bg-slate-50/70 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-mint-50 to-emerald-100 text-2xl shadow-2xs">
                      {a.person?.avatar || "🧒"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-mint-800">
                          {a.person?.name || "คนในบ้าน"}
                        </span>
                        {a.category ? (
                          <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-bold text-mint-800">
                            {a.category}
                          </span>
                        ) : null}
                        {a.status === "done" ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            ✓ เสร็จแล้ว
                          </span>
                        ) : null}
                        {a.status === "cancelled" ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            ยกเลิกแล้ว
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-0.5 text-base font-bold text-ink leading-tight">
                        {a.title}
                      </h3>
                    </div>
                  </div>

                  {isUpcoming ? (
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="rounded-xl border border-mint-200 bg-mint-50/60 px-2.5 py-1 text-xs font-bold text-mint-700 hover:bg-mint-100 active:scale-95"
                    >
                      แก้ไข
                    </button>
                  ) : null}
                </div>

                {/* วันเวลา & สถานที่ & หมายเหตุ */}
                <div className="mt-3 space-y-1.5 border-t border-mint-100/60 pt-2.5 text-xs text-ink-soft">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">
                      ⏰ {relStr} ({dateStr}) เวลา {timeStr} น.
                    </span>
                    {a.remind_before_hours ? (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/60">
                        🔔 เตือนก่อน {a.remind_before_hours} ชม.
                      </span>
                    ) : null}
                  </div>

                  {a.location ? (
                    <p className="flex items-center gap-1.5 truncate">
                      <span>📍</span>
                      <span>{a.location}</span>
                    </p>
                  ) : null}

                  {a.note ? (
                    <p className="text-ink-soft/90 italic">
                      "{a.note}"
                    </p>
                  ) : null}
                </div>

                {/* ปุ่มแอคชัน: เสร็จแล้ว / ยกเลิก */}
                {isUpcoming ? (
                  <div className="mt-3.5 flex gap-2 pt-2 border-t border-mint-100/60">
                    <button
                      type="button"
                      onClick={() => handleStatus(a.id, "done")}
                      disabled={pending}
                      className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 active:scale-98"
                    >
                      ✓ เสร็จแล้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatus(a.id, "cancelled")}
                      disabled={pending}
                      className="rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-98"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* ── Sheet เพิ่ม/แก้นัด ── */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border-2 border-mint-200 bg-white p-6 shadow-xl animate-slide sm:animate-pop max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-mint-100">
              <h2 className="text-lg font-black text-ink">
                {editingAppt ? "✏️ แก้ไขนัดหมาย" : "＋ เพิ่มนัดหมายใหม่"}
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-ink-soft hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="mt-4 space-y-4">
              {/* 1. เลือกคนในบ้าน */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-ink-soft">
                    นัดของใคร <span className="text-rose-500">*</span>
                  </label>
                  {!addingPerson ? (
                    <button
                      type="button"
                      onClick={() => setAddingPerson(true)}
                      className="text-xs font-bold text-mint-700 hover:underline"
                    >
                      ＋ เพิ่มคนใหม่
                    </button>
                  ) : null}
                </div>

                {addingPerson ? (
                  <div className="rounded-2xl border-2 border-mint-200 bg-mint-50/40 p-3 mb-2 space-y-2.5">
                    <p className="text-xs font-bold text-mint-900">เพิ่มคนในบ้าน</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="ชื่อคน เช่น น้องไผ่, คุณแม่"
                        className="h-10 flex-1 rounded-xl border border-mint-200 bg-white px-3 text-xs font-bold text-ink outline-none"
                      />
                      <select
                        value={newPersonKind}
                        onChange={(e) => setNewPersonKind(e.target.value as "child" | "adult")}
                        className="h-10 rounded-xl border border-mint-200 bg-white px-2 text-xs font-bold text-ink outline-none"
                      >
                        <option value="child">เด็ก 🧒</option>
                        <option value="adult">ผู้ใหญ่ 🧑</option>
                      </select>
                    </div>
                    {/* เลือก Avatar */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {AVATARS.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setNewPersonAvatar(av)}
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-lg ${
                            newPersonAvatar === av ? "bg-mint-700 text-white shadow-xs" : "bg-white"
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSavePerson}
                        className="flex-1 rounded-xl bg-mint-700 py-1.5 text-xs font-bold text-white shadow-xs"
                      >
                        บันทึกคนใหม่
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingPerson(false)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-soft"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : null}

                {people.length === 0 && !addingPerson ? (
                  <div className="rounded-2xl border border-dashed border-mint-300 p-3 text-center">
                    <p className="text-xs text-ink-soft mb-1.5">ยังไม่มีข้อมูลคนในบ้าน</p>
                    <button
                      type="button"
                      onClick={() => setAddingPerson(true)}
                      className="rounded-xl bg-mint-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                    >
                      ＋ เพิ่มคนแรกในบ้าน
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {people.map((p) => {
                      const isSel = formPersonId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setFormPersonId(p.id)}
                          className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                            isSel
                              ? "bg-mint-700 text-white shadow-xs"
                              : "border border-mint-200 bg-white text-ink hover:bg-mint-50"
                          }`}
                        >
                          <span>{p.avatar}</span>
                          <span>{p.name}</span>
                          <span className="text-[10px] opacity-75">
                            ({p.kind === "child" ? "เด็ก" : "ผู้ใหญ่"})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. หัวข้อนัดหมาย */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  หัวข้อนัดหมาย <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น สอบคณิต, ฉีดวัคซีน, พบหมอฟัน"
                  className="h-12 w-full rounded-2xl border-2 border-mint-200 bg-white px-4 text-sm font-bold text-ink placeholder:text-ink-soft/50 outline-none focus:border-mint-600 shadow-2xs"
                />
              </div>

              {/* 3. วันและเวลา */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  วันและเวลานัด <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formDateTime}
                  onChange={(e) => setFormDateTime(e.target.value)}
                  className="h-12 w-full rounded-2xl border-2 border-mint-200 bg-white px-4 text-sm font-bold text-ink outline-none focus:border-mint-600 shadow-2xs"
                />
              </div>

              {/* 4. ชิปประเภท (หมอ/ฟัน/วัคซีน/โรงเรียน/อื่นๆ) */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  ประเภทนัดหมาย
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(formCategory === cat ? "" : cat)}
                      className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                        formCategory === cat
                          ? "bg-mint-700 text-white shadow-2xs"
                          : "border border-mint-200 bg-white text-ink-soft hover:bg-mint-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. ชิปเตือนล่วงหน้า */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  เตือนผ่าน Telegram ล่วงหน้า
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {REMIND_OPTIONS.map((opt) => {
                    const isSel = formRemindHours === opt.hours && !formCustomHours;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setFormRemindHours(opt.hours);
                          setFormCustomHours("");
                        }}
                        className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                          isSel
                            ? "bg-amber-600 text-white shadow-2xs"
                            : "border border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-ink-soft">หรือระบุเอง:</span>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={formCustomHours}
                    onChange={(e) => {
                      setFormCustomHours(e.target.value);
                      if (e.target.value) setFormRemindHours(Number(e.target.value));
                    }}
                    placeholder="เช่น 12"
                    className="h-8 w-20 rounded-xl border border-mint-200 px-2 text-center text-xs font-bold outline-none"
                  />
                  <span className="text-xs text-ink-soft">ชั่วโมงก่อนนัด</span>
                </div>
              </div>

              {/* 6. สถานที่ / หมายเหตุ */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1">
                    สถานที่ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="เช่น รพ.กรุงเทพ, โรงเรียนอนุบาล"
                    className="h-10 w-full rounded-xl border border-mint-200 bg-white px-3 text-xs font-medium text-ink outline-none focus:border-mint-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1">
                    หมายเหตุ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="เช่น งดน้ำและอาหารก่อนตรวจ"
                    className="h-10 w-full rounded-xl border border-mint-200 bg-white px-3 text-xs font-medium text-ink outline-none focus:border-mint-600"
                  />
                </div>
              </div>

              {/* ปุ่มบันทึก */}
              <div className="flex gap-2 pt-2">
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
                  disabled={pending || !formTitle.trim() || !formPersonId || !formDateTime}
                  className="h-12 flex-1 rounded-2xl bg-mint-700 font-bold text-white shadow-sm hover:bg-mint-800 active:scale-98 disabled:opacity-50"
                >
                  {pending ? "กำลังบันทึก…" : "บันทึกนัด"}
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
