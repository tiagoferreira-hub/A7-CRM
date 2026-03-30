import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Task {
  id: string;
  title: string;
  leadId: string | null;
  assignedTo: string;
  dueDate: string | null;
  status: "todo" | "in_progress" | "done";
  createdAt: string;
}

interface TasksContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  loading: boolean;
}

const TasksContext = createContext<TasksContextType | null>(null);

export const useTasks = () => {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
};

const rowToTask = (row: any): Task => ({
  id: row.id,
  title: row.title,
  leadId: row.lead_id,
  assignedTo: row.assigned_to,
  dueDate: row.due_date,
  status: row.status,
  createdAt: row.created_at,
});

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!activeCompanyId) { setTasks([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false });
    setTasks(data?.map(rowToTask) ?? []);
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const addTask = useCallback(async (task: Omit<Task, "id" | "createdAt">) => {
    if (!activeCompanyId) return;
    const { data } = await supabase
      .from("tasks")
      .insert({
        company_id: activeCompanyId,
        title: task.title,
        lead_id: task.leadId,
        assigned_to: task.assignedTo,
        due_date: task.dueDate,
        status: task.status,
      })
      .select()
      .single();
    if (data) setTasks(prev => [rowToTask(data), ...prev]);
  }, [activeCompanyId]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.leadId !== undefined) dbUpdates.lead_id = updates.leadId;
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    await supabase.from("tasks").update(dbUpdates).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask, loading }}>
      {children}
    </TasksContext.Provider>
  );
};
