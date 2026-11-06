type Host = { __REIPOD_NATIVE_BATTERY_VERSION__?: number;
  webkit?: { messageHandlers?: { reipodBattery?: { postMessage: (message: unknown) => Promise<unknown> } } } };
export const nativeBatteryAvailable = () => (window as unknown as Host).__REIPOD_NATIVE_BATTERY_VERSION__ === 1;
export async function readNativeBattery(): Promise<unknown> {
  const bridge = (window as unknown as Host).webkit?.messageHandlers?.reipodBattery;
  if (!nativeBatteryAvailable() || !bridge) throw Error("当前容器未提供原生电池状态");
  return bridge.postMessage({ version: 1, action: "status" });
}
