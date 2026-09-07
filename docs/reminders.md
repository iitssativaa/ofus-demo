# Görev hatırlatıcıları

Görev hatırlatıcıları veritabanında zamanlanır ve `process-task-reminders` Edge
Function tarafından işlenir. M2.5B'de Telegram gerçek sağlayıcı olarak bağlanmıştır;
bir gönderim ancak Telegram API geçerli bir mesaj kimliği döndürdüğünde başarılı
sayılır.

Preset seçimi `one_day_before`, `three_hours_before` veya `at_deadline` kararlı
değeriyle saklanır. Veritabanı buna karşılık gelen `offset_minutes` ve gerçek
`remind_at` zamanını üretir.

## Telegram bot kurulumu

1. Telegram'da BotFather ile bir bot oluşturun ve HTTP API token'ını alın.
2. Rastgele, en az 32 karakterlik bir webhook secret üretin.
3. Değerleri yalnızca Supabase Edge Function secret'ı olarak kaydedin:

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
npx supabase secrets set TELEGRAM_WEBHOOK_SECRET=YOUR_RANDOM_WEBHOOK_SECRET
```

4. Edge Function'ları deploy edin:

```bash
npx supabase functions deploy telegram-integration --no-verify-jwt
npx supabase functions deploy process-task-reminders --no-verify-jwt
```

5. Telegram webhook'unu aynı secret ile kaydedin. Token ve secret'ı terminal
geçmişine yazmak istemiyorsanız bunları geçici ortam değişkenlerinden okuyun:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-integration","secret_token":"YOUR_RANDOM_WEBHOOK_SECRET","allowed_updates":["message"]}'
```

Webhook yalnızca `X-Telegram-Bot-Api-Secret-Token` başlığı doğruysa güncellemeyi
kabul eder. Ayarlar ekranındaki bağlantı kodu 10 dakika geçerlidir, veritabanında
yalnızca SHA-256 özeti saklanır ve bir defa kullanılabilir.

## Zamanlama

İşlemciyi uzakta etkinleştirmek için önce rastgele ve güçlü bir değer üretin. Aynı
değeri hem Edge Function secret'ı hem Vault secret'ı olarak kaydedin:

```bash
npx supabase secrets set REMINDER_CRON_SECRET=YOUR_RANDOM_SECRET
```

Ardından Supabase SQL Editor'da proje URL'sini ve aynı secret'ı Vault'a ekleyip
dakikalık işi oluşturun:

```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_RANDOM_SECRET', 'reminder_cron_secret');

select cron.schedule(
  'process-task-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-task-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

İşlemci her çalışmada en fazla 25 satırı atomik olarak claim eder. Başarısız
denemeler beş dakika sonra yeniden alınabilir ve toplam üç denemeyle sınırlıdır.

Cron durumunu kontrol etmek için:

```sql
select jobid, jobname, schedule, active from cron.job
where jobname = 'process-task-reminders-every-minute';
```

## Bağlantıyı test etme

Ayarlar > Telegram bölümünden **Telegram'ı Bağla** seçilir, açılan botta Başlat
komutu gönderilir ve uygulamada **Bağlantıyı Kontrol Et** kullanılır. Bağlandıktan
sonra **Test Mesajı Gönder** gerçek Telegram API çağrısı yapar. Yerel geliştirmede
Telegram webhook'u `localhost` adresine ulaşamaz; webhook hedefi deploy edilmiş ve
HTTPS kullanan Edge Function olmalıdır.

## Saat dilimi

Görev `due_at` ve hatırlatıcı `remind_at` alanları `timestamptz` olarak mutlak
zamanda saklanır. Hatırlatma ofsetleri biçimlendirilmiş yerel tarihler üzerinde
değil bu mutlak zaman damgası üzerinde hesaplanır. Ayrı bir kullanıcı saat dilimi
tercihi henüz bulunmadığından görev formunun mevcut tarayıcı/tarih davranışı
korunur. Telegram mesajları `TELEGRAM_TIME_ZONE` verilmezse `Europe/Istanbul`
görüntüleme varsayımını kullanır; zamanlayıcı hesapları bu varsayımdan etkilenmez.
