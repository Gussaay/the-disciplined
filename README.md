# The Disciplined · الملتزم

An app that helps you commit to your goals, one place for five of them:

| Goal | What it does |
|---|---|
| 🏋️ **Training** | Pick a machine, or take a photo of it and let the AI recognise it, to see the exercises and how to do them. Log sets, reps and weight with a rest timer, see what you did last time and what to aim for today, records, weekly charts, ready-made and AI-written programmes. Live heart rate from a watch or strap, and the day's steps, calories and heart rate from the watch through Health Connect. |
| 🥗 **Healthy food** | Daily targets worked out from your weight, height, age, activity and goal. Add food from a list of 110 foods (Sudanese, Gulf and everyday), from a photo of the plate, from a description in words, or from a packet label. Calories, protein, carbohydrate, fat, sugar and fibre against targets, water, suggestions for what to eat next, and your own template day that is logged with one tap. |
| 🕌 **Prayer** | The five prayer times for your place (calculated on the device), each prayer marked on time, late or missed, and whether it was in the mosque. Weekly view and streak, Qibla direction, the full Quran with translation, bookmark and a daily reading goal, the azkar of Hisn al-Muslim with counters, and a tasbih counter. |
| 🤝 **Keeping in touch** | Family, relatives and friends, how often you want to reach each one, who is due now, call and WhatsApp buttons, a history of calls, visits and messages. |
| 🔤 **English** | A daily plan built from your level and minutes a day, vocabulary with spaced repetition, an AI tutor to talk to, AI correction of your writing, streak and progress. |

The home screen shows the day's commitment across the goals and the streak,
and the **dashboard** shows every goal over a week, a month or three months.

**Food database.** 7,000+ foods from USDA FoodData Central (SR Legacy, final
April 2018 release), searchable in Arabic and English and listed by food group,
with calories, macronutrients and 18 micronutrients per 100 g. Pork and alcohol
are left out. Unknown values stay unknown (a day total that includes them shows
"≥"). Foods logged from it keep a snapshot of their values. Several items can be
saved as a meal and logged in one tap. Rebuild the file with
`node scripts/build-nutrition.mjs <nutrition-database/data/foods.json>`;
sources and licence are in `docs/nutrition-database/`.
Everything is in **Arabic and English**, right-to-left in Arabic, light and dark.

## Same architecture as Easy Pedia

One codebase for the web and the phone, the same stack and layout as
`Gussaay/eaay-pedia-app`:

Vite + React 18 + Tailwind 3 + Firebase JS SDK + Capacitor 7 + PWA (vite-plugin-pwa).

```
src/
  pages/        one file per screen (Home, Gym, GymSession, Food, Prayer, Quran, Azkar, Social, English, Settings)
  components/   shared pieces (ui.jsx, BottomNav, AddFood, ExercisePicker, Ai)
  hooks/        useStore (saved state), useAuth, useTheme, useReminders
  lib/          the logic, free of React, with unit tests beside it (*.test.js)
  data/         the gym catalogue, the food table, the word lists, the surah index
  i18n/         Arabic / English
functions/      Cloud Function that answers AI requests (key kept on the server)
android/        the Capacitor Android project
public/         icons, the Quran (one file per surah), the azkar
```

Two things differ from Easy Pedia, on purpose:

- **The device comes first.** Everything you record is saved on the phone
  (`src/lib/store.js`), so the app works with no account and no connection.
  Firebase is optional: when it is configured, signing in mirrors the same data
  to `users/<uid>/data` (`src/lib/sync.js`) and it follows you across devices.
- **Texts are written side by side**, `L('Start workout', 'ابدأ التمرين')`, so a
  screen cannot ship with a missing translation.

## Commands

```bash
npm install
npm run dev              # http://localhost:5173
npm test                 # unit tests for the logic in src/lib
npm run build            # production web build -> dist/
npm run mobile:sync      # build + copy web assets into android/
npm run mobile:open      # open android/ in Android Studio (JDK 21)
npm run deploy:web       # build + firebase deploy --only hosting
node scripts/make-icons.mjs && npx @capacitor/assets generate --android   # redraw the icons
```

## Getting the app

**Android.** Every push builds an APK (`.github/workflows/deploy.yml`):

- from a pull request or branch: GitHub > Actions > the run > Artifacts > `android-apk`;
- from `main`: a permanent link,
  `https://github.com/Gussaay/the-disciplined/releases/latest/download/the-disciplined.apk`.

Open the file on the phone and allow installing from this source. Until the
signing secrets below exist the APK is a debug build whose key changes on each
build, so Android asks you to uninstall the previous build before a newer one
(save a backup in Settings first). To get builds that update in place, create a
keystore once and add four repository secrets:

```bash
keytool -genkey -v -keystore release.keystore -alias disciplined -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.keystore     # -> secret KEYSTORE_BASE64
# secrets: KEYSTORE_PASSWORD, KEY_ALIAS (disciplined), KEY_PASSWORD
```

