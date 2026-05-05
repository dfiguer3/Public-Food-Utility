(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  function setStatus(msg) {
    const el = $("#reset-status");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function getClient() {
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;
    const lib = window.supabase;
    if (!url || !key || !lib?.createClient) return null;
    return lib.createClient(url, key);
  }

  async function ensureSession(client) {
    // Handle PKCE code flow (most common now).
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) setStatus(error.message || "Could not verify reset link.");
      return;
    }
    // Older implicit hash links: supabase-js may parse automatically, but if not,
    // the user will still be prompted by Supabase to open the link in the same browser.
  }

  async function main() {
    const client = getClient();
    if (!client) {
      setStatus("Supabase not configured.");
      return;
    }

    await ensureSession(client);

    const btn = $("#reset-submit");
    const input = $("#new-password");
    btn?.addEventListener("click", async () => {
      const password = String(input?.value || "");
      if (password.length < 6) {
        setStatus("Password must be at least 6 characters.");
        return;
      }
      setStatus("Updating password…");
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setStatus(error.message || "Password update failed.");
        return;
      }
      setStatus("Password updated. Redirecting…");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 700);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

