import { CreatureRenderer } from "../creature.js";

export class CliRenderer implements CreatureRenderer {
  private width = 0;
  private height = 0;
  private startX = 0;
  private startY = 0;
  private buffer: string[] = [];

  public beginFrame(options: { startX: number; startY: number; width: number; height: number }): void {
    this.startX = options.startX;
    this.startY = options.startY;
    this.width = options.width;
    this.height = options.height;
    this.buffer = Array.from({ length: this.width * this.height }, () => " ");
  }

  public drawCell(x: number, y: number, _color: string): void {
    const vx = x - this.startX;
    const vy = y - this.startY;
    if (vx < 0 || vy < 0 || vx >= this.width || vy >= this.height) return;
    this.buffer[vy * this.width + vx] = "O";
  }

  public drawText(x: number, y: number, text: string): void {
    const vx = x - this.startX;
    const vy = y - this.startY;
    if (vx < 0 || vy < 0 || vx >= this.width || vy >= this.height) return;
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i += 1) {
      const tx = vx + i;
      if (tx >= this.width) break;
      this.buffer[vy * this.width + tx] = chars[i] ?? " ";
    }
  }

  public toLines(): string[] {
    const lines: string[] = [];
    for (let y = 0; y < this.height; y += 1) {
      lines.push(this.buffer.slice(y * this.width, (y + 1) * this.width).join(""));
    }
    return lines;
  }
}

