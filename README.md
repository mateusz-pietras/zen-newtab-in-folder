# New Tab in Folder

A Sine JavaScript mod for Zen Browser. When the active tab is in a folder, a new tab opens inside that folder, right after the active tab.

- Triggers: Ctrl+T, the new tab button, and middle-click on empty tab bar space.
- Works with both values of `zen.urlbar.replace-newtab`. With `true` (Zen's default), the tab appears when you submit the URL bar.
- Zen folders hold pinned tabs only, so the new tab is pinned. Its pinned URL becomes the first page it opens, as with "Replace pinned URL with current".
- Live folders, split views, Essentials and Glance are left unchanged. Links opened from a folder tab are left unchanged too; Zen's `zen.folders.owned-tabs-in-folder` covers them.

Ctrl+W on a pinned tab resets and unloads it by default. To close tabs in folders with Ctrl+W, set `zen.pinned-tab-manager.close-shortcut-behavior` to `close` in `about:config`. This applies to all pinned tabs.

## Install with Sine

1. Install [Sine](https://github.com/CosmoCreeper/Sine/releases/latest) in Zen.
2. Open **Settings → Sine Mods** and allow JavaScript from unofficial sources (`sine.allow-unsafe-js`).
3. Enter `mateusz-pietras/zen-newtab-in-folder` in the custom GitHub repository installer.

Sine updates the mod when `updatedAt` in `theme.json` is newer than the installed copy. Change `version` and `updatedAt` with every release.

## Compatibility

Tested on Zen 1.23.4b (Firefox 158). The mod uses internal Zen APIs: `BrowserCommands.openTab`, the URL bar's `zen-newtab` attribute, `folder.addTabs`, `gZenWindowSync.setPinnedTabState` and `gZenPinnedTabManager.resetPinChangedUrl`. A Zen update can break it. Disable the mod in Sine to restore Zen's default behavior.
