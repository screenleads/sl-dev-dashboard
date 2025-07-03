
import { Company, CompanyModel } from './company.model';

export interface Advice {
  id?: number;
  message: string;
  company: Company;
}

export class AdviceModel implements Advice {
  id?: number = undefined;
  message = '';
  company = new CompanyModel();

  constructor(init?: Partial<Advice>) {
    Object.assign(this, init);
  }
}