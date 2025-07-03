
export interface DeviceType {
    id?: number;
    type: string;
    enabled: boolean;
}
export class DeviceTypeModel implements DeviceType {
  id?: number = undefined;
  type = '';
  enabled = true;

  constructor(init?: Partial<DeviceType>) {
    Object.assign(this, init);
  }
}