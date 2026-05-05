(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setText(sel, text) {
    for (const el of $$(sel)) el.textContent = text;
  }

  function show(el, on) {
    if (!el) return;
    el.hidden = !on;
  }

  function getSupabaseClient() {
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;
    const lib = window.supabase;
    if (!url || !key || !lib?.createClient) return null;
    return lib.createClient(url, key);
  }

  async function main() {
    const client = getSupabaseClient();
    if (!client) return;

    const root = document.documentElement;

    const authBlock = $("[data-supabase-auth]");
    const signedOutBlock = $("[data-supabase-signed-out]");
    const signedInBlock = $("[data-supabase-signed-in]");
    const emailInput = $("#supabase-email");
    const passInput = $("#supabase-password");
    const signUpBtn = $("[data-supabase-signup]");
    const signInBtn = $("[data-supabase-signin]");
    const googleBtn = $("[data-supabase-google]");
    const signOutBtn = $("[data-supabase-signout]");
    const statusEl = $("[data-supabase-status]");

    function setStatus(msg) {
      if (!statusEl) return;
      statusEl.textContent = msg || "";
      statusEl.hidden = !msg;
    }

    async function applySession(session) {
      const user = session?.user || null;
      if (user) {
        const email = user.email || "Signed in";
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.preferred_username ||
          "";
        const picture = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";

        if (name) setText("[data-profile-name]", name);
        setText("[data-profile-email]", email);
        if (picture) {
          for (const img of $$("[data-profile-photo]")) img.src = picture;
        }
        show(signedOutBlock, false);
        show(signedInBlock, true);
        setStatus("");
        root.dataset.pufAuth = "supabase";

        // Splash entry: once signed in, proceed to the app.
        const screen = document.querySelector("main[data-screen]")?.getAttribute("data-screen") || "";
        if (screen === "splash") {
          window.location.href = "homepage.html";
        }
      } else {
        // If Google auth already filled, don't overwrite; otherwise reset.
        const current = ($("[data-profile-email]")?.textContent || "").trim();
        if (!current || current === "Signed in") setText("[data-profile-email]", "Not signed in");
        show(signedOutBlock, true);
        show(signedInBlock, false);
        root.dataset.pufAuth = "";
      }
      show(authBlock, true);
    }

    const { data: boot } = await client.auth.getSession();
    await applySession(boot?.session || null);

    client.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session || null);
    });

    async function signUp() {
      const email = (emailInput?.value || "").trim();
      const password = passInput?.value || "";
      if (!email || !password) {
        setStatus("Enter email + password.");
        return;
      }
      setStatus("Creating account…");
      const { error } = await client.auth.signUp({ email, password });
      if (error) {
        setStatus(error.message || "Sign up failed.");
        return;
      }
      setStatus("Check your email to confirm, then sign in.");
    }

    async function signIn() {
      const email = (emailInput?.value || "").trim();
      const password = passInput?.value || "";
      if (!email || !password) {
        setStatus("Enter email + password.");
        return;
      }
      setStatus("Signing in…");
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus(error.message || "Sign in failed.");
        return;
      }
      setStatus("");
    }

    async function signInWithGoogle() {
      setStatus("Opening Google sign-in…");
      const redirectTo = (window.location.href || "").split("#")[0];
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setStatus(error.message || "Google sign-in failed.");
        return;
      }
    }

    async function signOut() {
      setStatus("Signing out…");
      await client.auth.signOut();
      setStatus("");
    }

    signUpBtn?.addEventListener("click", () => signUp());
    signInBtn?.addEventListener("click", () => signIn());
    googleBtn?.addEventListener("click", () => signInWithGoogle());
    signOutBtn?.addEventListener("click", () => signOut());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

