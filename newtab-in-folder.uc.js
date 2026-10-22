// New Tab in Folder — loaded by Sine in each browser window.
(() => {
  "use strict";

  if (window.location.href !== "chrome://browser/content/browser.xhtml") return;

  const key = "__newTabInFolder";
  window[key]?.destroy();

  const EMPTY_PAGES = new Set(["about:blank", "about:newtab", "about:home"]);

  let originalOpenTab;
  let wrappedOpenTab;
  let urlbarObserver;
  let anchor = null;
  let insideOpenTab = false;
  let destroyed = false;
  const awaitingFirstPage = new WeakSet();

  const folderOf = (tab) => {
    const group = tab?.group;
    if (
      !group?.isZenFolder ||
      group.isLiveFolder ||
      group.hasAttribute("split-view-group") ||
      tab.hasAttribute("zen-essential") ||
      tab.hasAttribute("zen-glance-tab")
    ) {
      return null;
    }
    return group;
  };

  const onTabOpen = (event) => {
    const current = anchor;
    // With zen.urlbar.replace-newtab, the tab opens when the URL bar session
    // started by the new-tab command commits, not inside the command itself.
    if (!current || !(insideOpenTab || gURLBar.hasAttribute("zen-newtab"))) return;
    anchor = null;

    const tab = event.target;
    const folder = folderOf(current);
    if (
      !folder ||
      current !== gBrowser.selectedTab ||
      tab.getAttribute("zen-workspace-id") !== current.getAttribute("zen-workspace-id")
    ) {
      return;
    }
    if (tab.group !== folder) {
      if (tab.pinned || tab.group) return;
      // Zen folders hold pinned tabs only; addTabs pins the tab.
      folder.addTabs([tab]);
    }
    gBrowser.moveTabAfter(tab, current);
    awaitingFirstPage.add(tab);
  };

  const progressListener = {
    onLocationChange(browser, webProgress, request, location) {
      if (!webProgress.isTopLevel) return;
      const tab = gBrowser.getTabForBrowser(browser);
      if (!tab || !awaitingFirstPage.has(tab) || EMPTY_PAGES.has(location.spec)) return;
      awaitingFirstPage.delete(tab);
      if (!tab.pinned) return;
      // Zen stored the empty page as the pinned URL when the tab was pinned.
      // Store the first real page instead, as "Replace pinned URL with current" does.
      window.gZenWindowSync
        .setPinnedTabState(tab)
        .then(() => window.gZenPinnedTabManager.resetPinChangedUrl(tab));
    },
  };

  // A reopened closed tab (Ctrl+Shift+T) is placed back in its folder while it
  // is created, then Zen pins it and drops it out of the folder.
  const reopenedInFolder = new WeakMap();

  const folderTabs = (folder) => folder.tabs.filter((t) => !t.hasAttribute("zen-empty-tab"));

  const onTabGrouped = (event) => {
    const tab = event.detail;
    const folder = event.target;
    if (!tab.initializingTab || !folder.isZenFolder || folder.isLiveFolder) return;
    const tabs = folderTabs(folder);
    const index = tabs.indexOf(tab);
    reopenedInFolder.set(tab, {
      folder,
      previous: tabs[index - 1],
      next: tabs[index + 1],
      dropped: false,
    });
  };

  const onTabUngrouped = (event) => {
    const entry = reopenedInFolder.get(event.detail);
    if (entry && event.detail.initializingTab && entry.folder === event.target) {
      entry.dropped = true;
    }
  };

  const onTabRestoring = (event) => {
    const tab = event.target;
    const entry = reopenedInFolder.get(tab);
    reopenedInFolder.delete(tab);
    if (!entry?.dropped || tab.group || !entry.folder.isConnected) return;
    entry.folder.addTabs([tab]);
    if (entry.previous?.group === entry.folder) {
      gBrowser.moveTabAfter(tab, entry.previous);
    } else if (entry.next?.group === entry.folder) {
      gBrowser.moveTabBefore(tab, entry.next);
    }
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (wrappedOpenTab && BrowserCommands.openTab === wrappedOpenTab) {
      BrowserCommands.openTab = originalOpenTab;
    }
    urlbarObserver?.disconnect();
    window.removeEventListener("TabOpen", onTabOpen);
    window.removeEventListener("TabGrouped", onTabGrouped);
    window.removeEventListener("TabUngrouped", onTabUngrouped);
    window.removeEventListener("SSTabRestoring", onTabRestoring);
    if (wrappedOpenTab) gBrowser.removeTabsProgressListener(progressListener);
    window.removeEventListener("unload", destroy);
    if (window[key]?.destroy === destroy) delete window[key];
  };

  const install = () => {
    if (destroyed) return;
    originalOpenTab = BrowserCommands.openTab;
    wrappedOpenTab = function (...args) {
      const hadUrlbarSession = gURLBar.hasAttribute("zen-newtab");
      anchor = gBrowser.selectedTab;
      insideOpenTab = true;
      try {
        return originalOpenTab.apply(this, args);
      } finally {
        insideOpenTab = false;
        if (hadUrlbarSession || !gURLBar.hasAttribute("zen-newtab")) anchor = null;
      }
    };
    BrowserCommands.openTab = wrappedOpenTab;

    urlbarObserver = new MutationObserver(() => {
      if (!gURLBar.hasAttribute("zen-newtab")) anchor = null;
    });
    urlbarObserver.observe(gURLBar, { attributeFilter: ["zen-newtab"] });

    window.addEventListener("TabOpen", onTabOpen);
    window.addEventListener("TabGrouped", onTabGrouped);
    window.addEventListener("TabUngrouped", onTabUngrouped);
    window.addEventListener("SSTabRestoring", onTabRestoring);
    gBrowser.addTabsProgressListener(progressListener);
  };

  window[key] = { destroy };
  window.addEventListener("unload", destroy, { once: true });
  // Sine invokes this hook on disable, removal, and script reload.
  window.addUnloadListener?.(destroy);
  delayedStartupPromise.then(install);
})();
