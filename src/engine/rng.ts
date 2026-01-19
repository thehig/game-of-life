export class Rng {
  private state: number;
  private readonly seed: number;

  constructor(seed: number) {
    // Force into uint32 and avoid 0-state degeneracy.
    const s = seed >>> 0;
    this.seed = s === 0 ? 0x6d2b79f5 : s;
    this.state = s === 0 ? 0x6d2b79f5 : s;
  }

  public getSeed(): number {
    return this.seed;
  }

  public getState(): number {
    return this.state >>> 0;
  }

  public setState(state: number): void {
    const s = state >>> 0;
    this.state = s === 0 ? 0x6d2b79f5 : s;
  }

  // Mulberry32
  public nextUint32(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  public nextFloat(): number {
    return this.nextUint32() / 0x100000000;
  }

  public nextInt(minInclusive: number, maxExclusive: number): number {
    if (maxExclusive <= minInclusive) return minInclusive;
    const span = maxExclusive - minInclusive;
    return minInclusive + Math.floor(this.nextFloat() * span);
  }
}

