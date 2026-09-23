import TodoList from "@/components/TodoList";
import { requireMember } from "@/lib/auth";
import { getHouseTodos, getPeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const { family } = await requireMember();
  const [todos, people] = await Promise.all([
    getHouseTodos(family.id),
    getPeople(family.id),
  ]);

  return <TodoList initialTodos={todos} people={people} />;
}