**Web.** Two ways, both from `main`:

- *GitHub Pages (no account needed):* repository Settings > Pages > Source:
  **GitHub Actions**. The next push publishes
  `https://gussaay.github.io/the-disciplined/`. (Pages on a private repository
  needs a paid GitHub plan.)
- *Firebase Hosting:* see "Cloud backup" below.

On a phone browser, "Add to Home screen" installs the web app; it then works
offline, including the Quran and azkar once opened.

## AI

AI is used for: recognising gym equipment and food from photos, working out
nutrients from a description, meal ideas, writing a training programme, the
English tutor and writing correction. Everything else works without it.

- **Simplest:** Settings > AI > paste a Gemini key (free at
  <https://aistudio.google.com/apikey>) and/or a Groq key (free at
  <https://console.groq.com/keys>). They are stored on that device only and
  requests go straight from the device to Google or Groq. With both, Groq
  answers when Gemini fails or runs out of its daily allowance (Llama 4 Scout
  for photos, Llama 3.3 70B for text).
- **From GitHub:** add `GEMINI_API_KEY` and/or `GROQ_API_KEY` as repository
  secrets; each push to `main` stores them in the function and deploys it
  (needs the Blaze plan).
- **For everyone who signs in:** deploy the Cloud Function so the key stays on
  the server (needs the Firebase project below, on the Blaze plan):

  ```bash
  firebase functions:secrets:set GEMINI_API_KEY
  firebase functions:secrets:set GROQ_API_KEY     # optional text backup
  cd functions && npm install && cd ..
  firebase deploy --only functions
  ```

  Each account gets 60 AI requests a day (`AI_DAILY_LIMIT` in `functions/.env`).

AI estimates of food portions can be off; the grams can be corrected before adding.

## Accounts

The app opens on a sign-in screen: sign in, create an account (name, email,
password, with a verification email), reset a forgotten password, or continue
with Google. "Continue without an account" keeps everything on the phone, and
signing in later from Settings adopts what was recorded.

**Google sign-in in the Android app** needs two things from the Firebase console
(it already works on the website once Google is enabled):

1. Project settings > Your apps > the Android app `com.the.disciplined`: add the
   SHA-1 of the signing key
   (`keytool -list -v -keystore the-disciplined.keystore -alias disciplined`).
2. Authentication > Sign-in method > Google > Web SDK configuration: copy the
   **Web client ID** into the repository variable `VITE_GOOGLE_WEB_CLIENT_ID`.

Until then the Google button shows on the website only.

## Tasks

One list for the app's own goals of the day (the five prayers, training,
logging meals, English practice, people due a call, the weekly weigh-in), which
tick themselves, and your own tasks. Add a task by typing, by voice (recorded,
transcribed by Groq Whisper or Gemini) or from a photo; "Tidy with AI" turns
it into clean tasks with date, time, priority, category and steps. Calendar
events of the next two weeks come in from a Google Calendar secret iCal
address (Android app) or an .ics file. Any task can be sent over WhatsApp,
and tasks with a time can remind you on the phone.

## Weight and body (Bluetooth scale)

The Weight page reads OKOK / Chipsea body-fat scales straight from their
Bluetooth advertisements, so neither pairing nor the OKOK app is needed.
Formats handled (`src/lib/scaleParse.js`, after openScale's OKOK drivers):
`0x20CA` (weight + impedance), `0x11CA` (weight), `0x??C0` (weight +
impedance, MAC inside) and `0xF0FF`. An unknown scale can be taught from its
display ("Find" then "Teach the weight"), and "Copy capture" copies the raw
bytes for support. Body fat, muscle, water, visceral fat, bone, protein and
BMR come from the impedance with open formulas (`src/lib/bodyComp.js`), so
they can differ from OKOK's by a few points. Android only (web adds weight by
hand). Scanning needs Location on, as Android requires for Bluetooth scans.

### Logging food

- **Add** opens a pop-up that starts on **For you**: the foods you eat most at
  that meal with your usual amount, and the whole meal from last time.
- Tap any logged food to change its amount, move it to another meal, match it
  to the nutrition table, or delete it. Every delete asks first.
- **Photo** has a live camera, a normal photo and the gallery. The AI is given
  the names you log often, and each food it finds is matched to the nutrition
  table. A match you pick is remembered (`foodMemory`, synced) and used the
  next time that food is seen.

## Fingerprint, Google and locked keys

- **Google sign-in** works on the web straight away. On the phone it needs the
  signing key's SHA-1 (`1B:2E:3E:A5:E9:9D:D0:4A:F8:E5:17:80:80:F3:81:CA:88:06:9D:D2`)
  added to the Firebase Android app `com.the.disciplined`. The Web client ID is
  built in; `VITE_GOOGLE_WEB_CLIENT_ID` overrides it.
- **Fingerprint sign-in** (Android): after an email sign-in the app offers to keep
  the login in the phone's secure keystore; next time one touch signs in.
  Settings, Security turns it off.
