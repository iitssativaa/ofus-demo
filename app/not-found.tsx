"use client";

import Link from "next/link";
import { ArrowLeft, Home, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

export default function NotFound() {
  const router = useRouter();
  return <main className="ofus-not-found">
    <Link href="/dashboard" className="ofus-not-found-brand" aria-label="OfUs ana sayfa"><BrandMark /></Link>
    <section className="ofus-not-found-card">
      <p className="ofus-not-found-code"><span>4</span><i aria-hidden="true" /><span>4</span></p>
      <div className="ofus-not-found-copy"><p className="page-eyebrow">Sayfa bulunamadı</p><h1>Aradığınız sayfa burada değil.</h1><p>Bağlantı değişmiş veya sayfa kaldırılmış olabilir. Güvenli bir yerden devam edebilirsiniz.</p>
        <div className="ofus-not-found-actions"><Link href="/dashboard" className="primary-button"><Home size={18} />Ana sayfaya dön</Link><button type="button" className="secondary-button" onClick={() => router.back()}><ArrowLeft size={18} />Geri dön</button><Link href="/giris" className="text-link"><LogIn size={16} />Giriş sayfası</Link></div>
      </div>
    </section>
  </main>;
}
