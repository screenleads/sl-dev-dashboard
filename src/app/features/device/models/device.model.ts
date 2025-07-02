import { DeviceType } from "../../device-type/models/device-type.model";

export interface Device {
    id?: number;
    uuid: string;
    descriptionName: string;
    width: number;
    height: number;
    type: DeviceType;
}