- **App lock**: Settings, Security can lock the app behind the fingerprint. It
  locks again after a minute in the background.
- **API keys** are shown masked and locked once saved; press Edit to change or
  remove one.
- **Module themes**: each goal page has its own colour and illustration
  (`src/components/Illustrations.jsx`, colours and mottos in `GOALS` in
  `src/config.js`).

The fingerprint plugin is native, so phones need the new APK once; OTA
bundles after that install as usual.

## Updates

- **Website:** updates itself in the background (service worker).
- **Android, over the air:** every push to `main` publishes the built app as a
  zip with `latest/update.json` on Firebase Hosting. The app downloads it in the
  background and uses it on the next start (Settings > App updates can check and
  restart now). A bundle is installed only on an APK with the same native
  fingerprint (`scripts/native-hash.mjs`: the android/ project, the Capacitor
  config and plugin versions), so web code never runs on an APK missing a plugin.
- **Android, new APK:** `native-version.json` lists the newest APK. When it is
  newer than the installed one, the home screen offers the download.

Both need the `FIREBASE_SERVICE_ACCOUNT_DISCIPLINED` secret (hosting deploy).

## Smartwatch

- **Live heart rate during a workout:** the Watch button in a workout connects
  over Bluetooth to anything that offers the standard heart-rate service: chest
  straps, and watches with "broadcast heart rate" switched on (Garmin, Polar,
  Coros, Amazfit, Huawei and others). Works in the Android app and in Chrome or
  Edge on the web. Apple Watch and Fitbit do not broadcast heart rate.
- **Steps, calories, distance, heart rate, weight for the day:** "Read from my
  watch" on the Training screen reads Health Connect (Android app only). Wear
  OS, Galaxy Watch, Fitbit, Garmin, Xiaomi and others write their data there
  from their own apps. Android 14 has Health Connect built in; older versions
  install it from Google Play.

## Cloud backup and accounts

The app is already pointed at its own Firebase project, **disciplined-3e309**
(`src/firebase.js`; a web config is an identifier, not a secret). To switch the
cloud on, in the Firebase console of that project:

1. **Authentication** > Sign-in method: turn on Email/Password and Google.
2. **Realtime Database** > Create database. If its URL is not
   `https://disciplined-3e309-default-rtdb.europe-west1.firebasedatabase.app` (another region),
   set the repository variable `VITE_FIREBASE_DATABASE_URL` to the real one.
3. Authentication > Settings > Authorized domains: add `gussaay.github.io` if
   the web app is served from GitHub Pages.
4. Publish the rules in `database.rules.json` (the deploy below does it).

Until step 2 is done the app keeps working on the device and sign-in is the only
thing that fails.

### Repository secrets

Settings > Secrets and variables > Actions > New repository secret. GitHub never
shows secret values again and nothing outside your own browser can add them.

| Secret | What it is |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_DISCIPLINED` (or `FIREBASE_SERVICE_ACCOUNT`) | The whole JSON of a service-account key for disciplined-3e309 (Firebase console > Project settings > Service accounts > Generate new private key; paste the file's contents). Each push to `main` then deploys Hosting and the database rules. |
| `KEYSTORE_BASE64` | Your Android signing key, base64 (below). |
| `KEYSTORE_PASSWORD` | The keystore password. |
| `KEY_PASSWORD` | The key password (omit if it equals the keystore password). |
| `KEY_ALIAS` | The key alias (omit if the keystore holds one key; it is found automatically). |
| `GEMINI_API_KEY`, `GROQ_API_KEY` | Optional. Deploys the AI Cloud Function with these keys, so signed-in users get AI with no key of their own (Blaze plan). |

Signing key, once, on your computer:

```bash
keytool -genkeypair -v -keystore the-disciplined.keystore -alias disciplined \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 the-disciplined.keystore      # paste this as KEYSTORE_BASE64
```

Keep a copy of the keystore and its passwords somewhere safe: if they are lost,
phones that installed the app can only update after uninstalling it.

Without any of this, Settings > "Save a backup" writes everything to one file
that "Restore" reads on another phone.

## Reminders

In the Android app, Settings > Reminders schedules prayer-time notifications for
today and tomorrow (refreshed each time the app opens), an evening nudge when
someone is due a call, and an English reminder. They are scheduled on the
phone, so they arrive with no connection.

## Sources

- Prayer times and Qibla: the [adhan](https://github.com/batoulapps/adhan-js) library (MIT).
- Quran: Uthmani text from the Noble Qur'an Encyclopedia (quranenc.com) and the
  Saheeh International translation via tanzil.net, as packaged by
  [quran-json](https://github.com/risan/quran-json) (CC BY-SA 4.0).
- Azkar: Hisn al-Muslim, from [rn0x/Adhkar-json](https://github.com/rn0x/Adhkar-json).
- Food values: rounded from standard food composition tables; estimates for
  daily tracking, not medical advice. Targets use the Mifflin-St Jeor equation.
