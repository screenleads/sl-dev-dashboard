// upload-state.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface UploadItem {
  id: string;            // filename o un uuid local
  name: string;
  progress: number;      // 0..100
  done: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class UploadStateService {
  private _items = signal<UploadItem[]>([]);
  readonly items = computed(() => this._items());
  readonly isUploading = computed(() => this._items().some(i => !i.done && !i.error));
  readonly overallProgress = computed(() => {
    const items = this._items();
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + (it.progress ?? 0), 0);
    return Math.round(sum / items.length);
  });

  start(id: string, name: string) {
    const exists = this._items().some(i => i.id === id);
    if (!exists) this._items.update(arr => [...arr, { id, name, progress: 0, done: false }]);
  }
  update(id: string, progress: number) {
    this._items.update(arr => arr.map(i => i.id === id ? { ...i, progress } : i));
  }
  finish(id: string) {
    this._items.update(arr => arr.map(i => i.id === id ? { ...i, progress: 100, done: true } : i));
  }
  fail(id: string, error: string) {
    this._items.update(arr => arr.map(i => i.id === id ? { ...i, error, done: true } : i));
  }
  clearIfAllDone() {
    const items = this._items();
    if (items.length && items.every(i => i.done)) this._items.set([]);
  }
  reset() {
    this._items.set([]);
  }
}
