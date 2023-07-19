document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const input = document.querySelector("input");
  input.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (input.value.trim()) {
      const prev =
        (await browser.storage.local.get("groupsList")).groupsList || [];
      browser.storage.local.set({ groupsList: [...prev, input.value.trim()] });
      input.value = "";
    }
  });
});
