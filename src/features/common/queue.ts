import { Queue } from "@/features/audio/audio-queue";

export class QueueContainer {
  private static instance: QueueContainer;
  private queue: Queue<any>;

  private constructor() {
    this.queue = new Queue();
  }

  public static getInstance(): QueueContainer {
    if (!QueueContainer.instance) {
      QueueContainer.instance = new QueueContainer();
    }

    return QueueContainer.instance;
  }

  public getQueue(): Queue<any> {
    return this.queue;
  }
}
