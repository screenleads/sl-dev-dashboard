import { MediaType, MediaTypeModel } from "./media-type.model";

export interface Media {
  id?: number;
  src: string;
  type: MediaType;
}

export class MediaModel implements Media {
  id?: number = undefined;
  src = '';
  type: MediaType =  new MediaTypeModel();

  constructor(init?: Partial<Media>) {
    Object.assign(this, init);
  }
}