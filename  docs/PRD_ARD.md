Нижче наведено повну документацію проєкту **Be HERE**: **PRD** (Product Requirements Document — документ продуктових вимог) та **ARD** (Architecture Requirements Document — документ архітектурних вимог) під обраний стек: **Angular + Supabase + Cloudflare R2 + Mapbox + Gemini 2.5 Flash + ElevenLabs**.

Повні, фіналізовані версії **PRD** (Product Requirements Document) та **ARD** (Architecture Requirements Document) для платформи **Be HERE**, з урахуванням усіх узгоджених вимог та змін у логіці ШІ-аудіоісторій (FR-6).

## ЧАСТИНА 1: PRD (Product Requirements Document)

### 1. Бачення та мета продукту (Product Vision)

**Be HERE** — це гіперлокальна вебплатформа (з повною адаптацією під мобільні пристрої та PWA) для збереження колективної пам'яті, повсякденних історій та атмосфери конкретних міст і районів. Проєкт поєднує інтерактивний архів та затишну спільноту, де користувачі спільними зусиллями формують «острівець спогадів» кожного району через фотографії, короткі відео та листи-капсули часу, які через 10–20 років стають унікальним історичним документом змін побуту, культури та міського середовища.

### 2. Цільова аудиторія та Ролі користувачів (User Personas & Roles)

Цільовим користувачем платформи є будь-яка людина, яка любить фотографувати і фільмувати все навколо, залишати спогади для себе у майбутнє та ділитися враженнями з іншими.

| Дія / Функціонал | Гість (Неавторизований) | Зареєстрований користувач |
| --- | --- | --- |
| Перегляд колажу (Canvas) та мапи районів | Доступно

 | Доступно

 |
| Отримання випадкового побажання (`Wish for me`) | Доступно

 | Доступно

 |
| Прослуховування вже кешованих ШІ-аудіоісторій | Доступно

 | Доступно

 |
| Запуск генерації нової ШІ-аудіоісторії (якщо кеш застарів) | Пропонує зареєструватися

 | Доступно

 |
| Додавання побажання (`Add Wish`) | Пропонує зареєструватися

 | Доступно

 |
| Додавання Фото, Відео, Листа | Пропонує зареєструватися

 | Доступно

 |
| Коментування контенту та Особистий кабінет | Пропонує зареєструватися

 | Доступно

 |

### 3. Детальні функціональні вимоги (Functional Requirements)

#### FR-1: Верхня панель (Header) та Динамічні лічильники

* **Навігація:** Верхня панель містить логотип (`Logo`), назву платформи `Be HERE`, інформаційну кнопку `About` та кнопку `SignIn` (яка після авторизації відкриває доступ до Особистого кабінету).


* **Лічильник користувачів (Іконка долоні):** Відображає число, що відповідає загальній кількості зареєстрованих у застосунку користувачів.


* **Лічильник закритих капсул часу (Іконка навісного замка):** Відображає кількість написаних листів, дата відкриття яких ще не настала. Число динамічно змінюється відповідно до обраного міста, району або точки на мапі (якщо локацію не обрано — показує загальну кількість по всій платформі).



#### FR-2: Модуль обміну побажаннями (Wishes)

* **Відсутність геоприв'язки:** Побажання створюють атмосферу затишку і не прив'язані до жодної локації.


* **Отримання побажання (`Wish for me` / `Wish here`):** При натисканні кнопки знизу з'являється випадкове побажання з тих, що написали раніше інші користувачі, і залишається на екрані до наступного натискання на кнопку.


* **Додавання побажання (`Add Wish`):** Для авторизованих користувачів відкриває поле вводу (до 500 символів), куди можна вписати побажання для випадкового користувача.



#### FR-3: Створення контенту (`Add Photo`, `Add Video`, `Add Letter`) та Мобільна зйомка

* **Обов'язкові поля та геоприв'язка:** При додаванні будь-якого елемента користувач вказує назву (заголовок) та прив'язує спогад до місця **виключно шляхом вибору зі списків `Country / City / District**`. Дата створення та нікнейм автора зберігаються автоматично.


