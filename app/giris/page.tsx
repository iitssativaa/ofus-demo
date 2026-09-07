import { AuthForm } from "@/components/auth-form";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const { durum } = await searchParams;
  const message = durum === "dogrulama-hatasi" ? "E-posta doğrulaması tamamlanamadı. Lütfen tekrar deneyin." : undefined;
  return <AuthForm mode="sign-in" initialMessage={message} />;
}
