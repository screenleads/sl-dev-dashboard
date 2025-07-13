import { AdviceModel } from "./advice.model";
import { CompanyModel } from "./company.model";
import { DeviceTypeModel } from "./device-type.model";
import { DeviceModel } from "./device.model";
import { MediaTypeModel } from "./media-type.model";
import { MediaModel } from "./media.model";
import { PromotionModel } from "./promotion.model";


export class DefaultModelFactory {
  static create(entity: string): any {
    const map: Record<string, any> = {
      advice: new AdviceModel(),
      company: new CompanyModel(),
      device: new DeviceModel(),
      'device-types': new DeviceTypeModel(),
      media: new MediaModel(),
      'media-types': new MediaTypeModel(),
      promotion: new PromotionModel()
    };
    return map[entity] ?? {};
  }
}