* **Додавання фото (`Add Photo`):** Максимальний розмір файлу — **5 МБ**. На смартфонах реалізовано Варіант А (`capture="environment"`), що дозволяє зробити фото безпосередньо камерою телефона з інтерфейсу або обрати з галереї.


* **Додавання відео (`Add Video`):** Максимальна тривалість — **1 хвилина (60 секунд)**. На смартфонах підтримується прямий запис відео через рідну камеру смартфона (Варіант А) або вибір готового файлу.


* **Додавання листа — Капсули часу (`Add Letter`):**
* Максимальний обсяг тексту — **500 символів**.


* Користувач обов'язково встановлює **дату відкриття листа** у майбутньому.


* Користувач обирає опцію приватності: **Публічний лист** (стає видимим для всіх на Canvas після настання дати відкриття) або **Особистий лист («для себе»)** (стає видимим після дати відкриття виключно автору в його окремому Особистому кабінеті).





#### FR-4: Географічна фільтрація та Інтерактивна мапа

* **Списки `Country / City / District`:** Працюють на базі даних із `[https://overpass-api.de](https://overpass-api.de)`. При введенні перших літер випадаючий список автоматично звужується (автодоповнення).


* **Інтерактивна мапа (внизу сторінки):** Відображає точки (піни), для яких є доданий контент. Один пін на мапі відповідає цілому району (`District`).


* **Синхронізація:** Вибір локації у списках `Country / City / District` або клік на пін району на мапі оновлює набір карток на Canvas контентом із цієї локації та перераховує лічильник на іконці замка.



#### FR-5: Центральне полотно (Canvas — Стилізована сітка/колаж)

* **Початковий стан (без обраної локації):** Якщо користувач ще не вказав певну локацію, на Canvas відображаються **25 останніх доданих** фото, відео та вже відкритих публічних листів незалежно від їхньої локації.


* **Правила розташування:** Це стилізована сітка/колаж, де одночасно розміщується до **25 карток**. Картки розташовані рівномірно по всьому полю у випадкових фіксованих позиціях без можливості перетягування мишею і частково накладаються одна на одну **максимум на чверть (до 25% площі)**.


* **Поведінка при взаємодії:**
* *Наведення курсору (Hover на ПК / Перший тап на смартфоні):* Елемент плавно збільшується і виходить на передній план.
* *Клік (Розгортання):* Елемент відкривається на всю сітку-колаж (Canvas) і фіксується, відображаючи повний медіафайл або текст листа, а також метадані: назву, локацію (`Country, City, District`), дату, нікнейм автора та блок коментарів із можливістю залишити коментар.





#### FR-6: ШІ-аудіоісторії (AI Audio Stories)

* **Розташування:** Кнопка відтворення аудіо розташована безпосередньо під блоком Canvas.
* **Логіка формування (Історична достовірність):** ШІ генерує зв'язну атмосферну аудіоісторію на основі контенту (фотографій, відео та відкритих публічних листів), розміщеного в даний момент на Canvas або у вибраній на мапі локації, **виключно на основі пов'язаних із контентом реальних історичних даних, якими володіє АІ** (без вигаданих фактів чи художніх домислів).


* **Кешування та оновлення:** Аудіоопис, згенерований для певної локації, зберігається у базі даних/сховищі доти, доки не зміниться склад контенту по цій локації (додано нове фото/відео, видалено елемент або настала дата відкриття публічного листа). При зміні складу контенту аудіоопис перегенеровується при першому виклику авторизованим користувачем і зберігається в базі даних (гостям до моменту перегенерації пропонується зареєструватися або слухати наявні кешовані історії).



#### FR-7: Особистий кабінет користувача

* Перегляд своїх **відкритих особистих листів («для себе»)**, які не бачить ніхто, окрім автора.


* Перегляд списку своїх **ще закритих листів** із таймером зворотного відліку до дати відкриття.


