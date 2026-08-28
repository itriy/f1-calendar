import { refreshNewsFeedSafely } from "./newsFeed";
import { sendDueRaceReminders, type D1Database } from "./push";

type Env = {
  PUSH_DB?: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};
type ScheduledController = {
  scheduledTime: number;
  cron: string;
  noRetry(): void;
};
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void };

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      Promise.all([sendDueRaceReminders(env), refreshNewsFeedSafely(env)]),
    );
  },
};
