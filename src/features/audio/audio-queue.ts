export class Queue<T> {
  private items: T[] = [];

  public enqueue(item: T): void {
    this.items.push(item);
  }

  public dequeue(): T | undefined {
    return this.items.shift();
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public length(): number {
    return this.items.length;
  }

  // 最も古いアイテムのIDを取得
  public getEarliestItemId(): string {
    if (this.items.length === 0) {
      return "";
    }
    return this.items[0].id;
  }

  public isSendComplete(id: string): boolean {
    const targetItems = this.items.filter((item) => id === item.id);
    return targetItems.filter((item) => item.latestflag).length > 0;
  }

  public getItemsById(id: string): T[] {
    return this.items
      .filter((item) => id === item.id)
      .sort(compareBy("chunkNumber"))
      .sort(compareBy("fileNumber"));
  }

  public deleteItemsById(id: string) {
    this.items = this.items.filter((item) => id !== item.id);
  }

  public getBlobPathById(id: string): string {
    return this.items.filter((item) => id === item.id)[0].blobPath;
  }

  public getLocaleById(id: string): string {
    return this.items.filter((item) => id === item.id)[0].locale;
  }

  public getFileNameById(id: string): string {
    return this.items.filter((item) => id === item.id)[0].fileName;
  }
}

function compareBy(key: string) {
  return (a: any, b: any) => {
    if (a[key] < b[key]) {
      return -1;
    }
    if (a[key] > b[key]) {
      return 1;
    }
    return 0;
  };
}

/**
 * 実際に処理をするクラス
 */
/*
class ProcessClass {
  // 処理を呼び出す
  public async processLotsOfData() {
    // 処理したいデータが入った配列を作成
    const arr: string[] = [];
    for (let i = 0; i < 1000; i++) {
      arr.push(`process_${i}`);
    }
    await this.processQueue(arr);
    console.log("処理終了");
  }

  // キューにタスクを入れて、それを実行する
  private async processQueue<T>(tasks: T[]) {
    const queue = new Queue<T>();

    // キューに全件入れる
    for (let i = 0; i < tasks.length; i++) {
      queue.enqueue(tasks[i]);
    }

    // キューを同時並行で処理する
    await this.processQueueConcurrently(queue, 100);
  }

  private async processQueueConcurrently<T>(
    queue: Queue<T>,
    maxConcurrentTasks: number
  ) {
    const runningTasks: Promise<void>[] = [];
    while (!queue.isEmpty() || runningTasks.length > 0) {
      while (!queue.isEmpty() && runningTasks.length < maxConcurrentTasks) {
        const item = queue.dequeue();
        if (item !== undefined) {
          const task = this.processItem(item);
          runningTasks.push(task);
        }
      }
      await Promise.race(runningTasks);
      runningTasks.shift();

      // 500個処理したら進捗を出力
      if (queue.length() % 500 === 0 && !queue.isEmpty()) {
        process.stdout.write("\r" + queue.length()); // Node.jsの場合
        //console.log(queue.length()); // ブラウザでの実行の場合
      }
    }
  }

  // 実際の処理
  private async processItem<T>(item: T) {
    // 実際の処理したい内容を書く
    // エラーハンドリングなどもここに書く
    console.log(item);
  }
}

// 処理の実行
const main = async () => {
  const process = new ProcessClass();
  process.processLotsOfData();
};
main();
*/
