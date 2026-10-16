import { PolicyToggle } from '../core/types';

export class PolicyStore {
  private readonly toggles = new Map<string, PolicyToggle>();

  setToggle(toggle: PolicyToggle): void {
    this.toggles.set(this.getKey(toggle), toggle);
  }

  removeToggle(discId: string, scope: PolicyToggle['scope'], roomId?: string, userId?: string): void {
    this.toggles.delete(this.getKey({ discId, enabled: true, scope, roomId, userId }));
  }

  isEnabled(discId: string, context: { roomId?: string; userId?: string }): boolean {
    const globalToggle = this.toggles.get(this.getKey({ discId, enabled: true, scope: 'global' }));
    if (globalToggle && globalToggle.enabled === false) {
      return false;
    }

    if (context.roomId) {
      const roomToggle = this.toggles.get(this.getKey({ discId, enabled: true, scope: 'room', roomId: context.roomId }));
      if (roomToggle && roomToggle.enabled === false) {
        return false;
      }
    }

    if (context.userId) {
      const userToggle = this.toggles.get(this.getKey({ discId, enabled: true, scope: 'user', userId: context.userId }));
      if (userToggle && userToggle.enabled === false) {
        return false;
      }
    }

    return true;
  }

  private getKey(toggle: PolicyToggle): string {
    const scope = toggle.scope;
    if (scope === 'room') {
      return `${toggle.discId}:room:${toggle.roomId ?? 'all'}`;
    }
    if (scope === 'user') {
      return `${toggle.discId}:user:${toggle.userId ?? 'all'}`;
    }
    return `${toggle.discId}:global`;
  }
}
