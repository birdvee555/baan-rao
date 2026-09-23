import { cache } from "react";
import { DEFAULT_CATEGORIES } from "./categories";
import { db } from "./db";
import type { Appointment, Category, HouseTodo, ListItem, Member, Person, Product, RestockItem, ShoppingList } from "./types";

const num = (v: unknown) => Number(v);

function toProduct(r: Record<string, unknown>): Product {
  const icon = (r.icon as string) || (r.emoji as string) || "📦";
  return {
    ...(r as unknown as Product),
    icon,
    emoji: icon,
    icon_source: (r.icon_source as "auto" | "manual") || "auto",
    category_id: (r.category_id as string | undefined) || null,
    default_quantity: num(r.default_quantity),
  };
}
function toItem(r: Record<string, unknown>): ListItem {
  return { ...(r as unknown as ListItem), quantity: num(r.quantity) };
}

export const getCategories = cache(async (familyId: string): Promise<Category[]> => {
  try {
    const { data, error } = await db()
      .from("categories")
      .select("id,family_id,name,icon,sort_order")
      .eq("family_id", familyId)
      .order("sort_order");

    if (!error && data && data.length > 0) {
      return data as Category[];
    }

    // หากยังไม่มี category ให้สร้าง 4 หมวดเริ่มต้นให้อัตโนมัติ
    const inserts = DEFAULT_CATEGORIES.map((c) => ({
      family_id: familyId,
      name: c.name,
      icon: c.icon,
      sort_order: c.sort_order,
    }));
    const { data: created } = await db()
      .from("categories")
      .insert(inserts)
      .select("id,family_id,name,icon,sort_order")
      .order("sort_order");

    if (created && created.length > 0) {
      return created as Category[];
    }
  } catch (err) {
    console.error("Categories lookup:", err);
  }

  return DEFAULT_CATEGORIES.map((c) => ({
    id: `cat_${c.name}`,
    family_id: familyId,
    name: c.name,
    icon: c.icon,
    sort_order: c.sort_order,
  }));
});

export const getProducts = cache(async (familyId: string): Promise<Product[]> => {
  const queryWithFullFields = await db()
    .from("products")
    .select("id,category_id,name,emoji,icon,icon_source,unit,default_quantity,default_note,use_count,last_ordered_at")
    .eq("family_id", familyId)
    .is("archived_at", null);

  if (queryWithFullFields.data && queryWithFullFields.data.length > 0) {
    return queryWithFullFields.data.map((r) => toProduct(r as Record<string, unknown>));
  }

  // หากตารางยังไม่มีคอลัมน์ใหม่ (42703 หรือ PGRST204) ให้ fallback ดึงเฉพาะคอลัมน์พื้นฐาน
  if (
    queryWithFullFields.error &&
    (queryWithFullFields.error.code === "42703" ||
      queryWithFullFields.error.code === "PGRST204" ||
      queryWithFullFields.error.message?.includes("column") ||
      queryWithFullFields.error.message?.includes("schema cache"))
  ) {
    const queryFallback = await db()
      .from("products")
      .select("id,category_id,name,emoji,unit,default_quantity,default_note,use_count,last_ordered_at")
      .eq("family_id", familyId)
      .is("archived_at", null);

    if (queryFallback.data && queryFallback.data.length > 0) {
      return queryFallback.data.map((r) => toProduct(r as Record<string, unknown>));
    }

    if (
      queryFallback.error &&
      (queryFallback.error.code === "42703" ||
        queryFallback.error.code === "PGRST204" ||
        queryFallback.error.message?.includes("column") ||
        queryFallback.error.message?.includes("schema cache"))
    ) {
      const queryBasic = await db()
        .from("products")
        .select("id,name,emoji,unit,default_quantity,default_note,use_count,last_ordered_at")
        .eq("family_id", familyId)
        .is("archived_at", null);
      return (queryBasic.data ?? []).map((r) => toProduct(r as Record<string, unknown>));
    }
  }

  return (queryWithFullFields.data ?? []).map((r) => toProduct(r as Record<string, unknown>));
});

export const getMembers = cache(async (familyId: string): Promise<Member[]> => {
  const { data } = await db()
    .from("family_members")
    .select("id,name,avatar")
    .eq("family_id", familyId)
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as Member[];
});

async function itemsOf(listId: string): Promise<ListItem[]> {
  const { data } = await db()
    .from("shopping_list_items")
    .select("*")
    .eq("list_id", listId)
    .order("created_at");
  return (data ?? []).map(toItem);
}

/** รายการที่กำลังซื้อ (มีได้ใบเดียวต่อครอบครัว) */
export const getActive = cache(
  async (familyId: string): Promise<{ list: ShoppingList | null; items: ListItem[] }> => {
    const { data } = await db()
      .from("shopping_lists")
      .select("*")
      .eq("family_id", familyId)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return { list: null, items: [] };
    return { list: data as ShoppingList, items: await itemsOf(data.id) };
  },
);

