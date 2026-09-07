const usageSteps = [
  "Firma oluşturulur ve ilgili firma altında proje tanımlanır.",
  "Projeye bağlı görevler oluşturulur; sorumlu, son tarih, öncelik ve hatırlatmalar belirlenir.",
  "Tamamlanan ve iptal edilen işler geçmiş kayıtlarıyla korunur.",
  "Task-Deadline ve Etkinlik takvimlerinden teslim tarihleri, etkinlikler ve rutinler izlenir.",
  "Genel Bakış üzerinden günlük operasyon, yaklaşan işler, etkinlikler ve ekip iş yükü değerlendirilir.",
  "Mantar Pano ve Gelen Kutusu üzerinden ortak notlar ile operasyon hareketleri takip edilir.",
];

const stack = [
  ["FRONTEND", "Next.js / React / TypeScript"],
  ["UI", "Tailwind CSS / Responsive Component Architecture"],
  ["BACKEND & DATABASE", "Supabase / PostgreSQL"],
  ["AUTHENTICATION", "Supabase Auth"],
  ["AUTHORIZATION", "Row Level Security (RLS)"],
  ["SERVER FUNCTIONS", "Supabase Edge Functions"],
  ["NOTIFICATIONS", "Telegram Bot API"],
  ["DEPLOYMENT", "Vinext / Cloudflare Workers"],
  ["STORAGE", "Supabase Storage"],
];

const securityPoints = [
  ["ROW LEVEL SECURITY", "Kullanıcıların yalnızca yetkili oldukları çalışma alanı verilerine erişebilmesini sağlar."],
  ["WORKSPACE ISOLATION", "Firma, proje, görev, etkinlik ve diğer operasyonel veriler çalışma alanı seviyesinde izole edilir."],
  ["AUTHENTICATION", "Kullanıcı oturumları Supabase Auth üzerinden yönetilir."],
  ["SERVER-SIDE SECRETS", "Telegram tokenları, webhook secretları ve diğer hassas anahtarlar istemci tarafına açılmaz."],
  ["STORAGE POLICIES", "Profil görseli ve dosya erişimleri yetkilendirme kurallarıyla sınırlandırılır."],
  ["OWNERSHIP CONTROLS", "Kullanıcı bazlı düzenleme ve silme izinleri veritabanı politikalarıyla doğrulanır."],
  ["WEBHOOK PROTECTION", "Telegram entegrasyonu ve otomatik süreçlerde sunucu tarafı doğrulama mekanizmaları kullanılır."],
  ["INPUT SAFETY", "Harici bağlantılar ve kullanıcı girdileri güvenli kullanım kurallarına göre doğrulanır."],
];

function GuideSection({ number, label, title, children }: { number: string; label: string; title: string; children: React.ReactNode }) {
  return <section className="demo-guide-section panel overflow-hidden">
    <header className="flex items-start gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
      <span className="font-mono text-sm font-bold text-amber-400">{number}</span>
      <div><p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-slate-400">{label}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{title}</h2></div>
    </header>
    <div className="p-5 text-sm leading-7 text-slate-500 sm:p-6">{children}</div>
  </section>;
}

