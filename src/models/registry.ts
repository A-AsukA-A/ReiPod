import { classic2007 } from "./classic";
import type { DeviceModelSpec } from "./deviceModel";

export const implementedModels: readonly DeviceModelSpec[] = [classic2007];

export function getDeviceModel(id: string): DeviceModelSpec {
  return implementedModels.find((model) => model.id === id) ?? classic2007;
}