* Перегляд усіх своїх завантажених фото та відео з можливістю **видалити власний контент**.


* Можливість **змінити нікнейм** користувача.



## ЧАСТИНА 2: ARD (Architecture Requirements Document)

### 1. Технологічний стек (Tech Stack Overview)

| Рівень архітектури | Технологія / Провайдер | Роль у системі Be HERE |
| --- | --- | --- |
| **Frontend Framework** | **Angular 19 (Standalone, Signals, RxJS)** + Tailwind CSS + `@angular/pwa` | Клієнтський застосунок, реактивні форми з валідацією лімітів, автодоповнення локацій через RxJS, мобільна зйомка. |
| **Database & Auth** | **Supabase (PostgreSQL + Auth + RLS)** | Авторизація, зберігання профілів, метаданих, листів, коментарів, побажань та політик доступу (Row Level Security).

 |
| **Serverless Backend** | **Supabase Edge Functions (Deno / TypeScript)** | Захищений виклик Gemini + ElevenLabs, видача Presigned URLs для Cloudflare R2, проксі-кешування для Overpass API.

 |
| **Media Object Storage** | **Cloudflare R2 (S3-compatible)** | Зберігання фото (до 5 МБ), відео (до 1 хв) та MP3-файлів аудіоісторій (10 ГБ безкоштовно та $0 за вихідний трафік).

 |
| **Map & Geo Directory** | **Mapbox GL JS** + **Overpass API (`overpass-api.de`)** | Інтерактивна мапа з пінами районів внизу сторінки та пошук `Country / City / District`.

 |
| **AI & TTS Providers** | **Google Gemini 2.5 Flash API** + **ElevenLabs API** | Розпізнавання об'єктів на фото/відео/листах та історичний синтез (Gemini) + реалістичне озвучення тексту (ElevenLabs).

 |

### 2. Потоки даних та системні інтеграції (System Data Flows)

#### Потік 1: Мобільна зйомка та пряме завантаження медіа у Cloudflare R2

1. На смартфоні або ПК користувач натискає `Add Photo` (`<input type="file" accept="image/*" capture="environment">`) або `Add Video` (`<input type="file" accept="video/*" capture="environment">`).


2. Клієнтський сервіс Angular перевіряє ліміти до відправки:
* Для фото: перевіряє `file.size <= 5 * 1024 * 1024` (5 МБ) та за потреби оптимізує зображення через HTML5 Canvas у формат `WebP`.


* Для відео: завантажує локальний `ObjectURL` у прихований елемент `<video preload="metadata">` і перевіряє `video.duration <= 60` секунд.




3. Angular викликає Supabase Edge Function `get-r2-upload-url`, яка перевіряє авторизацію користувача і генерує одноразовий підписаний URL (**S3 Presigned PUT URL**) для бакета Cloudflare R2.
4. Браузер напряму завантажує файл у Cloudflare R2 і зберігає запис у таблицю `memories` в Supabase.



#### Потік 2: Автодоповнення `Country / City / District` через Overpass API

1. Користувач вводить перші літери у поле `Country`, `City` або `District`.


2. Сервіс Angular `GeoOverpassService` обробляє потік вводу через RxJS: `debounceTime(350)`, `distinctUntilChanged()`, `switchMap()`.
3. Запит спочатку перевіряє кеш-таблицю `locations` у Supabase за префіксом (`ILIKE 'prefix%'`). Якщо локації ще немає в кеші, викликається Edge Function `fetch-overpass-locations`, яка звертається до `[https://overpass-api.de/api/interpreter](https://overpass-api.de/api/interpreter)`, витягує адміністративні одиниці разом із координатами центру (`lat`, `lng`), кешує їх у `locations` і повертає у випадаючий список.



#### Потік 3: Генерація історичної ШІ-аудіоісторії (Gemini 2.5 Flash + ElevenLabs)