export default function DemoGuidePage() {
  return <div className="mx-auto max-w-6xl space-y-5 overflow-hidden">
    <header className="demo-guide-hero panel relative overflow-hidden p-5 sm:p-8">
      <p className="font-mono text-xs font-bold tracking-[0.2em] text-amber-400">DEMO YÖNERGESİ</p>
      <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">OfUs ürün ve teknik değerlendirme rehberi</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">OfUs ürününün kullanım modeli, teknik altyapısı, güvenlik yaklaşımı ve geliştirme vizyonuna ilişkin genel bilgilendirme.</p>
      <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4 font-mono text-[11px]">
        <div className="flex gap-2"><dt className="text-slate-500">PRODUCT /</dt><dd className="text-slate-200">OfUs</dd></div>
        <div className="flex gap-2"><dt className="text-slate-500">ENVIRONMENT /</dt><dd className="text-amber-400">DEMO</dd></div>
        <div className="flex gap-2"><dt className="text-slate-500">STATUS /</dt><dd className="text-emerald-500">ACTIVE</dd></div>
      </dl>
    </header>

    <GuideSection number="01" label="PRODUCT FLOW" title="Uygulamanın Kullanımı">
      <p>OfUs, günlük operasyonların tek bir çalışma alanı üzerinden takip edilmesini sağlayan bütünleşik bir iş ve planlama platformudur. Firmalar, projeler, görevler, etkinlikler, hatırlatmalar ve ortak operasyon notları ilişkili bir yapı içinde yönetilir.</p>
      <ol className="mt-5 grid gap-3 md:grid-cols-2">{usageSteps.map((step, index) => <li key={step} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="font-mono text-xs font-bold text-amber-400">{String(index + 1).padStart(2, "0")}</span><span>{step}</span></li>)}</ol>
    </GuideSection>

    <GuideSection number="02" label="STACK" title="Teknik Altyapı">
      <p>OfUs, modern web uygulamalarında kullanılan güncel ve ölçeklenebilir teknolojiler üzerine inşa edilmiştir.</p>
      <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2">{stack.map(([label, value]) => <div key={label} className="min-w-0 bg-slate-50 p-4"><dt className="font-mono text-[11px] font-bold tracking-[0.12em] text-amber-400">{label}</dt><dd className="mt-2 break-words font-mono text-xs text-slate-700">{value}</dd></div>)}</dl>
    </GuideSection>

    <GuideSection number="03" label="SECURITY" title="Güvenlik Mimarisi">
      <p>OfUs, yalnızca arayüz seviyesinde erişim kontrolüne güvenmeyen; sunucu ve veritabanı katmanlarında yetkilendirme uygulayan bir güvenlik modeli kullanır.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{securityPoints.map(([label, text]) => <article key={label} className="rounded-lg border border-slate-200 p-4"><h3 className="font-mono text-[11px] font-bold tracking-[0.1em] text-slate-300">{label}</h3><p className="mt-2 leading-6">{text}</p></article>)}</div>
    </GuideSection>

    <GuideSection number="04" label="INFRASTRUCTURE" title="Ölçeklenebilir Yapı">
      <div className="space-y-3"><p>OfUs&apos;ın veri modeli yalnızca mevcut kullanıcı sayısına göre tasarlanmamıştır. Workspace üyelikleri ile firma, proje, görev ve etkinlik ilişkileri çok kullanıcılı yapıyı destekleyecek biçimde modellenmiştir.</p><p>Kullanıcı kimlikleri veya ekip büyüklüğü uygulama koduna sabitlenmez. Modüler servis ve veri katmanı, yeni istemcilerin mevcut backend altyapısını yeniden kullanabilmesine olanak tanır.</p></div>
      <div className="mt-6 mx-auto max-w-sm rounded-xl border border-amber-200/40 bg-amber-50/30 p-4 text-center font-mono text-xs font-semibold text-slate-300"><div>CLIENT</div><div className="py-1 text-amber-400">↓</div><div>AUTH</div><div className="py-1 text-amber-400">↓</div><div>WORKSPACE</div><div className="py-1 text-amber-400">↓</div><div>BUSINESS DATA</div><div className="py-1 text-amber-400">↓</div><div>NOTIFICATION / AUTOMATION SERVICES</div></div>
    </GuideSection>

    <GuideSection number="05" label="MOBILE" title="Mobil Uygulama">
      <p>OfUs için native mobil istemci geliştirilmesi ürün yol haritasında yer almaktadır. Planlanan mobil uygulama, bağımsız bir backend yerine mevcut Supabase altyapısını ve ortak veri modelini kullanacaktır.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]"><ul className="grid grid-cols-2 gap-2 text-slate-600 sm:grid-cols-4">{["Kullanıcılar", "Üyelikler", "Firmalar", "Projeler", "Görevler", "Takvim", "Etkinlikler", "Hatırlatmalar"].map((item) => <li key={item} className="rounded-md border border-slate-200 px-3 py-2">{item}</li>)}</ul><div className="rounded-lg border border-amber-200/40 bg-amber-50/30 p-4"><p className="font-mono text-[10px] font-bold tracking-[0.12em] text-amber-400">PLANLANAN CLIENT</p><p className="mt-2 font-mono text-xs text-slate-200">React Native / Expo</p></div></div>
    </GuideSection>

    <GuideSection number="06" label="NOTIFICATIONS" title="Telegram Bildirim Altyapısı">
      <p>OfUs, operasyonel hatırlatmalar için Telegram tabanlı bir bildirim altyapısı kullanır. Kullanıcı, Telegram hesabını güvenli ve tek kullanımlık bir bağlantı akışıyla eşleştirebilir.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-slate-200 p-4"><h3 className="font-mono text-[11px] font-bold text-slate-300">BİLDİRİM KAPSAMI</h3><ul className="mt-3 list-disc space-y-1 pl-5"><li>Görev son tarihleri</li><li>Etkinlikler</li><li>Belirlenen hatırlatma zamanları</li></ul></div><div className="rounded-lg border border-slate-200 p-4"><h3 className="font-mono text-[11px] font-bold text-slate-300">HATIRLATMA PRESETLERİ</h3><p className="mt-3">1 saat, 6 saat, 1 gün, 3 gün ve 5 gün önce.</p></div></div>
      <p className="mt-4 rounded-lg bg-slate-50 p-4">Bildirimler istemci zamanlayıcılarına bağlı değildir; sunucu tarafındaki reminder/scheduler altyapısında işlenir. Tekrarlı gönderim riskini azaltmak için claiming ve deduplication yaklaşımı kullanılır.</p>
    </GuideSection>

    <GuideSection number="07" label="DEMO BUILD" title="Arayüz Durumu">
      <p>Bu demo kapsamındaki arayüz, ürünün mevcut çalışan sürümünü temsil eder; ancak nihai görsel tasarım olarak değerlendirilmemelidir. Fonksiyonel mimari ve temel kullanıcı deneyimi aktif durumdadır.</p>
      <p className="mt-3">Görsel kimlik, tipografi, bazı yerleşim kararları, mikro etkileşimler ve marka uygulamaları ürünleştirme sürecinde geliştirilmeye devam edecektir.</p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{["Ürün mimarisi", "Operasyon akışı", "Gerçek veri kullanımı", "Çok kullanıcılı çalışma modeli", "Bildirim altyapısı", "Ölçeklenebilir teknik temel"].map((item) => <li key={item} className="rounded-md border border-slate-200 px-3 py-2">{item}</li>)}</ul>
      <div className="mt-6 border-l-2 border-amber-400 bg-amber-50/40 px-4 py-3"><p className="font-mono text-[11px] font-bold tracking-[0.14em] text-amber-400">DEMO BUILD</p><p className="mt-1 text-sm text-slate-600">Arayüz geliştirme süreci devam etmektedir.</p></div>
    </GuideSection>
  </div>;
}
