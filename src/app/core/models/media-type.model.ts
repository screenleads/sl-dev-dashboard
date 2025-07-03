export interface MediaType {
  id?: number;
  type: string; // o `type`, según tu backend
  extension: string; // o `type`, según tu backend
  enabled: boolean;
}
export class MediaTypeModel implements MediaType {
  id?: number = undefined;
  type = '';
  extension = '';
  enabled = true;

  constructor(init?: Partial<MediaType>) {
    Object.assign(this, init);
  }
}