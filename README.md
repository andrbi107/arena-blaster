# Arena Blaster

> یک شوتر top-down wave-survival با ۴ نوع دشمن، pickupها، و باس هر ۱۰ موج — PWA با Vanilla JS.

[![Version](https://img.shields.io/badge/version-v0.0.5-blue)](https://github.com/andrbi107/arena-blaster/releases/tag/v0.0.5) [![PWA](https://img.shields.io/badge/PWA-installable-purple)](https://andrbi107.github.io/arena-blaster/) [![deps](https://img.shields.io/badge/deps-Howler.js_local-blueviolet)](https://github.com/andrbi107/arena-blaster) [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

🎮 **[بازی کن](https://andrbi107.github.io/arena-blaster/)** — نسخه‌ی آنلاین روی GitHub Pages
📦 **[مخزن گیت‌هاب](https://github.com/andrbi107/arena-blaster)** · 🏷️ **[Release v0.0.5](https://github.com/andrbi107/arena-blaster/releases/tag/v0.0.5)**

---

## تغییرات v0.0.5 (جدید)

**همه‌ی بازی‌ها (v0.0.5)** — لایه‌ی متای محصول افزوده شد: **صفحه‌ی لودینگ** برندشده، **منوی اصلی** (راهنما / آمار و تاریخچه / امتیازات و رقابت / تنظیمات)، **تاریخچه و آمار** (آخرین بازی‌ها + مجموع/میانگین/بهترین + دستاوردها)، **جدول امتیازات و رقابت** (مدال‌های 🥇🥈🥉 + تیرهای Bronze→Diamond + کد اشتراک رکورد)، و **بروزرسانی خودکار PWA** (بنر «نسخه‌ی جدید آماده است» → با یک کلیک بروزرسانی، نسخه‌ی جدید جایگزین می‌شود). `sw.js` بازنویسی شد: cache v5 + network-first برای صفحات (دریافت خودکار HTML جدید) + skipWaiting از طریق بنر + رفع باگ cache آفلاین SFX (پسوند .wav).

---

## تغییرات v0.0.4

(v0.0.4 فقط کیت مشترک؛ گیم‌پلی v0.0.3 حفظ شد: شلیک خودکار + ۴ pickup).

**همه‌ی بازی‌ها (v0.0.4)** — `gamekit.js` مشترک + `vendor/howler.min.js` محلی: صدای Howler با SFX خودکار (pickup/collision/game-over از طریق پل MUX)، صفحه‌ی **راهنما**، صفحه‌ی **تنظیمات** (قطع/وصل صدا)، قلاب‌های تست (`render_game_to_text`/`advanceTime`)، **فول‌اسکرین** (کلید F)، و سیستم **دستاوردها**. cache سرویس‌ورکر به v4 ارتقا یافت (آفلاین کامل با vendor).

---

## تغییرات v0.0.3

**Arena Blaster** — شلیک خودکار در حضور دشمن (PC و موبایل)؛ بازی دیگر هنگ نمی‌کند و به‌طور قابل‌اعتماد شلیک می‌کند.

---

## تغییرات v0.0.2

**Arena Blaster** — time-slow pickup: ۴مین pickup (آیکون ساعت، بنفش) که دشمنان و شلیک آن‌ها را برای ۸s به ۴۰٪ کند می‌کند. haptic روی pickup/game-over.

**همه‌ی بازی‌ها** — `mobile-ux.js` مشترک (haptics/install prompt/version stamp) + cache sw.js به v2.

---

## تغییرات v0.0.1

نسخه‌ی پایه‌ی اولیه (پیش از پایداری) — شوتر top-down wave-survival با ۴ نوع دشمن و باس هر ۱۰ موج؛ pickupهای rapid-fire/spread-shot/shield، حالت landscape؛ PWA (manifest + service worker).

---

## معرفی

Arena Blaster یک شوتر top-down wave-survival landscape است که روی یک HTML5 `<canvas>` (منطقی ۹۶۰×۶۰۰، responsive با CSS) رسم می‌شود. بازیکن یک کشتی/تانک مثلثی cyan در یک آرنا tactical تیره فرماندهی می‌کند؛ کشتی به سمت هدف (موس/رو-heading/نزدیک‌ترین دشمن) می‌چرخد و گلوله‌های زرد شلیک می‌کند. دشمنان از چهار لبه در موج‌های صعودی سرازیر می‌شوند و هدف زنده ماندن و کسب امتیاز است.

هر ۱۰امین موج فقط یک باس است. ۳ جان، هر hit ۱ ثانیه invuln چشمک‌زن می‌دهد؛ pickupهای rapid-fire، spread-shot و shield از کشتن دشمنان (۱۵٪ احتمال) می‌افتند. دشواری با شماره‌ی موج رشد می‌کند: سرعت دشمن و سرعت گلوله‌ی دشمن با موج scale می‌شوند.

## ویژگی‌ها

- **۴ آرک‌تایپ دشمن** — walker (دایره‌ی grey، kamikaze)، sprinter (مثلث orange، سریع)، tank (مربع red با HP bar، شلیک می‌کند)، boss (hexagon purple، radial + spread).
- **باس هر ۱۰ موج** با HP = ۲۸ + wave×۵ و نوار HP تمام‌عرض بالای صفحه.
- **۳ pickup** (هر کدام ۸s، حداکثر یک‌تایی) — rapid-fire (×۲ نرخ)، spread-shot (۳-way)، shield (یک hit جذب).
- **سیستم موج با budget** — `4 + wave*2` امتیاز؛ sprinter از موج ۲، tank از موج ۴.
- **aiming خودکار روی touch** — drag-to-move + auto-fire به نزدیک‌ترین دشمن.
- **۳ جان + invuln** چشمک‌زن، انفجارهای expanding ring + ذرات.
- **حالت landscape** با overlay «دستگاه را بچرخان» در portrait.
- **کنترل کامل موس + کیبورد + تاچ**.
- **PWA آفلاین**.

## نحوه‌ی بازی

| دستگاه | حرکت | نشانه‌گیری | شلیک | توقف |
|---|---|---|---|---|
| **موس** | WASD | به سمت مکان‌نما | نگه‌داشتن کلیک چپ | — |
| **کیبورد** | WASD | Arrow ←/→ چرخش · ↑/↓ thrust | Space | P/Esc |
| **تاچ** | drag روی کانواس (move-target) | auto-aim نزدیک‌ترین دشمن | auto-fire هنگام touch | دکمه‌ی Pause |

### مکانیک بازی

- **بازیکن**: مثلث cyan، r=۱۵، سرعت ۲۳۲ px/s، fire rate ۱/۰.۱۷s، ۳ جان.
- **aiming priority**: (۱) موس اگر حرکت کرده → رو به مکان‌نما؛ (۲) Arrow ←/→ → چرخش ۳.۴ rad/s؛ (۳) auto-face نزدیک‌ترین دشمن.
- **enemies**: walker (r=۱۴، hp ۱، +۱۰)، sprinter (r=۱۳، hp ۱، +۲۰)، tank (r=۲۲، hp ۴، شلیک ~۲.۱s، +۵۰)، boss (r=۴۶، hp=۲۸+wave*۵، +۵۰۰).
- **موج**: budget = ۴+wave*۲؛ walker=۱، sprinter=۲، tank=۴؛ فاصله‌ی اسپاون `0.85 - wave*0.03` (floor ۰.۳۲).
- **pickup**: ۱۵٪ drop chance؛ هر کدام ۸s، new جایگزین old می‌شود.
- **دشواری**: enemy speed = `min(2.0, 1+(wave-1)*0.045)`؛ bullet speed = `150 + wave*4.5`.
- **امتیاز**: +۱۰/+۲۰/+۵۰/+۵۰۰؛ رکورد در `localStorage['arenaBlaster.best']`.
- **stateها**: start/playing/intermission/paused/over.

## نصب روی موبایل/دسکتاپ (PWA)

1. لینک بازی را در **Chrome** یا **Edge** باز کنید (اندروید/دسکتاپ) یا **Safari** (iOS).
2. منوی مرورگر → **Install app** / **Add to Home screen** (اندروید) یا **Share → Add to Home Screen** (iOS).
3. آیکن روی صفحه‌ی اصلی ظاهر می‌شود؛ اجرای آن تمام‌صفحه و مستقل از مرورگر است.
4. پس از اولین بارگذاری، بازی **بدون اینترنت** هم کار می‌کند (service worker کل shell را cache کرده است).

## تکنولوژی

- **HTML5 `<canvas>`** — تمام رندر با primitives (`arc`, `fillRect`, `translate`, `rotate`, `shadowBlur`).
- **Vanilla JavaScript** — بدون هیچ کتابخانه، framework یا CDN.
- **CSS** با `clamp()` برای تایپوگرافی responsive، `safe-area-inset` برای notch موبایل، و `100dvh`.
- **PWA**: `manifest.json` + `sw.js` (service worker که کل shell را precache می‌کند) → بازی پس از اولین بارگذاری **کاملاً آفلاین** و **قابل نصب** روی اندروید/iOS/دسکتاپ است.
- بدون تصویر، فونت یا فایل صوتی خارجی — همه‌چیز با کد تولید می‌شود.

## ساختار پروژه

| فایل | نقش |
|---|---|
| `index.html` | canvas، HUD (score/wave/lives/pickup/pause)، boss bar، overlayها، rotate hint |
| `styles.css` | stage landscape (aspect ۹۶۰/۶۰۰، 100dvh، safe-area)، پالت tactical، overlayها، rotate hint |
| `main.js` | کل بازی: state machine، input، wave builder، enemy AI، pickup، collision، ذرات، render، loop |
| `manifest.json` | PWA، `display:fullscreen`، `orientation:landscape`، icon `any maskable` |
| `sw.js` | precache + cache-first با fallback |
| `icon.svg` | مثلث cyan با barrel روی grid tactical، سیلوئت دشمنان در گوشه‌ها |

## شخصی‌سازی

تمام ثابت‌ها بالای `main.js` درون IIFE و شیء `COLORS`:

- `PLAYER_SPEED`, `PLAYER_RADIUS`, `PLAYER_FIRE_RATE`, `PLAYER_TURN_RATE` — حس بازیکن.
- `BULLET_SPEED`, `BULLET_LIFE`, `BULLET_LEN` — سلاح بازیکن.
- `START_LIVES`, `INVULN_TIME` — جان.
- `PICKUP_DURATION`, `PICKUP_DROP_CHANCE`, `PICKUP_LIFE` — اقتصاد pickup.
- `SCORE_WALKER/SPRINTER/TANK/BOSS` — امتیازها.
- `buildWave(n)` — فرمول budget، آستانه‌ی unlock، فاصله‌ی اسپاون، قانون باس هر ۱۰.
- `enemySpeedMul()`, `ebulletSpeed()` — منحنی‌های دشواری.
- `COLORS` — همه‌ی پالت.
- `BEST_KEY` — کلید localStorage.

## توسعه و اجرای محلی

```bash
git clone https://github.com/andrbi107/arena-blaster.git
cd arena-blaster
# سرویس‌ورکر فقط روی http(s) ثبت می‌شود، پس یک سرور محلی راه بیندازید:
python3 -m http.server 8080
# سپس http://localhost:8080/ را در مرورگر باز کنید
```

برای آزمایش روی موبایل، می‌توانید پوشه را روی گوشی با یک سرور استاتیک سرو کنید یا از `ngrok`/مرورگر موبایل روی همان شبکه استفاده کنید.

## استقرار

محتوای شاخه‌ی `main` به‌صورت خودکار از طریق **GitHub Pages** سرو می‌شود:

**https://andrbi107.github.io/arena-blaster/**

هیچ build stepی لازم نیست — همه‌ی مسیرها relative هستند (`./`)، پس بازی هم از root مخزن و هم از زیرپوشه کار می‌کند.

## نسخه‌گذاری (SemVer)

این پروژه از [Semantic Versioning](https://semver.org/lang/fa/) پیروی می‌کند:

- نسخه‌ها از **`0.0.1`** آغاز می‌شوند (مرحله‌ی پیش از پایداری نهایی؛ هر تغییر می‌تواند breaking باشد).
- قالب: `MAJOR.MINOR.PATCH` → در فاز 0.x: `0.MINOR.PATCH`.
- **هر توسعه یا شخصی‌سازی** در یک شاخه‌ی جداگانه انجام می‌شود:
  - `feat/<name>` برای قابلیت جدید یا شخصی‌سازی
  - `fix/<name>` برای رفع باگ
  - `docs/<name>` برای مستندسازی
  - `refactor/<name>` برای بازسازمان‌دهی کد
- پس از merge به `main`، تگ SemVer بعدی زده می‌شود و یک **GitHub Release** منتشر می‌گردد.
- RELEASE NOTES هر بار در صفحه‌ی Releases مخزن ثبت می‌شود.

### نقشه‌ی نسخه‌بندی پیشنهادی برای توسعه‌های بعدی

| نوع تغییر | bump | مثال |
|---|---|---|
| رفع باگ کوچک، tweak رنگ/عدد | PATCH | `0.0.1` → `0.0.2` |
| قابلیت جدید، مکانیک جدید، level جدید | MINOR | `0.0.1` → `0.1.0` |
| بازنویسی API/ساختار، تغییر breaking | MAJOR (هنوز در 0.x) | `0.1.0` → `0.2.0` |
| رسیدن به پایداری نهایی | — | `0.x.0` → `1.0.0` |

## لایسنس

MIT — استفاده، تغییر و بازنشر آزاد. ساختهشده بهعنوان یک مهارت/قالب آموزشی برای بازی‌سازی PWA با Vanilla JS.
