"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PreparationTask } from "@/types/domain";
import { togglePreparationTaskAction } from "@/server/actions/order-lifecycle";

export function PreparationChecklist({ orderId, tasks }: { orderId: string; tasks: PreparationTask[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.isCompleted).length;

  async function handleToggle(task: PreparationTask) {
    setPendingId(task.id);
    const result = await togglePreparationTaskAction({
      taskId: task.id,
      isCompleted: !task.isCompleted,
      orderId,
    });
    if (result.success) router.refresh();
    setPendingId(null);
  }

  if (tasks.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm text-ink/60">
        {completedCount} / {tasks.length} tasks completed
      </p>
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <label key={task.id} className="flex items-center gap-3 py-1.5">
            <input
              type="checkbox"
              checked={task.isCompleted}
              disabled={pendingId === task.id}
              onChange={() => handleToggle(task)}
              className="h-4 w-4 accent-marigold"
            />
            <span className={task.isCompleted ? "text-ink/40 line-through" : ""}>{task.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
