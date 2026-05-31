export interface KeyboardShortcut {
  key: string;
  label: string;
  description: string;
  context: "ce-detail";
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: "J",
    label: "Next chart",
    description: "Move focus to the next chart card in the list",
    context: "ce-detail",
  },
  {
    key: "K",
    label: "Previous chart",
    description: "Move focus to the previous chart card in the list",
    context: "ce-detail",
  },
  {
    key: "P",
    label: "Publish",
    description: "Publish the currently focused chart",
    context: "ce-detail",
  },
  {
    key: "E",
    label: "Expand",
    description: "Expand or collapse the currently focused chart card",
    context: "ce-detail",
  },
  {
    key: "F",
    label: "Flag",
    description: "Open the feedback/flag dialog for the focused chart",
    context: "ce-detail",
  },
];

export const CE_DETAIL_SHORTCUTS = KEYBOARD_SHORTCUTS;
