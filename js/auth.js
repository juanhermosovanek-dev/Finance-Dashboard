// auth.js
// Thin wrapper around Supabase Auth. Email/password only, kept intentionally
// simple since this is a single-user personal app, not a multi-tenant product.

import { supabase } from './db/supabaseClient.js';

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export { getSession, signUp, signIn, signOut };
