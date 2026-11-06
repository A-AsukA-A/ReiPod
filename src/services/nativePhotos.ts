import type { PhotoItem } from "../media/photos";

export type NativePhotoAlbum = { id: string; title: string; count: number; thumbnail?: string };
export type PhotoAuthorization = "notDetermined" | "authorized" | "limited" | "denied" | "restricted";
export type NativePhotoReply = {
  authorization: PhotoAuthorization; albums?: NativePhotoAlbum[]; photos?: PhotoItem[];
  total?: number; nextOffset?: number;
};
export type NativePhotoState = {
  authorization: PhotoAuthorization; albums: NativePhotoAlbum[]; photos: PhotoItem[];
  album?: string; offset?: number; total: number; loading: boolean; error?: string;
};
type Host = { __REIPOD_NATIVE_PHOTOS_VERSION__?: number;
  webkit?: { messageHandlers?: { reipodPhotos?: { postMessage: (message: unknown) => Promise<unknown> } } } };
export const nativePhotosAvailable = () => (window as unknown as Host).__REIPOD_NATIVE_PHOTOS_VERSION__ === 1;

export async function nativePhotoRequest(action: "status" | "authorize" | "preview" | "albums" | "photos" | "refresh" | "openSettings" | "limited",
  fields: { album?: string; offset?: number; limit?: number } = {}): Promise<NativePhotoReply> {
  const bridge = (window as unknown as Host).webkit?.messageHandlers?.reipodPhotos;
  if (!nativePhotosAvailable() || !bridge) throw Error("当前容器不支持系统相册，请更新 App");
  const result = await bridge.postMessage({ version: 1, action, ...fields }) as NativePhotoReply;
  if (!result || !["notDetermined", "authorized", "limited", "denied", "restricted"].includes(result.authorization))
    throw Error("系统相册返回了无效状态");
  return result;
}
