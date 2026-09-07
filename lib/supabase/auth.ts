import { createClient } from "./client";

export function signUpWithEmail(email: string, password: string, displayName?: string, emailRedirectTo?: string) {
  return createClient().auth.signUp({
    email,
    password,
    options: { data: displayName ? { display_name: displayName } : undefined, emailRedirectTo },
  });
}

export function signInWithEmail(email: string, password: string) {
  return createClient().auth.signInWithPassword({ email, password });
}

export function signOut() {
  return createClient().auth.signOut();
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) throw new Error("Oturum doğrulanamadı. Lütfen yeniden giriş yapın.");

  const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthenticationError) throw new Error("Mevcut şifreniz doğrulanamadı.");

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    if (updateError.code === "weak_password") throw new Error("Yeni şifreniz yeterince güçlü değil. En az 8 karakter kullanın.");
    if (updateError.code === "same_password") throw new Error("Yeni şifreniz mevcut şifrenizden farklı olmalıdır.");
    throw new Error("Şifreniz güncellenemedi. Lütfen biraz sonra tekrar deneyin.");
  }

  const { error: sessionError } = await supabase.auth.signOut({ scope: "others" });
  return { otherSessionsClosed: !sessionError };
}
