/**
 * Sentinel popup controller: lets the user configure the API endpoint and demo
 * account, and renders the rolling history of firewall verdicts.
 */

const api_input = document.getElementById("api");
const user_input = document.getElementById("user");
const save_button = document.getElementById("save");
const saved_note = document.getElementById("saved");
const history_root = document.getElementById("history");

/**
 * Loads persisted settings into the form.
 */
async function hydrate_settings() {
  const stored = await chrome.storage.local.get(["api_base", "user_id"]);
  api_input.value = stored.api_base || "http://localhost:3000";
  user_input.value = stored.user_id || "user_aisha";
}

/**
 * Renders the verdict history, newest first.
 */
async function render_history() {
  const { history } = await chrome.storage.local.get(["history"]);
  if (!history || history.length === 0) {
    history_root.innerHTML = '<p class="empty">No transfers screened yet.</p>';
    return;
  }
  history_root.innerHTML = history
    .map(
      (record) => `
        <div class="row">
          <span>RM ${record.amount} → ${record.payee}</span>
          <span class="tag ${record.state}">${record.state}</span>
        </div>`,
    )
    .join("");
}

save_button.addEventListener("click", async () => {
  await chrome.storage.local.set({
    api_base: api_input.value.trim().replace(/\/$/, ""),
    user_id: user_input.value.trim() || "user_aisha",
  });
  saved_note.textContent = "Saved.";
  setTimeout(() => (saved_note.textContent = ""), 1500);
});

hydrate_settings();
render_history();
