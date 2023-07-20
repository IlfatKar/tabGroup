(async () => {
  let groups = (await browser.storage.local.get("groupsList")).groupsList || [];

  const refreshMenu = async () => {
    groups = (await browser.storage.local.get("groupsList")).groupsList || [];
    browser.menus.removeAll();
    groups.forEach((item) => {
      browser.menus.create({
        id: "SaveTab" + item,
        title: "Save to " + item,
        contexts: ["tab"],
      });
    });
    browser.menus.create({
      id: "sep",
      type: "separator",
      contexts: ["tab"],
    });
    browser.menus.create({
      id: "NewGroup",
      title: "New Group",
      contexts: ["tab"],
    });
    browser.menus.refresh();
  };
  refreshMenu();

  const getPrevActive = async () => {
    return browser.storage.local.get("prevActive");
  };

  const getActive = async () => {
    return browser.storage.local.get("active");
  };

  const setActive = async (group) => {
    const prev = (await getActive()).active;
    if (prev) {
      browser.storage.local.set({ prevActive: prev });
    }
    return browser.storage.local.set({ active: group });
  };

  browser.storage.local.get("groups").then(async (data) => {
    if (!data.groups) return;
    const res = { ...data.groups };
    const groupsList =
      (await browser.storage.local.get("groupsList")).groupsList || [];
    const allTabs = await browser.tabs.query({});
    for (const item of groupsList) {
      const tabGroups = allTabs.filter(
        (t) => t.title === "Tab group - " + item
      );
      if (tabGroups[0]) res[item].id = tabGroups[0].id;
    }
    for (const key in res) {
      const arr = [];
      res[key].pages.forEach(async (page) => {
        const tab = allTabs.filter((item) => item.url === page.url);
        if (tab[0]) arr.push(page);
      });
      res[key].pages = arr;
    }
    browser.storage.local.set({
      groups: res,
    });
  });

  browser.menus.onShown.addListener(refreshMenu);

  browser.menus.onClicked.addListener(async (info, tab) => {
    for (const item of groups) {
      if ("SaveTab" + item === info.menuItemId) {
        browser.storage.local.get("groups").then(async (data) => {
          if (!data.groups) {
            data.groups = {};
          }
          if (!data.groups[item]) {
            data.groups[item] = { pages: [], id: undefined };
          }
          const prev = data.groups[item].pages.filter(
            (item) => item.url !== tab.url
          );

          const gettingCurrent = browser.tabs.query({ active: true });
          gettingCurrent.then(async (tabInfo) => {
            if (tab.id === tabInfo[0].id) {
              await browser.tabs.query({ hidden: false }).then(async (data) => {
                const p =
                  data[data.length - 1].id === tab.id
                    ? data[data.length - 2]
                    : data[data.length - 1];
                if (!p) {
                  await browser.tabs.create({});
                } else {
                  await browser.tabs.highlight({ tabs: [p.index] });
                }
              });
            }
            browser.tabs.hide(tab.id);
          }, console.error);

          const res = [...prev, { title: tab.title, url: tab.url, id: tab.id }];
          let id = data.groups[item].id;
          const createTab = async () => {
            const created = await browser.tabs.create({
              active: false,
              discarded: true,
              title: "Tab group - " + item,
              index: 0,
              url: "/page.html?title=" + item,
            });
            id = created.id;
          };
          try {
            await browser.tabs.get(id);
            browser.tabs.reload(id);
          } catch (e) {
            await createTab();
          }
          browser.storage.local.set({
            groups: { ...data.groups, [item]: { pages: res, id: id } },
          });
        });

        break;
      }
    }

    if (info.menuItemId === "NewGroup") {
      browser.action.openPopup();
    }
  });

  browser.tabs.onUpdated.addListener(
    (oldTabId, _, newTab) => {
      browser.storage.local.get("groups").then((data) => {
        if (!data.groups) return;
        const res = { ...data.groups };
        for (const key in res) {
          const arr = [];
          res[key].pages.forEach((page) => {
            if (page.id === oldTabId) {
              arr.push({ ...page, url: newTab.url });
            } else {
              arr.push(page);
            }
          });
          res[key].pages = arr;
        }
        browser.storage.local.set({
          groups: res,
        });
      });
    },
    {
      properties: ["url"],
    }
  );

  browser.tabs.onRemoved.addListener((tabid, { isWindowClosing }) => {
    if (isWindowClosing) {
      browser.storage.local.get("groups").then((data) => {
        if (!data.groups) return;
        const res = { ...data.groups };
        for (const key in res) {
          res[key].id = null;
        }
        browser.storage.local.set({
          groups: res,
        });
      });
      return;
    }
    browser.storage.local.get("groups").then((data) => {
      if (!data.groups) return;
      Object.keys(data.groups).forEach((key) => {
        if (data.groups[key].id === tabid) {
          const res = { ...data.groups };
          res[key].pages.forEach((page) => {
            browser.tabs.show(page.id);
          });
          delete res[key];
          browser.storage.local.set({
            groupsList: [...Object.keys(res)],
          });

          getPrevActive().then((data) => {
            if (data.prevActive && res[data.prevActive]) {
              setActive(data.prevActive);
              res[data.prevActive].pages.forEach((page) => {
                browser.tabs.show(page.id);
              });
              browser.tabs.query({ hidden: false }).then((data) => {
                browser.tabs.highlight({ tabs: [data[data.length - 1].index] });
              });
            }
          });
          browser.storage.local.set({
            groups: res,
          });
        }
      });
    });
  });

  browser.tabs.onActivated.addListener(({ tabId }) => {
    browser.storage.local.get("groups").then((data) => {
      for (const key in data.groups) {
        browser.tabs.show(data.groups[key].id);
      }
      for (const key in data.groups) {
        if (data.groups[key] && data.groups[key].id === tabId) {
          getActive().then((dataActive) => {
            const activeGroup = dataActive.active;
            if (activeGroup && data.groups[activeGroup]) {
              data.groups[activeGroup].pages.forEach((page) => {
                browser.tabs.hide(page.id);
              });
            }

            setActive(key);
            data.groups[key].pages.forEach((page) => {
              browser.tabs.show(page.id);
            });
            browser.tabs.query({ hidden: false }).then((dataHighlight) => {
              browser.tabs.highlight({
                tabs: [dataHighlight[dataHighlight.length - 1].index],
              });
            });
          });
          break;
        }
      }
      getActive().then((dataActive) => {
        if (dataActive.active) {
          browser.tabs.hide(data.groups[dataActive.active].id);
        }
      });
    });
  });
})();
