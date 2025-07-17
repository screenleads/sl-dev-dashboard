import { Media } from './media.model';
import { Promotion } from './promotion.model';

export interface TimeRange {
  fromTime: string;
  toTime: string;
}
export type WeekDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export interface AdviceVisibilityRule {
  day: WeekDay;
  timeRanges: TimeRange[];
}

export interface Advice {
  id: number;
  description: string;
  customInterval: boolean;
  interval: number;
  media?: Media;
  promotion?: Promotion;
  visibilityRules: AdviceVisibilityRule[];
}

export class AdviceModel implements Advice {
  id = 0;
  description = '';
  customInterval = false;
  interval = 0;
  media?: Media;
  promotion?: Promotion;
  visibilityRules: AdviceVisibilityRule[] = [];

  constructor(data?: Partial<Advice>) {
    Object.assign(this, data);
  }
  hasVisibilityRules(): boolean {
    return this.visibilityRules && this.visibilityRules.length > 0;
  }
}