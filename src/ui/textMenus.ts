import type { Page, NavigationState } from "./navigation";
import type { MenuItem } from "./MenuRows";

type Context = {
  texts: readonly { id: string; title: string }[];
  groupKey?: string; isLocalText: boolean; importingTexts: boolean; deleting: boolean;
  open: (page: Page, key?: string, group?: string) => void; back: (levels?: number) => void;
  openImport: () => void; setDeleting: (value: boolean) => void; setNotice: (value: string) => void;
  getNavigation: () => NavigationState;
  saveReadingPosition: (id: string, position: number) => unknown;
  deleteText: (id: string) => Promise<boolean>;
};
export function createTextMenus({ texts, groupKey, isLocalText, importingTexts, deleting,
  open, back, openImport, setDeleting, setNotice, getNavigation,
  saveReadingPosition, deleteText }: Context): Partial<Record<Page, MenuItem[]>> {
  return {
    extras: [
      { key: "clock", label: "时钟", action: () => open("clock", "done") },
      {
        key: "notes",
        label: "文本阅读",
        action: () => open("notes", texts[0]?.id ?? "reader-guide"),
      },
    ],
    notes: [
      ...texts.map((doc) => ({
        key: doc.id,
        label: doc.title,
        action: () => open("text-reader", undefined, doc.id),
      })),
      {
        key: "reader-guide",
        label: "阅读说明",
        action: () => open("text-reader", undefined, "reader-guide"),
      },
      {
        key: "text-import",
        label: importingTexts ? "正在导入…" : "导入文本",
        disabled: importingTexts,
        action: () => openImport(),
      },
    ],
    "text-options": [
      { key: "resume", label: "继续阅读", action: () => back() },
      {
        key: "start",
        label: "回到开头",
        action: () => {
          if (groupKey) saveReadingPosition(groupKey, 0);
          back();
        },
      },
      ...(isLocalText
        ? [
            {
              key: "delete",
              label: "删除文本…",
              action: () => open("confirm-delete-text", "cancel", groupKey),
            },
          ]
        : []),
    ],
    "confirm-delete-text": [
      { key: "cancel", label: "取消", action: () => back() },
      {
        key: "delete",
        label: deleting ? "正在删除…" : "删除文本",
        disabled: deleting,
        action: () => {
          if (!groupKey || deleting) return;
          setDeleting(true);
          void deleteText(groupKey)
            .then((persisted) => {
              if (persisted) {
                const latest = getNavigation();
                if (
                  latest.screen.groupKey === groupKey &&
                  [
                    "text-reader",
                    "text-options",
                    "confirm-delete-text",
                  ].includes(latest.screen.page)
                ) {
                  // Also handle MENU while deletion was still saving.
                  const listIndex = latest.history
                    .map((screen) => screen.page)
                    .lastIndexOf("notes");
                  back(latest.history.length - listIndex);
                }
              } else setNotice("删除失败，请重试");
            })
            .catch(() => setNotice("删除失败，请重试"))
            .finally(() => setDeleting(false));
        },
      },
    ],
    clock: [{ key: "done", label: "返回", action: () => back() }],
  };
}
