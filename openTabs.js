addEventListener("DOMContentLoaded", () => {
  const groupName = location.search.slice(7);
  const h1 = document.querySelector("h1");
  h1.textContent = groupName;
  document.title = "Tab group - " + groupName;
  browser.storage.local.get("groups").then((data) => {
    if (data.groups[groupName]) {
      const ul = document.querySelector("ul");
      data.groups[groupName].pages.forEach((item) => {
        const el = document.createElement("li");
        const a = document.createElement("a");
        a.textContent = item.title || item.url;
        a.href = item.url;
        el.appendChild(a);
        ul.append(el);
      });
      // data[groupName].pages.forEach((item) => {
      //   browser.tabs.create({
      //     url: item,
      //   });
      // });
      // browser.tabs.remove(data[groupName].id);
      // browser.storage.local.set({
      // groupName: { pages: data[groupName].pages, id: undefined },
      // });
    }
  });
});
