/**
 * FocusModeManager handles the client-side state switching and
 * local/session storage persistence for Focus Mode.
 */
export class FocusModeManager {
  private storage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  private body: { classList: { add(className: string): void; remove(className: string): void; toggle(className: string): boolean } };

  constructor(
    storage: { getItem(key: string): string | null; setItem(key: string, value: string): void },
    body: { classList: { add(className: string): void; remove(className: string): void; toggle(className: string): boolean } }
  ) {
    this.storage = storage;
    this.body = body;
  }

  /** Read state from storage and apply to body. */
  init(): void {
    const enabled = this.storage.getItem('focus-mode') === 'true';
    if (enabled) {
      this.body.classList.add('focus-mode');
    } else {
      this.body.classList.remove('focus-mode');
    }
  }

  /** Toggle the focus-mode class and update storage. */
  toggle(): boolean {
    const enabled = this.body.classList.toggle('focus-mode');
    this.storage.setItem('focus-mode', enabled ? 'true' : 'false');
    return enabled;
  }
}
