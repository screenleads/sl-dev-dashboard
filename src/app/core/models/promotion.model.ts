export interface Promotion {
  id?: number;
  legal_url: string;
  description: string;
}

export class PromotionModel implements Promotion {
  id?: number = undefined;
  legal_url = '';
  description = '';

  constructor(init?: Partial<Promotion>) {
    Object.assign(this, init);
  }
}