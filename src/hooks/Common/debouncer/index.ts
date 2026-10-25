export class Debouncer {
  private timeoutId: NodeJS.Timeout | null = null;
  private delay: number;
  private callback: (value: string) => void;

  constructor(callback: (value: string) => void, delay: number = 500) {
    this.callback = callback;
    this.delay = delay;
  }

  public debounce(value: string): void {
    // Xóa timeout trước đó nếu có
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Tạo timeout mới
    this.timeoutId = setTimeout(() => {
      this.callback(value);
    }, this.delay);
  }

  public dispose(): void {
    // Xóa timeout khi component unmount
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
