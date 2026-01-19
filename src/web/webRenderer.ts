import { CreatureRenderer } from "../engine/creature.js";

export class WebRenderer implements CreatureRenderer {
  private ctx: CanvasRenderingContext2D;
  private startX = 0;
  private startY = 0;
  private cellSizePx = 18;
  private cols = 0;
  private rows = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setViewport(startX: number, startY: number, cols: number, rows: number, cellSizePx: number): void {
    this.startX = startX;
    this.startY = startY;
    this.cols = cols;
    this.rows = rows;
    this.cellSizePx = cellSizePx;
  }

  public drawCell(x: number, y: number, color: string): void {
    const vx = x - this.startX;
    const vy = y - this.startY;
    if (vx < 0 || vy < 0 || vx >= this.cols || vy >= this.rows) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(vx * this.cellSizePx, vy * this.cellSizePx, this.cellSizePx, this.cellSizePx);
  }

  public drawText(x: number, y: number, text: string): void {
    const vx = x - this.startX;
    const vy = y - this.startY;
    if (vx < 0 || vy < 0 || vx >= this.cols || vy >= this.rows) return;
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = `${Math.max(10, Math.floor(this.cellSizePx * 0.6))}px sans-serif`;
    this.ctx.fillText(text, vx * this.cellSizePx + 2, vy * this.cellSizePx + this.cellSizePx - 4);
  }
}

