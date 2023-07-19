const groups = ["g1", "g2", "g3"];

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
        gettingCurrent.then((tabInfo) => {
          if (tab.id === tabInfo[0].id) {
            browser.tabs.query({ hidden: false }).then((data) => {
              const p =
                data[data.length - 1].id === tab.id
                  ? data[data.length - 2]
                  : data[data.length - 1];
              browser.tabs.highlight({ tabs: [p.index] });
              browser.tabs.hide(tab.id);
            });
          }
        }, console.error);

        const res = [...prev, { title: tab.title, url: tab.url, id: tab.id }];
        let id = data.groups[item].id;
        const createTab = async () => {
          const created = await browser.tabs.create({
            active: false,
            discarded: true,
            title: "Tab Group - " + item,
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
  switch (info.menuItemid) {
    case "NewGroup":
      break;
  }
});
browser.tabs.onRemoved.addListener((tabid, { isWindowClosing }) => {
  if (isWindowClosing) return;
  browser.storage.local.get("groups").then((data) => {
    if (!data.groups) return;
    Object.keys(data.groups).forEach((key) => {
      if (data.groups[key].id === tabid) {
        const res = { ...data.groups };
        res[key].pages.forEach((page) => {
          browser.tabs.show(page.id);
        });
        delete res[key];
        getPrevActive().then((data) => {
          if (data.prevActive && res[data.prevActive]) {
            setActive(data.prevActive);
            const arr = [];
            res[data.prevActive].pages.forEach((page) => {
              browser.tabs.show(page.id);
              arr.push(page.id);
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
      if (data.groups[key] && data.groups[key].id === tabId) {
        getActive().then((dataActive) => {
          const activeGroup = dataActive.active;
          if (activeGroup) {
            data.groups[activeGroup].pages.forEach((page) => {
              browser.tabs.hide(page.id);
            });
            browser.tabs.show(data.groups[activeGroup].id);
          }

          setActive(key);
          browser.tabs.hide(data.groups[key].id);
          const arr = [];
          data.groups[key].pages.forEach((page) => {
            browser.tabs.show(page.id);
            arr.push(page.id);
          });
          browser.tabs.query({ hidden: false }).then((data) => {
            browser.tabs.highlight({ tabs: [data[data.length - 1].index] });
          });
        });
        break;
      }
    }
  });
});
