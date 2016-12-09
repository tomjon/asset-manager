export var PAGE_SIZE = 10;

export class Results {
  public assets: any[];
  public next: number;
  public prev: number;

  constructor(public start: number=0, public total: number=0, assets: any[]=[]) {
    this.next = assets.length == PAGE_SIZE + 1 ? this.start + PAGE_SIZE : undefined;
    this.prev = this.start > 0 ? Math.max(this.start - PAGE_SIZE, 0) : undefined;
    this.assets = assets.slice(0, PAGE_SIZE);
  }

  pages(): any[] {
    let pages: any[] = [];
    let current: number = Math.floor(this.start / PAGE_SIZE);
    let first: number = current - 5;
    let last: number = current + 4;
    let max: number = Math.floor(this.total / PAGE_SIZE);
    if (first < 0) {
      last = Math.min(last - first, max);
      first = 0;
    } else if (last > max) {
      first = Math.max(first + max - last, 0);
      last = max;
    }
    for (let i: number = first; i <= last; ++i) {
      let start = i != current ? i * PAGE_SIZE : undefined;
      pages.push({start: start, label: (i + 1).toString()});
    }
    return pages;
  }
}
