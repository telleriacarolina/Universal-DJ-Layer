import { Disc, DiscHook } from './types';

export class DiscRegistry {
  private readonly discs = new Map<string, Disc>();

  register(disc: Disc): void {
    this.discs.set(disc.id, disc);
  }

  unregister(id: string): boolean {
    return this.discs.delete(id);
  }

  get(id: string): Disc | undefined {
    return this.discs.get(id);
  }

  getAll(): Disc[] {
    return Array.from(this.discs.values()).sort((left, right) => left.priority - right.priority);
  }

  getForHook(hook: DiscHook): Disc[] {
    return this.getAll().filter(disc => disc.supports.includes(hook));
  }

  clear(): void {
    this.discs.clear();
  }
}
