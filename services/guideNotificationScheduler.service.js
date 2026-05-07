/**
 * services/guideNotificationScheduler.service.js
 *
 * Schedules one-off alerts for ChecklistTask due_times using setTimeout.
 * On server restart, call schedulePendingGuideAlerts() once from index.js
 * to re-hydrate in-memory timers from the database.
 *
 * Note: setTimeout is limited to ~24.8 days. Tasks scheduled further out
 * than that will not fire until a restart re-schedules them. This is
 * acceptable per the "do not over-engineer" requirement.
 */

import prisma from "../lib/prisma.js";
import { sendOneSignalNotification } from "../utils/notifications.js";

const MAX_TIMEOUT_MS = 2_147_483_647; // ~24.8 days

/**
 * Schedule a single alert for one ChecklistTask.
 * Safe to call multiple times – if the task is already due/past, it fires
 * immediately (next tick) so the DB state is still reconciled.
 *
 * @param {{ id: string, due_time: Date, userId: string, flightId: string, title: string }} task
 */
export function scheduleTaskAlert(task) {
  const delay = Math.max(0, task.due_time.getTime() - Date.now());

  if (delay > MAX_TIMEOUT_MS) {
    // Too far in the future – will be re-scheduled on next server restart.
    console.log(
      `[GuideScheduler] Task ${task.id} is too far in the future (${Math.round(delay / 86_400_000)} days). Skipping in-memory schedule.`
    );
    return;
  }

  setTimeout(async () => {
    try {
      const fresh = await prisma.checklistTask.findUnique({
        where: { id: task.id },
      });

      if (!fresh) return; // deleted
      if (fresh.status === "COMPLETE") return; // already done
      if (fresh.alertSent) return; // already notified

      await sendOneSignalNotification({
        userId: fresh.userId,
        flightId: fresh.flightId,
        type: "Alert",
        title: "Journey Reminder",
        message: `Time to: ${fresh.title}`,
        reaction_code: "PROMPT",
        voiceScript: `Reminder: ${fresh.title}`,
        deepLinkAction: `orion://checklist/${fresh.id}`,
        data: {
          event: "CHECKLIST_TASK_DUE",
          taskId: fresh.id,
        },
      });

      await prisma.checklistTask.update({
        where: { id: fresh.id },
        data: { alertSent: true },
      });

      console.log(`[GuideScheduler] Alert sent for task ${fresh.id}: "${fresh.title}"`);
    } catch (err) {
      console.error(`[GuideScheduler] Error firing alert for task ${task.id}:`, err);
    }
  }, delay);
}

/**
 * Called once at startup (from index.js).
 * Finds all future PENDING tasks with alertSent=false and re-schedules them.
 */
export async function schedulePendingGuideAlerts() {
  try {
    const tasks = await prisma.checklistTask.findMany({
      where: {
        status: "PENDING",
        alertSent: false,
        guideId: { not: null }, // only guide-generated tasks
        due_time: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        flightId: true,
        title: true,
        due_time: true,
      },
    });

    console.log(`[GuideScheduler] Re-scheduling ${tasks.length} pending guide alert(s) on startup.`);

    for (const task of tasks) {
      scheduleTaskAlert(task);
    }
  } catch (err) {
    console.error("[GuideScheduler] Failed to load pending alerts on startup:", err);
  }
}
