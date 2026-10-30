import { expect, it, vi } from "vitest";
import { createTextMenus } from "./textMenus";
import type { NavigationState } from "./navigation";
function fixture() {
  const navigation: NavigationState = { screen: { page: "confirm-delete-text", groupKey: "doc", selectedKey: "delete" },
    history: [{ page: "home", selectedKey: "extras" }, { page: "extras", selectedKey: "notes" },
      { page: "notes", selectedKey: "doc" }, { page: "text-reader", groupKey: "doc", selectedKey: null },
      { page: "text-options", groupKey: "doc", selectedKey: "delete" }], remembered: {} };
  const context: Parameters<typeof createTextMenus>[0] = {
    texts: [{ id: "doc", title: "Document" }], groupKey: "doc", isLocalText: true, importingTexts: false, deleting: false,
    open: vi.fn(), back: vi.fn(), openImport: vi.fn(), setDeleting: vi.fn(), setNotice: vi.fn(),
    getNavigation: () => navigation, saveReadingPosition: vi.fn(), deleteText: vi.fn(async () => true),
  };
  return { context, navigation, menus: () => createTextMenus(context) };
}
it("builtin documents have no delete option and restarting writes the current document's position", () => {
  const f = fixture();
  f.context.isLocalText = false;
  expect(f.menus()["text-options"]?.map(row => row.key)).toEqual(["resume", "start"]);
  f.menus()["text-options"]?.[1].action();
  expect(f.context.saveReadingPosition).toHaveBeenCalledWith("doc", 0);
  expect(f.context.back).toHaveBeenCalledOnce();
  expect(f.context.deleteText).not.toHaveBeenCalled();
});
it("import and delete busy rows are disabled and repeated deletion cannot call the port", () => {
  const f = fixture();
  f.context.importingTexts = true;
  f.context.deleting = true;
  expect(f.menus().notes?.find(row => row.key === "text-import")?.disabled).toBe(true);
  const row = f.menus()["confirm-delete-text"]![1];
  expect(row.disabled).toBe(true);
  row.action();
  expect(f.context.deleteText).not.toHaveBeenCalled();
});
it("a completed deletion uses the latest history after MENU to return to the document list", async () => {
  const f = fixture();
  let complete!: (value: boolean) => void;
  vi.mocked(f.context.deleteText).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  f.menus()["confirm-delete-text"]![1].action();
  f.navigation.screen = { page: "text-options", groupKey: "doc", selectedKey: "delete" };
  f.navigation.history.pop();
  complete(true);
  await vi.waitFor(() => expect(f.context.setDeleting).toHaveBeenLastCalledWith(false));
  expect(f.context.back).toHaveBeenCalledWith(2);
});
it("a late deletion does not move a different document's reader", async () => {
  const f = fixture();
  let complete!: (value: boolean) => void;
  vi.mocked(f.context.deleteText).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  f.menus()["confirm-delete-text"]![1].action();
  f.navigation.screen = { page: "text-reader", groupKey: "other", selectedKey: null };
  complete(true);
  await vi.waitFor(() => expect(f.context.setDeleting).toHaveBeenLastCalledWith(false));
  expect(f.context.back).not.toHaveBeenCalled();
});
it("rejected deletion reports retry feedback, releases busy state and can succeed on retry", async () => {
  const f = fixture();
  vi.mocked(f.context.deleteText).mockRejectedValueOnce(new Error("disk failure"));
  f.menus()["confirm-delete-text"]![1].action();
  await vi.waitFor(() => expect(f.context.setNotice).toHaveBeenCalledWith("删除失败，请重试"));
  await vi.waitFor(() => expect(f.context.setDeleting).toHaveBeenLastCalledWith(false));
  expect(f.context.back).not.toHaveBeenCalled();
  f.menus()["confirm-delete-text"]![1].action();
  await vi.waitFor(() => expect(f.context.back).toHaveBeenCalledWith(3));
});
