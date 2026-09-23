export type Member = { id: string; name: string; avatar: string };
export type Family = { id: string; name: string; realtime_key: string; code?: string };

export type Category = {
  id: string;
  family_id: string;
  name: string;
  icon: string;
  sort_order: number;
};

export type TelegramRecipient = {
  id: string;
  family_id: string;
  chat_id: number;
  label: string;
  enabled: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  family_id?: string;
  category_id?: string | null;
  name: string;
  emoji: string;
  icon?: string;
  icon_source?: "auto" | "manual";
  unit: string;
  default_quantity: number;
  default_note: string | null;
  use_count: number;
  last_ordered_at: string | null;
};

export type ShoppingList = {
  id: string;
  family_id: string;
  created_by: string | null;
  order_no: string | null;
  status: "active" | "done" | "cancelled";
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};

export type ListItem = {
  id: string;
  list_id: string;
  product_id: string | null;
  name_snapshot: string;
  emoji: string;
  quantity: number;
  unit: string;
  note: string | null;
  is_purchased: boolean;
  purchased_at: string | null;
  added_by: string | null;
};

/** รายการที่กำลังเลือกในเครื่อง (ยังไม่ส่ง) — เก็บใน localStorage */
export type DraftItem = { q: number; n: string };
export type Draft = Record<string, DraftItem>;

/** ของรอบก่อนที่จะนำกลับมาเลือกใหม่ */
export type ReorderItem = { productId: string; q: number; n: string };

export type Person = {
  id: string;
  family_id: string;
  name: string;
  avatar: string;
  kind: "child" | "adult";
  created_at: string;
};

export type Appointment = {
  id: string;
  family_id: string;
  person_id: string;
  title: string;
  category: string | null;
  appointment_at: string;
  location: string | null;
  note: string | null;
  remind_before_hours: number | null;
  status: "upcoming" | "done" | "cancelled";
  reminded_at: string | null;
  created_at: string;
  person?: Person;
};

export type RestockItem = {
  id: string;
  family_id: string;
  name: string;
  link: string | null;
  note: string | null;
  added_at: string;
  bought_at: string | null;
};

export type TodoPriority = "low" | "normal" | "high" | "urgent";
export type TodoStatus = "pending" | "done";

export type HouseTodo = {
  id: string;
  family_id: string;
  person_id: string | null;
  title: string;
  note: string | null;
  category: string | null;
  priority: TodoPriority;
  due_date: string | null;
  status: TodoStatus;
  completed_at: string | null;
  created_at: string;
  person?: Person | null;
};

