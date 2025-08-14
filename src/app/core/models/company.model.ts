import { Media } from './media.model';
import { Device } from './device.model';

import { MediaModel } from './media.model';
import { Advice } from './advice.model';

export interface Company {
  id?: number;
  name: string;
  observations: string;
  logo: Media;
  primaryColor: string;
  secondaryColor: string;
  devices: Device[];
  advices: Advice[];
}




export class CompanyModel implements Company {
  id?: number = undefined;
  logo = new MediaModel(); // Usa el modelo para tener valores por defecto
  name = '';
  observations = '';
  devices: Device[] = [];
  advices: Advice[] = [];
  primaryColor: string = '';
  secondaryColor: string = '';

  constructor(init?: Partial<Company>) {
    Object.assign(this, init);
  }
}