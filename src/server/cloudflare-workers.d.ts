declare module "cloudflare:workers" {
  export class DurableObject {
    protected ctx: {
      storage: {
        get<T>(key: string): Promise<T | undefined>;
        put<T>(key: string, value: T): Promise<void>;
        setAlarm(scheduledTime: number | Date): Promise<void>;
      };
    };
    constructor(ctx: unknown, env: unknown);
  }
}