/** รายการล่าสุดของครอบครัว (ไม่ว่าจะซื้อเสร็จแล้วหรือยัง) ไว้ใช้ "สั่งเหมือนครั้งที่แล้ว" — ข้ามใบที่ถูกยกเลิก */
export const getLastList = cache(
  async (familyId: string): Promise<{ list: ShoppingList; items: ListItem[] } | null> => {
    const { data } = await db()
      .from("shopping_lists")
      .select("*")
      .eq("family_id", familyId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return { list: data as ShoppingList, items: await itemsOf(data.id) };
  },
);

export type HistoryRow = {
  list: ShoppingList;
  count: number;
  members: string[]; // member ids ที่เพิ่มของในรอบนั้น
};

export type MonthlySummary = {
  activeAndDoneRounds: number;
  totalItemsCount: number;
  top10Products: Array<{ name: string; emoji: string; count: number; unit: string }>;
};

export async function getHistory(
  familyId: string,
  options?: { month?: string; search?: string; limit?: number },
): Promise<{ rows: HistoryRow[]; summary?: MonthlySummary; availableMonths: string[] }> {
  const limit = options?.limit ?? 100;

  // ดึงรายการทั้งหมดเพื่อดูเดือนที่มีข้อมูล
  const { data: allLists } = await db()
    .from("shopping_lists")
    .select("id,created_at,order_no,status")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  // รวบรวมเดือนที่มีทั้งหมด (Format: YYYY-MM)
  const monthSet = new Set<string>();
  for (const l of allLists ?? []) {
    const d = new Date(l.created_at);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthSet.add(ym);
  }
  const availableMonths = Array.from(monthSet);

  // กรอง query ตาม options
  let query = db()
    .from("shopping_lists")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (options?.search?.trim()) {
    const s = options.search.trim().replace(/^#/, "");
    query = query.ilike("order_no", `%${s}%`);
  }

  const { data: lists } = await query.limit(limit);
  if (!lists?.length) {
    return { rows: [], availableMonths };
  }

  // กรองตามเดือนใน JS ถ้ามีการระบุ
  let filteredLists = lists as ShoppingList[];
  if (options?.month) {
    filteredLists = filteredLists.filter((l) => {
      const d = new Date(l.created_at);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return ym === options.month;
    });
  }

  const { data: items } = await db()
    .from("shopping_list_items")
    .select("list_id,added_by,name_snapshot,emoji,unit,quantity")
    .in("list_id", filteredLists.map((l) => l.id));

  const rows: HistoryRow[] = filteredLists.map((list) => {
    const mine = (items ?? []).filter((i) => i.list_id === list.id);
    return {
      list,
      count: mine.length,
      members: [...new Set(mine.map((i) => i.added_by).filter((x): x is string => !!x))],
    };
  });

  // คำนวณสรุปประจำเดือน (ถ้ามีการเลือกเดือน หรือเดือนล่าสุด)
  const activeLists = filteredLists.filter((l) => l.status !== "cancelled");
  const activeListIds = new Set(activeLists.map((l) => l.id));
  const activeItems = (items ?? []).filter((i) => activeListIds.has(i.list_id));

  const prodCountMap = new Map<string, { name: string; emoji: string; count: number; unit: string }>();
  for (const it of activeItems) {
    const key = it.name_snapshot;
    const cur = prodCountMap.get(key) || {
      name: it.name_snapshot,
      emoji: it.emoji,
      count: 0,
      unit: it.unit,
    };
    cur.count += 1;
    prodCountMap.set(key, cur);
  }

  const top10Products = Array.from(prodCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const summary: MonthlySummary = {
    activeAndDoneRounds: activeLists.length,
    totalItemsCount: activeItems.length,
    top10Products,
  };

  return { rows, summary, availableMonths };
}

export async function getListDetail(
  familyId: string,
  listId: string,
): Promise<{ list: ShoppingList; items: ListItem[] } | null> {
  const { data } = await db()
    .from("shopping_lists")
    .select("*")
    .eq("id", listId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (!data) return null;
  return { list: data as ShoppingList, items: await itemsOf(data.id) };
}

export const getPeople = cache(async (familyId: string): Promise<Person[]> => {
  try {
    const { data, error } = await db()
      .from("people")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as Person[];
  } catch {
    return [];
  }
});

export const getAppointments = cache(async (familyId: string): Promise<Appointment[]> => {
  try {
    const [apptsRes, people] = await Promise.all([
      db()
        .from("appointments")
        .select("*")
        .eq("family_id", familyId)
        .order("appointment_at", { ascending: true }),
      getPeople(familyId),
    ]);

    if (apptsRes.error || !apptsRes.data) return [];
    const peopleMap = new Map(people.map((p) => [p.id, p]));
    return (apptsRes.data as Appointment[]).map((a) => ({
      ...a,
      person: peopleMap.get(a.person_id),
    }));
  } catch {
    return [];
  }
});

export const getUpcomingAppointmentsCount = cache(async (familyId: string): Promise<number> => {
  try {
    const { count, error } = await db()
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("status", "upcoming")
      .gte("appointment_at", new Date().toISOString());
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
});

export const getRestockItems = cache(async (familyId: string): Promise<RestockItem[]> => {
  try {
    const { data, error } = await db()
      .from("restock_items")
      .select("*")
      .eq("family_id", familyId)
      .is("bought_at", null)
      .order("added_at", { ascending: false });
    if (error || !data) return [];
    return data as RestockItem[];
  } catch {
    return [];
  }
});

export const getUnboughtRestockCount = cache(async (familyId: string): Promise<number> => {
  try {
    const { count, error } = await db()
      .from("restock_items")
      .select("*", { count: "exact", head: true })
      .eq("family_id", familyId)
      .is("bought_at", null);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
});

export const getHouseTodos = cache(async (familyId: string): Promise<HouseTodo[]> => {
  try {
    const [todosRes, people] = await Promise.all([
      db()
        .from("house_todos")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false }),
      getPeople(familyId),
    ]);

    if (todosRes.error || !todosRes.data) return [];
    const peopleMap = new Map(people.map((p) => [p.id, p]));
    return (todosRes.data as HouseTodo[]).map((t) => ({
      ...t,
      person: t.person_id ? peopleMap.get(t.person_id) || null : null,
    }));
  } catch {
    return [];
  }
});

export const getPendingTodosCount = cache(async (familyId: string): Promise<number> => {
  try {
    const { count, error } = await db()
      .from("house_todos")
      .select("*", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("status", "pending");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
});