1. Для поточного набору видимих елементів на Canvas (або обраного району `location_id`) обчислюється `content_hash` — SHA-256 хеш від відсортованого масиву `id` усіх видимих фото, відео та відкритих публічних листів.


2. Якщо у таблиці `audio_stories` вже є запис для цього `location_id` із таким самим `content_hash`, аудіоплеєр під Canvas миттєво відтворює готовий `.mp3` з Cloudflare R2 (доступно і гостям, і зареєстрованим користувачам).


3. Якщо склад контенту змінився (`content_hash` не збігається) і кнопку натиснув **авторизований користувач**, викликається Edge Function `generate-audio-story`:


* Функція збирає URL медіафайлів, заголовки, тексти відкритих листів та точні геодані району (`Country`, `City`, `District`, `lat`, `lng`).


* Викликається **Gemini 2.5 Flash API** з параметром `temperature: 0.2` (мінімізація фантазування) та суворим системним промптом:
> *"Ти — фаховий історик та дослідник міст. Проаналізуй надані користувачами фотографії, відео та листи з локації {Country, City, District}. Розпізнай зображені чи згадані вулиці, будівлі, парки, пам'ятки або тип архітектурного середовища. Склади зв'язну атмосферну розповідь для аудіогіда (до 900 символів), спираючись ВИКЛЮЧНО на реальні історичні дані, задокументовані факти та справжній історичний контекст цього району й об'єктів, якими ти володієш. Категорично заборонено вигадувати неіснуючі події, легенди, дати чи біографії."*


* Отриманий історичний текст передається в **ElevenLabs API** (`eleven_multilingual_v2`), отриманий аудіопотік зберігається у Cloudflare R2, а посилання та новий `content_hash` записуються у таблицю `audio_stories` в Supabase.





### 3. Схема бази даних та безпека (Supabase PostgreSQL & RLS)

```sql
-- 1. Профілі користувачів
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Довідник та кеш локацій з overpass-api.de (1 запис = 1 District = 1 пін на мапі)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id BIGINT UNIQUE,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_locations_hierarchy ON public.locations (country, city, district);

-- 3. Основна таблиця контенту (Фото, Відео, Листи)
CREATE TYPE memory_type AS ENUM ('photo', 'video', 'letter');

CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  type memory_type NOT NULL,
  title TEXT NOT NULL,
  media_url TEXT, -- Публічний URL у Cloudflare R2 (для photo та video)
  letter_text VARCHAR(500), -- Текст листа (до 500 символів)
  is_private BOOLEAN DEFAULT false NOT NULL, -- true = особистий лист ("для себе")
  unlock_date TIMESTAMPTZ DEFAULT now() NOT NULL, -- Дата відкриття капсули часу
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_letter_len CHECK (char_length(letter_text) <= 500)
);

-- 4. Коментарі до відкритого контенту
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Побажання (Wishes — без геоприв'язки)
CREATE TABLE public.wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Кеш ШІ-аудіоісторій
CREATE TABLE public.audio_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE, -- NULL для глобального стану
  content_hash TEXT NOT NULL,
  audio_url TEXT NOT NULL, -- URL .mp3 файлу в Cloudflare R2
  transcript TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

```

#### Політики безпеки Row Level Security (RLS) та RPC-функції

```sql
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Публічний контент на Canvas (видимий усім лише якщо is_private = false і настала дата unlock_date)
CREATE POLICY "Public unlocked memories are visible to everyone"
ON public.memories FOR SELECT
USING (is_private = false AND unlock_date <= now());

-- Особисті відкриті листи в Особистому кабінеті (видимі виключно автору після unlock_date)
CREATE POLICY "Users can read own unlocked private letters"
ON public.memories FOR SELECT
USING (auth.uid() = user_id AND unlock_date <= now());

-- Додавання та видалення власного контенту
CREATE POLICY "Authenticated users can insert own memories"
ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
ON public.memories FOR DELETE USING (auth.uid() = user_id);

-- Безпечний підрахунок закритих листів для Іконки Замка (без розкриття вмісту листів)
CREATE OR REPLACE FUNCTION public.get_locked_letters_count(loc_id UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER AS $$
  SELECT count(*)::integer FROM public.memories
  WHERE type = 'letter'
    AND unlock_date > now()
    AND (loc_id IS NULL OR location_id = loc_id);
$$;

-- Безпечний перегляд метаданих своїх ще закритих листів (для таймера в Особистому кабінеті без поля letter_text)
CREATE OR REPLACE FUNCTION public.get_my_locked_letters()
RETURNS TABLE (id UUID, title TEXT, location_id UUID, is_private BOOLEAN, unlock_date TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, title, location_id, is_private, unlock_date, created_at
  FROM public.memories
  WHERE user_id = auth.uid() AND type = 'letter' AND unlock_date > now()
  ORDER BY unlock_date ASC;
$$;

```

