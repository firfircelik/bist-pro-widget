
# BIST Pro v2 — Çok Zaman Dilimli Rehber (PWA)

**Bu bir eğitim aracıdır, yatırım tavsiyesi değildir.**

## Yenilikler (v2)
- **Piyasa Saati & Durum**: Europe/Istanbul saatine göre açık/kapalı/ara + geri sayım. Saatleri **Ayarlar**'dan değiştirebilirsiniz.
- **Monte Carlo Simülatörü**: Kazanma oranı, R:R, risk %, işlem sayısı ve koşu adedi ile dağılım, yüzdelikler ve drawdown olasılığı.
- **Günlük İstatistikleri + Equity Eğrisi**: Expectancy, max DD, toplam PnL, ort. R ve çizim — hepsi yerel.
- **İzleme Listesi İçe/Dışa Aktarma (CSV)**.
- **Tick adımı & zaman dilimi & tema** ayarları (koyu/açık).
- **Service Worker v2** — daha sağlam önbellek.

## Kurulum
### Mac (Yerel test)
```bash
python3 -m http.server 8000
```
Ardından Safari/Chrome: `http://localhost:8000` → **Paylaş/Dock’a ekle** ile yükleyin.

### iPhone
Safari ile sayfayı açın → **Paylaş > Ana Ekrana Ekle**.

> Tam PWA davranışı için HTTPS (GitHub Pages/Netlify) önerilir.

## Kullanım İpuçları
- Sembol girip **Uygula**; 1D/1h/5m/1m arasında geçiş.
- **Risk** hesaplayıcıda tick adımına göre yuvarlama yapılır; piyasa kuralları değişebileceği için tick değerini Ayarlar’dan kendiniz belirleyin.
- **Monte Carlo** ile risk/ödül profilinizi test edin; sonuçlar istatistikseldir.
- **Günlük**: Girdiğiniz sonuçlardan istatistik & eğri otomatik hesaplanır; **CSV** dışa aktar/ içe aktar.

## Notlar
- TradingView gömülü bileşenleri kullanılır; üçüncü parti şartlarını kontrol ediniz.
- Seans saatleri, tavan–taban bantları ve tedbirler değişebilir; resmî kaynaklardan doğrulayınız.
