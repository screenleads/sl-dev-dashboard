
import { Company, CompanyModel } from './company.model';
import { Media } from './media.model';
import { Promotion } from './promotion.model';
export interface Advice {
  id: number;
  description: string;
  customInterval: boolean;
  interval: number;

  company?: Company;
  media?: Media;
  promotion?: Promotion;
}
export class AdviceModel implements Advice {
  id: number;
  description: string;
  customInterval: boolean;
  interval: number;
  company?: Company;
  media?: Media;
  promotion?: Promotion;

  constructor(data?: Partial<Advice>) {
    this.id = data?.id ?? 0;
    this.description = data?.description ?? '';
    this.customInterval = data?.customInterval ?? false;
    this.interval = data?.interval ?? 0;
    this.company = data?.company;
    this.media = data?.media;
    this.promotion = data?.promotion;
  }
}