### 4. Архітектура фронтенду на Angular 19

```text
src/app/
├── core/
│   ├── models/
│   │   └── memory.model.ts            # Інтерфейси MemoryItem, LocationPin, AudioStory, Wish
│   ├── services/
│   │   ├── supabase.service.ts        # Клієнт Supabase та виклики RPC/Edge Functions
│   │   ├── auth.service.ts            # Сигнал currentUser(), перевірка ролі Гостя, зміна нікнейму
│   │   ├── r2-upload.service.ts       # Валідація 5МБ фото / 60с відео та прямий PUT у Cloudflare R2
│   │   ├── overpass-geo.service.ts    # RxJS-автодоповнення Country/City/District
│   │   ├── board-state.service.ts     # Сигнали: selectedLocation(), canvasCards(), lockedLettersCount()
│   │   └── ai-audio.service.ts        # Обчислення content_hash, керування плеєром та генерацією
│   └── guards/
│       └── guest-prompt.guard.ts      # Перехоплення захищених дій Гостя з відкриттям модалки реєстрації
├── features/
│   ├── main-board/
│   │   ├── top-header/                # Logo, Be HERE, About, SignIn + лічильники Замка і Долоні
│   │   ├── wishes-panel/              # Кнопки "Wish for me" та "Add Wish"
│   │   ├── controls-filter-bar/       # Add Photo/Video/Letter (з capture="environment") + селектори локацій
│   │   ├── collage-canvas/            # Сітка 5x5 зі зміщенням (до 25 карток, <25% перекриття) + Expanded Modal
│   │   ├── audio-story-bar/           # Кнопка та плеєр історичної ШІ-аудіоісторії під Canvas
│   │   └── mapbox-view/               # Інтеграція Mapbox GL JS поза NgZone з пінами районів
│   └── user-cabinet/                  # Особистий кабінет (відкриті листи собі, таймери закритих, мої фото/відео)

```

#### Реалізація ключових технічних вимог в Angular

* **Розкладка до 25 карток з перекриттям не більше 25% (`CollageCanvasComponent`):** Полотно ділиться на віртуальну сітку $5 \times 5$ (25 слотів). Кожна картка прив'язується до свого слота $(r, c)$ і отримує детерміноване зміщення ($\Delta x, \Delta y \in [-12\%, +12\%]$ від ширини/висоти слота) на основі хешу свого `id`. Це гарантує рівномірний розподіл по полю без ручного перетягування та геометрично обмежує накладання сусідніх карток до 20–25%.


* **Оптимізація Mapbox GL JS (`MapboxViewComponent`):** Карта ініціалізується через `this.ngZone.runOutsideAngular()`, щоб масштабування та рух мапи не викликали зайвих циклів перевірки змін в Angular. Повернення в зону (`this.ngZone.run()`) відбувається виключно при кліку на пін району (`District`), оновлюючи сигнал `selectedLocation()`.



Документація повністю узгоджена і готова до розробки. Бажаєш розпочати з написання коду для **Supabase (SQL-міграція + Edge Functions для Cloudflare R2 та Gemini/ElevenLabs)** чи зі створення **каркасу Angular-застосунку та компонентів інтерфейсу**?