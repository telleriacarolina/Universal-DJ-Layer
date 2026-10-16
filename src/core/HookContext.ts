import { DiscContext, DiscHook } from './types';

export class HookContext implements DiscContext {
  hook: DiscHook;
  roomId?: string;
  userId?: string;
  roles: string[];
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  requestId: string;
  [key: string]: unknown;

  constructor(init: Partial<DiscContext> & { hook: DiscHook; payload?: Record<string, unknown> }) {
    this.hook = init.hook;
    this.roomId = init.roomId;
    this.userId = init.userId;
    this.roles = init.roles ?? [];
    this.payload = init.payload ?? {};
    this.metadata = init.metadata ?? {};
    this.requestId = init.requestId ?? `req_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }
}
