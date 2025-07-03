import { DeviceType } from "./device-type.model";


export interface Device {
    id?: number;
    uuid: string;
    descriptionName: string;
    width: number;
    height: number;
    type: DeviceType;
}
export class DeviceModel implements Device {
  id?: number = undefined;
  uuid = crypto.randomUUID(); // genera UUID único
  descriptionName = '';
  width = 0;
  height = 0;
  type: DeviceType = { id: 0, type: '', enabled: true };

  constructor(init?: Partial<Device>) {
    Object.assign(this, init);
  }
}