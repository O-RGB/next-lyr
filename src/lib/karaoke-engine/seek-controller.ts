export type SeekRunner = (
  targetSeconds: number,
  generation: number
) => Promise<void>;

interface PendingSeek {
  targetSeconds: number;
  generation: number;
  resolve: () => void;
  reject: (error: unknown) => void;
}

/** Serialize seeks and retain only the newest queued scrub request. */
export class SeekController {
  private generation = 0;
  private pending: PendingSeek | null = null;
  private processingPromise: Promise<void> | null = null;

  constructor(private readonly run: SeekRunner) {}

  request(targetSeconds: number): Promise<void> {
    const generation = ++this.generation;
    this.pending?.resolve();

    return new Promise<void>((resolve, reject) => {
      this.pending = { targetSeconds, generation, resolve, reject };
      this.processPending();
    });
  }

  invalidate(): void {
    this.generation += 1;
    const pending = this.pending;
    this.pending = null;
    pending?.resolve();
  }

  isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  private processPending(): void {
    if (this.processingPromise) return;

    const process = async () => {
      while (this.pending) {
        const request = this.pending;
        this.pending = null;
        try {
          await this.run(request.targetSeconds, request.generation);
          request.resolve();
        } catch (error) {
          request.reject(error);
        }
      }
    };

    this.processingPromise = process().finally(() => {
      this.processingPromise = null;
      if (this.pending) this.processPending();
    });
  }
}

