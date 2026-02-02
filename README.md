# Teachers Hub Indonesia

Eduversal öğretmenler için eğitim kaynakları platformu.

## Kurulum

### 1. GitHub'a Push

```bash
git add .
git commit -m "Initial setup"
git push origin main
```

### 2. Vercel'de Proje Oluşturma

1. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin
2. "New Project" butonuna tıklayın
3. GitHub reposunu seçin
4. Import edin

### 3. Environment Variables Ekleme

Vercel Dashboard'da:

1. Projenize gidin
2. **Settings** → **Environment Variables** sekmesine tıklayın
3. Aşağıdaki değişkenleri ekleyin:

| Name | Value |
|------|-------|
| `FIREBASE_API_KEY` | Firebase API anahtarınız |
| `FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | Firebase proje ID'niz |
| `FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `FIREBASE_APP_ID` | App ID |

> **Not:** Bu değerleri Firebase Console > Project Settings > General > Your apps bölümünden alabilirsiniz.

### 4. Deploy

Environment variables ekledikten sonra:
1. **Deployments** sekmesine gidin
2. En son deployment'ın yanındaki "..." menüsüne tıklayın
3. **Redeploy** seçin

## Yerel Geliştirme

Yerel ortamda test etmek için:

1. `.env` dosyası oluşturun (`.env.example`'ı kopyalayın)
2. Firebase bilgilerinizi girin
3. Build çalıştırın:

```bash
# Environment variables'ı yükleyip build
export $(cat .env | xargs) && node build.js

# veya Windows PowerShell için:
# Get-Content .env | ForEach-Object { $var = $_.Split('='); [System.Environment]::SetEnvironmentVariable($var[0], $var[1]) }; node build.js
```

4. `dist/index.html` dosyasını tarayıcıda açın

## Proje Yapısı

```
Teachers Hub/
├── index.html      # Ana uygulama (kaynak)
├── build.js        # Vercel build script
├── vercel.json     # Vercel yapılandırması
├── .env.example    # Örnek environment variables
├── .gitignore      # Git ignore listesi
└── dist/           # Build çıktısı (gitignore'da)
    └── index.html  # Derlenmiş uygulama
```

## Nasıl Çalışır?

1. Vercel, `build.js` scriptini çalıştırır
2. Script, `index.html`'deki `__PLACEHOLDER__` değerlerini environment variables ile değiştirir
3. Sonuç `dist/index.html`'e yazılır
4. Vercel, `dist` klasöründen sunucu yapar
