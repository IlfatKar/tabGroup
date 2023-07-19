function onCreated() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("Item created successfully");
  }
}

browser.menus.create(
  {
    id: "SaveTab",
    title: "Save to group 1",
    contexts: ["tab"],
  },
  onCreated
);

browser.menus.create(
  {
    id: "sep",
    type: "separator",
    contexts: ["tab"],
  },
  onCreated
);

browser.menus.create(
  {
    id: "ClearAll",
    title: "Clear All",
    contexts: ["tab"],
  },
  onCreated
);
browser.menus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "SaveTab":
      browser.storage.local.get("groups").then(async (data) => {
        if (!data.groups) {
          data.groups = {};
        }
        if (!data.groups.g1) {
          data.groups.g1 = { pages: [], id: undefined };
        }
        const prev = data.groups.g1.pages.filter(
          (item) => item.url !== tab.url
        );
        const res = [...prev, { title: tab.title, url: tab.url }];
        let g1Id = data.groups.g1.id;
        const createTab = async () => {
          const created = await browser.tabs.create({
            active: false,
            discarded: true,
            title: "Tab Group 1",
            index: 0,
            url: "/page.html?title=g1",
          });
          g1Id = created.id;
        };
        try {
          await browser.tabs.get(g1Id);
          browser.tabs.reload(g1Id);
        } catch (e) {
          await createTab();
        }

        browser.storage.local.set({ groups: { g1: { pages: res, id: g1Id } } });
      });

      break;
    case "ClearAll":
      browser.storage.local.set({ g1: undefined });
      break;
  }
});
browser.tabs.onRemoved.addListener((tabId) => {
  browser.storage.local.get("groups").then((data) => {
    Object.keys(data.groups).forEach((key) => {
      if (data.groups[key].id === tabId) {
        const res = { ...data.groups };
        res[key].id = undefined;
        browser.storage.local.set({
          groups: res,
        });
      }
    });
  });
});
