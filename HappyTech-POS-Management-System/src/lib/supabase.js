import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && anon);
export const supabase = configured ? createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;

export async function listAccounts() {
  const { data, error } = await supabase.rpc("list_login_accounts");
  if (error) throw error;
  return data;
}
export async function listRecoveryAdmins() {
  const { data, error } = await supabase.rpc("list_recovery_admins");
  if (error) throw error;
  return data ?? [];
}
async function functionError(error, data, fallback) {
  if (data?.error) return new Error(data.error);
  // Supabase FunctionsHttpError stores the JSON error response in context.
  if (error?.context && typeof error.context.clone === "function") {
    try {
      const response = await error.context.clone().json();
      if (typeof response?.error === "string") return new Error(response.error);
    } catch { /* use the underlying error message */ }
  }
  return new Error(error?.message || fallback);
}
export async function signInPin(accountId, pin) {
  const { data, error } = await supabase.functions.invoke("account-auth", {
    body: { action: "login", accountId, pin },
  });
  if (error || data?.error) throw await functionError(error, data, "Sign in failed");
  const result = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
  if (result.error) throw result.error;
  return result.data;
}
export async function getProfile(id) {
  const { data, error } = await supabase.from("profiles").select("id,name,role,active,must_change_pin,avatar_url").eq("id", id).single();
  if (error) throw error;
  if (!data.active) throw new Error("Account disabled");
  return data;
}
export async function accountAction(body) {
  const { data, error } = await supabase.functions.invoke("account-auth", { body });
  if (error || data?.error) throw await functionError(error, data, "Operation failed");
  return data;
}
