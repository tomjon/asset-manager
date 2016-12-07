export var PAGE_SIZE = 10;

export class Results {
  public assets: any[];
  public next: number;
  public prev: number;

  constructor(public start: number=0, public total: number=0, assets: any[]=[]) {
    this.next = this.assets.length == PAGE_SIZE + 1 ? this.start + PAGE_SIZE : undefined;
    this.prev = this.start > 0 ? Math.max(this.start - PAGE_SIZE, 0) : undefined;
    this.assets = assets.slice(0, PAGE_SIZE);
  }

  pages(): any[] {
    let pages = [];
    for (let i: number = 0; i < this.total / PAGE_SIZE; ++i) {
      pages.push({start: i * PAGE_SIZE, label: (i + 1).toString()});
    }
    return pages;
  }
}
