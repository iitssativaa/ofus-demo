import type { Company, Priority, Project, Status, Task, TaskSize, User, WorkNotification } from "./types";

const at = (offset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const users: User[] = [
  { id: "u-ada", name: "Ada Kaya", firstName: "Ada", initials: "AK", role: "Strateji ve Tasarım", color: "#5b67d8" },
  { id: "u-mert", name: "Mert Aydın", firstName: "Mert", initials: "MA", role: "Geliştirme ve Teslimat", color: "#d36b4b" },
];

export const companies: Company[] = [
  { id: "c-northstar", name: "Northstar Labs", color: "#5b67d8", contactName: "Selin Aral", phone: "+90 212 555 01 24", email: "selin@northstarlabs.co", website: "northstarlabs.co", notes: "Ürün ve pazarlama ekipleriyle iki haftada bir ilerleme görüşmesi yapılır." },
  { id: "c-alder", name: "Alder & Co.", color: "#2b8a72", contactName: "Burak Tanyeri", phone: "+90 216 555 16 08", email: "burak@alderandco.com", website: "alderandco.com", notes: "Teslimler marka ekibi ve finans ekibi tarafından birlikte onaylanır." },
  { id: "c-nomad", name: "Nomad Coffee", color: "#ba7444", contactName: "Ece Gün", phone: "+90 232 555 42 18", email: "ece@nomadcoffee.com", website: "nomadcoffee.com", notes: "Ürün fotoğrafları ve fiyat güncellemeleri Ece üzerinden ilerler." },
  { id: "c-studio", name: "Studio Kora", color: "#a85f8c", contactName: "Mina Koray", phone: "+90 212 555 83 40", email: "mina@studiokora.com", website: "studiokora.com", notes: "Portfolyo seçkisi netleştiğinde proje yeniden hızlanacak." },
  { id: "c-field", name: "Field Notes", color: "#678244", contactName: "Can Önder", phone: "+90 312 555 37 11", email: "can@fieldnotes.work", website: "fieldnotes.work", notes: "Araştırma prototipi için haftalık kısa demo tercih ediliyor." },
  { id: "c-lumen", name: "Lumen Health", color: "#3780a8", contactName: "Dr. İpek Tuna", phone: "+90 216 555 70 92", email: "ipek@lumenhealth.co", website: "lumenhealth.co", notes: "Sağlıkla ilgili tüm ifadeler klinik incelemeden geçmelidir." },
];

export const projects: Project[] = [
  { id: "p-north-web", name: "Platform yenileme", companyId: "c-northstar", status: "Active", progress: 62, memberIds: ["u-ada", "u-mert"], description: "Temel ürün anlatısını yeniden kurgulayıp yeni pazarlama sitesini yayına alma.", notes: "Salı günleri kontrol toplantısı. Teslimden önce erişilebilirlik incelemesi yapılacak." },
  { id: "p-north-launch", name: "4. çeyrek lansman kampanyası", companyId: "c-northstar", status: "Active", progress: 28, memberIds: ["u-ada"], description: "Lansman anlatısı, kampanya araç seti ve iş ortağı materyalleri.", notes: "Son konumlandırma, firma görüşmelerinin sentezine bağlı." },
  { id: "p-alder-brand", name: "Marka yenileme", companyId: "c-alder", status: "Wrapping up", progress: 86, memberIds: ["u-ada", "u-mert"], description: "Alder'ın kimliğini ve dijital sistemini ölçülü biçimde yenileme.", notes: "Kaynak dosyalar son onaydan sonra paketlenecek." },
  { id: "p-alder-report", name: "Yıllık rapor", companyId: "c-alder", status: "Active", progress: 41, memberIds: ["u-mert"], description: "Editoryal veri anlatımına sahip etkileşimli yıllık rapor.", notes: "Finans metinleri henüz taslak aşamasında." },
  { id: "p-nomad-shop", name: "Çevrimiçi mağaza", companyId: "c-nomad", status: "Active", progress: 53, memberIds: ["u-ada", "u-mert"], description: "Kahve ve ekipman için dönüşüm odaklı satış deneyimi.", notes: "Fotoğraflar gelecek hafta teslim edilecek." },
  { id: "p-kora-site", name: "Portfolyo sitesi", companyId: "c-studio", status: "On hold", progress: 35, memberIds: ["u-mert"], description: "Bir mimarlık ofisi için editoryal portfolyo sitesi.", notes: "Firmanın vaka çalışmalarını seçmesi bekleniyor." },
  { id: "p-field-app", name: "Araştırma çalışma alanı", companyId: "c-field", status: "Active", progress: 18, memberIds: ["u-ada", "u-mert"], description: "Nitel araştırma ekipleri için sakin bir çalışma alanı prototipi.", notes: "Prototip kapsamı dar tutulacak: yakala, etiketle, sentezle." },
  { id: "p-lumen-onboard", name: "Üye başlangıç deneyimi", companyId: "c-lumen", status: "Active", progress: 72, memberIds: ["u-ada", "u-mert"], description: "Üyeliğin ilk yedi günündeki sürtünmeyi azaltma.", notes: "Sağlık iddialarının tamamı klinik incelemeden geçmeli." },
  { id: "p-field-ops", name: "Araştırma operasyon desteği", companyId: "c-field", status: "Active", progress: 47, memberIds: ["u-ada", "u-mert"], description: "Araştırma oturumlarının izin, arşiv ve planlama işlerini düzenleme.", notes: "Cuma değerlendirmesi: katılımcı planı, açık belgeler ve riskler." },
];

type Seed = [string, string, string, string, Status, Priority, TaskSize, number, string[], number, number];
const seeds: Seed[] = [
  ["Ana sayfa anlatısını tamamla", "Tasarım son rötuşlarından önce ürün hikâyesini ve destekleyici kanıtları netleştir.", "p-north-web", "u-ada", "In Progress", "Urgent", "L", -3, ["metin", "lansman"], 3, 4],
  ["Ödeme vergi senaryolarını düzelt", "Bölgesel vergi durumlarını incele ve hatalı iki akışı düzelt.", "p-nomad-shop", "u-mert", "In Progress", "Urgent", "L", -1, ["geliştirme", "ödeme"], 2, 5],
  ["Yıllık rapor prototipini gönder", "Mevcut etkileşim taslağını paydaş incelemesi için paketle.", "p-alder-report", "u-mert", "Review", "High", "M", 0, ["prototip"], 4, 4],
  ["Firma görüşmelerini sentezle", "Sekiz lansman görüşmesindeki tekrar eden temaları çıkar.", "p-north-launch", "u-ada", "To Do", "High", "L", 0, ["araştırma", "strateji"], 1, 5],
  ["Başlangıç akışı iddialarını incele", "Klinik ekibin yorumlarını karşılama akışına uygula.", "p-lumen-onboard", "u-ada", "Waiting", "High", "M", 1, ["içerik", "hukuk"], 2, 3],
  ["Ürün ızgarasını uyumlu hâle getir", "Ürün kartlarını tablet ve küçük mobil ekranlar için düzenle.", "p-nomad-shop", "u-mert", "To Do", "High", "M", 1, ["arayüz"], 0, 4],
  ["Kimlik kaynak dosyalarını hazırla", "Ana logoları, tipografi stillerini ve dışa aktarma ayarlarını temizleyip paketle.", "p-alder-brand", "u-mert", "To Do", "Medium", "M", 2, ["teslim", "marka"], 1, 4],
  ["Araştırma etiketleme akışını çıkar", "Prototip için en küçük işlevsel etiketleme etkileşimini tanımla.", "p-field-app", "u-ada", "In Progress", "High", "XL", 2, ["deneyim", "prototip"], 3, 6],
  ["Mimari vaka çalışması metnini yaz", "Paylaşılan proje notlarını editoryal bir vaka çalışmasına dönüştür.", "p-kora-site", "u-ada", "Waiting", "Medium", "L", 3, ["metin"], 2, 5],
  ["Kampanya içerik matrisini oluştur", "Formatları, sorumluları, kaynak metinleri ve teslim tarihlerini eşleştir.", "p-north-launch", "u-ada", "To Do", "Medium", "M", 3, ["kampanya"], 1, 4],
  ["Karşılama e-postalarını test et", "Prototipte bağlantıları, görünümü ve üye segmentasyon kurallarını kontrol et.", "p-lumen-onboard", "u-mert", "Review", "High", "M", 4, ["kalite", "e-posta"], 4, 5],
  ["Rapor veri bileşenlerini oluştur", "Yıllık ölçümler için yeniden kullanılabilir üç gösterim biçimi geliştir.", "p-alder-report", "u-mert", "In Progress", "High", "XL", 4, ["arayüz", "veri"], 3, 7],
  ["Portfolyo projelerini seç", "Firma, yayında yer alacak altı projeyi onaylasın.", "p-kora-site", "u-mert", "Waiting", "Low", "S", 5, ["firma"], 0, 2],
  ["Boş durum yönlendirmelerini yaz", "Yeni çalışma alanına ve arama durumlarına yararlı yönlendirmeler ekle.", "p-field-app", "u-ada", "To Do", "Medium", "S", 5, ["içerik", "deneyim"], 0, 3],
  ["Ürün görsellerini optimize et", "Uyumlu kırpmalar oluştur ve sıkıştırma kalitesini doğrula.", "p-nomad-shop", "u-mert", "To Do", "Medium", "L", 6, ["performans"], 1, 5],
  ["Marka kullanım sayfasını tamamla", "Son geri bildirimleri kullanım kılavuzuna uygula.", "p-alder-brand", "u-ada", "Review", "Medium", "M", 6, ["marka", "kılavuz"], 4, 5],
  ["Kullanılabilirlik oturumlarını planla", "Beş araştırmacı bul ve moderasyonlu test kılavuzunu hazırla.", "p-field-app", "u-ada", "To Do", "High", "L", 7, ["araştırma"], 0, 5],
  ["Hareket tasarımı değerlerini güncelle", "Başlangıç prototipindeki süreleri ve geçişleri standartlaştır.", "p-lumen-onboard", "u-mert", "To Do", "Low", "S", 8, ["tasarım-sistemi"], 1, 3],
  ["Araştırma izin belgelerini arşivle", "Tamamlanan oturumların izin kayıtlarını uzlaştır ve arşivle.", "p-field-ops", "u-ada", "To Do", "Low", "M", 9, ["operasyon"], 0, 2],
  ["Katılımcı izin metnini incele", "Yeni oturumlar için izin koşullarını karşılaştır ve takip sorularını not et.", "p-field-ops", "u-mert", "To Do", "Medium", "S", 10, ["operasyon"], 0, 2],
  ["Lansman iş ortağı logolarını ekle", "Onaylı iş ortağı logolarını yerleştir ve boşluk kurallarını doğrula.", "p-north-web", "u-mert", "To Do", "Medium", "S", 10, ["arayüz"], 1, 3],
  ["Bileşen kararlarını belgele", "Tasarım sistemi turundaki istisnaları ve açık soruları kaydet.", "p-north-web", "u-ada", "To Do", "Low", "M", 12, ["belgeleme"], 0, 4],
  ["Ürün paketi fiyatlarını onayla", "Üç sezonluk paket seçeneği için son onayı al.", "p-nomad-shop", "u-ada", "Waiting", "High", "S", 13, ["firma", "ticaret"], 1, 2],
  ["Eski logo çalışmalarını arşivle", "Geçersiz kalan denemeleri ortak teslim klasöründen kaldır.", "p-alder-brand", "u-mert", "Done", "Low", "S", -5, ["marka"], 2, 2],
  ["Başlangıç prototipi v2'yi yayımla", "Güncellenen akışı klinik ve ürün incelemesine aç.", "p-lumen-onboard", "u-mert", "Done", "High", "L", -2, ["prototip"], 6, 6],
  ["Araştırma alanı asgari sürümünü tanımla", "Ekibi işler, sınırlar ve prototip başarı ölçütlerinde hizala.", "p-field-app", "u-ada", "Done", "High", "M", -6, ["strateji"], 4, 4],
  ["Mevcut analitik yapısını denetle", "Güvenilir olayları listele ve yenileme öncesindeki eksikleri belirle.", "p-north-web", "u-mert", "Done", "Medium", "M", -7, ["analitik"], 3, 3],
  ["Tadım notu şablonu oluştur", "Yeni kahveler için yeniden kullanılabilir ürün anlatımı şablonu hazırla.", "p-nomad-shop", "u-ada", "Done", "Medium", "S", -9, ["içerik"], 3, 3],
  ["Araştırma planlama gününü ayarla", "Sakin bir çalışma mekânı bul ve iki takvimde de bir cuma gününü ayır.", "p-field-ops", "u-ada", "To Do", "Medium", "S", 14, ["operasyon"], 0, 1],
  ["Eksik rapor portrelerini iste", "Firmadan eksik iki yönetici portresini talep et.", "p-alder-report", "u-mert", "To Do", "High", "S", 15, ["firma", "dosyalar"], 0, 2],
];

const cancelledRecords: Record<number, { cancelledAt: string; deletionReason: "Müşteri işi iptal etti" | "İş artık gerekli değil" | "Başka görevle birleştirildi" | "Diğer"; deletionNote?: string }> = {
  16: { cancelledAt: at(-4), deletionReason: "Müşteri işi iptal etti", deletionNote: "Firma bu çeyrekte araştırma bütçesini durdurdu." },
  18: { cancelledAt: at(-8), deletionReason: "Başka görevle birleştirildi", deletionNote: "İçerik çalışması ana lansman görevinin kapsamına taşındı." },
};

export const initialTasks: Task[] = seeds.map((seed, index) => {
  const [title, description, projectId, assigneeId, status, priority, size, dueOffset, tags, done, total] = seed;
  const project = projects.find((item) => item.id === projectId)!;
  const completedAt = status === "Done" ? at(dueOffset + 1) : undefined;
  const completionVariants = [
    { delivered: true, feedbackReceived: true, revisionsCompleted: true, successfullyClosed: true },
    { delivered: true, feedbackReceived: true, revisionsCompleted: false, successfullyClosed: true },
    { delivered: true, feedbackReceived: false, revisionsCompleted: true, successfullyClosed: true },
  ];
  const resultNotes = ["Müşteri onayladı, final dosyaları teslim edildi.", "Revize sonrası çalışma kapatıldı.", "Teslim edildi, ek revize talebi gelmedi."];
  const cancellation = cancelledRecords[index];
  const baseActivity = [
    { id: `t-${index + 1}-a-created`, description: "Görev oluşturuldu", userId: assigneeId, createdAt: `${at(-18 + index % 12)}T09:15:00.000Z` },
    { id: `t-${index + 1}-a-assigned`, description: `${users.find((user) => user.id === assigneeId)?.name} adlı kişiye atandı`, userId: assigneeId, createdAt: `${at(-17 + index % 12)}T10:30:00.000Z` },
  ];
  return {
    id: `t-${index + 1}`,
    title,
    description,
    projectId,
    companyId: project.companyId,
    assigneeId,
    status,
    priority,
    size,
    dueDate: at(dueOffset),
    createdAt: at(-18 + index % 12),
    tags,
    checklist: Array.from({ length: total }, (_, itemIndex) => ({ id: `t-${index + 1}-c-${itemIndex}`, label: ["Kapsam onaylandı", "Taslak hazırlandı", "İç inceleme", "Firma geri bildirimi", "Son kalite kontrolü", "Teslim tamamlandı", "Kaynak dosyaları arşivle"][itemIndex], done: itemIndex < done })),
    notes: status === "Waiting" ? "Firma geri bildirimi bekleniyor. Yarın öğleden sonraya kadar yanıt gelmezse takip et." : "Son teslimi kısa ve net tut; alınan kararları proje notlarına ekle.",
    completedAt,
    completionChecklist: status === "Done" ? completionVariants[index % completionVariants.length] : undefined,
    resultNote: status === "Done" ? resultNotes[index % resultNotes.length] : undefined,
    completionNote: status === "Done" && index % 2 === 0 ? "Kaynak dosyalar proje klasöründe arşivlendi." : undefined,
    cancelledAt: cancellation?.cancelledAt,
    deletionReason: cancellation?.deletionReason,
    deletionNote: cancellation?.deletionNote,
    activity: status === "Done" ? [...baseActivity, { id: `t-${index + 1}-a-delivered`, description: "Teslim edildi", userId: assigneeId, createdAt: `${at(dueOffset)}T14:00:00.000Z` }, { id: `t-${index + 1}-a-completed`, description: "Görev tamamlandı", userId: assigneeId, createdAt: `${completedAt}T16:30:00.000Z` }] : cancellation ? [...baseActivity, { id: `t-${index + 1}-a-cancelled`, description: "Görev iptal edildi", userId: assigneeId, createdAt: `${cancellation.cancelledAt}T15:00:00.000Z` }, { id: `t-${index + 1}-a-reason`, description: `Silinme nedeni: ${cancellation.deletionReason}`, userId: assigneeId, createdAt: `${cancellation.cancelledAt}T15:00:01.000Z` }] : baseActivity,
  };
});

const activityAt = (daysAgo: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

export const initialNotifications: WorkNotification[] = [
  { id: "n-1", type: "task_assigned", title: "Yıllık rapor prototipi sana atandı", companyId: "c-alder", projectId: "p-alder-report", taskId: "t-3", userId: "u-ada", createdAt: activityAt(0, 10), read: false },
  { id: "n-2", type: "deadline_soon", title: "Ana sayfa anlatısının son tarihi geçti", companyId: "c-northstar", projectId: "p-north-web", taskId: "t-1", userId: "u-mert", createdAt: activityAt(0, 9), read: false },
  { id: "n-3", type: "task_updated", title: "Ürün ızgarası görevi düzenlendi", companyId: "c-nomad", projectId: "p-nomad-shop", taskId: "t-6", userId: "u-mert", createdAt: activityAt(1, 16), read: true },
  { id: "n-4", type: "task_completed", title: "Başlangıç prototipi v2 tamamlandı", companyId: "c-lumen", projectId: "p-lumen-onboard", taskId: "t-25", userId: "u-mert", createdAt: activityAt(1, 14), read: true },
  { id: "n-5", type: "project_updated", title: "Marka yenileme projesi güncellendi", companyId: "c-alder", projectId: "p-alder-brand", userId: "u-ada", createdAt: activityAt(2, 11), read: false },
  { id: "n-6", type: "task_created", title: "Kampanya içerik matrisi oluşturuldu", companyId: "c-northstar", projectId: "p-north-launch", taskId: "t-10", userId: "u-ada", createdAt: activityAt(3, 15), read: true },
];
