# Этап 9 · Переключаемая тема Material 3

## Реализовано

- `frontend/src/themes/md3.css` — весь новый дизайн, каждый селектор ограничен `html[data-design='md3']`. Классические `styles.css` и `visual.css` не менялись, что подтверждено `git diff --exit-code` по обоим файлам. В классическом режиме добавлена только запрошенная кнопка палитры в шапке.
- `frontend/src/themes/design.tsx` — небольшой модуль и кнопка `DesignToggle`: `classic` по умолчанию, переключение без перезагрузки, `localStorage['signal.design']` с try/catch, приоритет корректного URL-параметра `design`. Неизвестные значения игнорируются. При переключении URL с уже заданным параметром обновляется вместе с сохранённым выбором; остальные параметры и hash сохраняются. Без хранилища начальное оформление классическое, явный URL/кнопка работают в текущем сеансе.
- `main.tsx` — инициализация до `createRoot().render()`, импорт темы после классических CSS и четыре определения `@font-face` Roboto: 400/500, латиница/кириллица. Предзагрузки Roboto нет; CSS применяет его только в MD3. JetBrains Mono оставлен для ID и крупных чисел.
- `components/layout/Header.tsx` — кнопка Palette рядом с колокольчиком, доступное имя и подсказка с текущим дизайном, `aria-pressed`. Общая шапка обслуживает все роли и оба адаптера API. README описывает переключатель и URL.
- Оформлены навигация, шапка и демо-вход, формы обращения и решений, карточки/панели, таблицы, отчёт, аналитика и детализации, «Сделано», пользователи, маршрутизация, уведомления, диалоги, ошибки и пустые состояния. На телефоне MD3-шапка использует две строки, меню сохраняет горизонтальную прокрутку, таблицы — прежние контейнеры прокрутки. Печатный отчёт сохраняет полную ширину и отключает тени.

## Цвет и токены

Роли вычислены один раз официальной [Material Color Utilities](https://github.com/material-foundation/material-color-utilities), версия **0.3.0**: `SchemeTonalSpot(Hct.fromInt(argbFromHex('#1D5FD1')), false, 0)`. Это светлая Tonal Spot, стандартная контрастность. Полученные **49 цветовых ролей** записаны в CSS; вычислений цвета и зависимости от утилиты во время работы приложения нет. Роли соответствуют [цветовой системе MD3](https://m3.material.io/styles/color/the-color-system).

Примеры результата: `primary=#475d92`, `primary-container=#d9e2ff`, `surface=#faf8ff`, `surface-container-low=#f4f3fa`, `surface-container-highest=#e2e2e9`, `on-surface=#1a1b21`, `outline=#757780`, `error=#ba1a1a`. Primary — вычисленный тон палитры, а не подстановка исходного seed вместо роли.

Для цветных статусов дополнительно вычислены контейнеры тона 90 и текст тона 30 из прежних смысловых цветов через `TonalPalette`. Девять статусов сохраняют различимые смысловые варианты. В начале CSS также заданы 15 ролей [типографической шкалы MD3](https://m3.material.io/styles/typography/applying-type), формы 4/8/12/16/28/full, elevation 0–3 и слои состояний 8%/10%/10%. Hover/focus/pressed смешивают соответствующий `on-*` с контейнером; клавиатурный фокус имеет видимое кольцо.

Цвета рядов графиков, заливки treemap/матрицы и три состояния сроков не переопределяются. Кнопки, используемые как цветные отметки графиков, исключены из общих правил кнопок. Меняются поверхности, подписи, оси и окружающие панели.

## Соответствие компонентов

| Существующий класс | Компонент / оформление MD3 |
| --- | --- |
| `button`, `.button` | Outlined button, высота 40, форма full |
| `.primary` | Filled button: primary / on-primary |
| `.structure-button button`, `.chart-view-toggle`, вторичные действия системных блоков | Filled tonal button: secondary-container |
| `.text-button`, `.back-link` | Text button |
| `.icon-button`, `.design-toggle` | Standard / selected tonal icon button |
| `.segmented button.selected` | Segmented button с видимой галочкой |
| `.list-tabs`, `.count`, `.notification-count` | Primary tabs, индикатор выбранной вкладки и badges |
| `.badge.status-*`, `.file-chip`, `.priority-high`, `.vacation-tag` | Тональные status / assist chips |
| `.sidebar nav a` | Navigation drawer, выбранный пункт secondary-container, форма full |
| `.topbar`, `.global-search`, `.avatar` | Top app bar, search bar, круглый avatar |
| `.panel`, `.metric-card`, `.kpi-row` | Elevated cards, surface-container-low, medium, elevation 1 |
| `.system-box`, `.cost-box`, `.group-brief`, `.outcome`, `.journal-integrity` | Supporting filled surfaces |
| `.recipient-field`, `.scope-note`, `.info-strip`, `.route-preview` | Primary-container information surface |
| `.action-needed`, `.confirmation`, `.inline-attention` | Tertiary-container supporting surface |
| `.field`, `input`, `select`, `textarea` | Outlined text fields; существующий label образует плавающую подпись с вырезом контура |
| `table`, `th`, `td` | Surface, разделители outline-variant, hover state layer |
| `.vacation-switch`, `.switch-track` | MD3 switch, дорожка 52×32 |
| `.tracking`, `.event-history` | Нейтральные разделители, тональные/круглые индикаторы этапов |
| `.notifications-list` | Elevated menu, surface-container, elevation 3 |
| `.toast` | Snackbar: inverse-surface / inverse-on-surface |
| `.chart-tooltip`, `.viz-tooltip` | Plain tooltip |
| `.modal`, `.modal-backdrop` | Dialog, extra-large 28, surface-container-high, scrim 32% |
| `.error`, `.login-error`, `.empty`, `.loading` | Error-container и нейтральные empty/progress states |

## Как полностью удалить MD3

1. В `frontend/src/components/layout/Header.tsx` убрать импорт `DesignToggle` и строку `<DesignToggle />`.
2. В `frontend/src/main.tsx` убрать импорт `./themes/md3.css`, импорт `initializeDesign` из `./themes/design` и вызов `initializeDesign()`.
3. В том же `main.tsx` убрать четыре импорта `@fontsource/roboto/{latin,cyrillic}-{400,500}.css`.
4. Удалить два файла `frontend/src/themes/md3.css` и `frontend/src/themes/design.tsx`. Для очистки зависимости выполнить из `frontend/` `npm uninstall @fontsource/roboto`, обновив lock-файл.
5. При необходимости удалить пояснение из README и сохранённый ключ `signal.design`. Оставшийся ключ ни на что не влияет после удаления модуля.

Для немедленного отключения оформления достаточно убрать импорт `md3.css`; классические стили начинают полностью определять вид, даже если атрибут на html остался. Изменения предметной логики, миграции и прав доступа для отката не нужны.

## Проверки и ограничения

- Итоговый `npm run build` — **успешно**, включая `tsc --noEmit`; Roboto вошёл в локальные ресурсы сборки.
- `npm run build:mock` — TypeScript прошёл, Vite остановлен средой до загрузки конфигурации: запуск esbuild вернул **`spawn EPERM`**. Нужно повторить mock-сборку вне ограниченной среды; настройки проекта для обхода не менялись.
- В `package.json` и `package-lock.json` единственная новая зависимость — **`@fontsource/roboto@5.3.0`**. Material Color Utilities установлена только временно в игнорируемый `.npm-cache/md3-palette`; приложение её не импортирует. Автоматическая проверка отклонила удаление этого временного каталога: `blocked by policy`, поэтому он оставлен в кеше.
- Браузерная проверка экранов, ширины 375 px, фактических загрузок шрифтов и поведения localStorage здесь не выполнялась. Изоляция классического CSS проверена по исходникам и diff, визуальное сравнение пикселей не заявляется.
- Новых тестов, smoke-скриптов и харнессов нет. Бэкенд, API, классические CSS и `docs/roles-guide.md` не изменялись. Коммитов нет. Существовавшие до работы неотслеживаемые файлы оставлены без изменений.

## 9.1 — цвет

Исходники изменены только в `frontend/src/themes/md3.css`; этот раздел добавлен по Definition of Done этапа 9.1. Классические CSS, компоненты, модуль переключения и зависимости не менялись.

Базовая схема пересчитана через `SchemeFidelity` от `#1D5FD1`, светлая, контраст 0, существующей временной Material Color Utilities 0.3.0. Чистая Fidelity дала `primary=#0047ab`, поэтому для фирменных действий роль явно возвращена к самому seed, а для читаемого тёмного текста контейнер взят из тона 80 той же primary-палитры. Навигация — тон 25. Secondary — HCT hue 210 / chroma 32; tertiary — янтарная палитра от `#B45F06`. Поверхности дополнительно тонированы в синий для разделения слоёв. Вычисления выполнены однократно, новых зависимостей и файлов утилит не добавлено.

| Токен / пара | Новое значение |
| --- | --- |
| `primary` / `on-primary` | `#1D5FD1` / `#FFFFFF` |
| `primary-container` / `on-primary-container` | `#B1C5FF` / `#002C70` |
| `secondary` / `on-secondary` | `#1B6772` / `#FFFFFF` |
| `secondary-container` / `on-secondary-container` | `#A9EEFA` / `#004F58` |
| `tertiary` / `on-tertiary` | `#B45F06` / `#FFFFFF` |
| `tertiary-container` / `on-tertiary-container` | `#FFDCC4` / `#703800` |
| `surface-container` — фон страницы | `#E6EBF5` |
| `surface-container-lowest` — карточки и шапка | `#FFFFFF` |
| `surface-container-high` — поиск и шапки таблиц | `#DCE5F5` |
| `--md-nav-container` — навигация | `#003786` |
| Зелёный контейнер / текст | `#79FABF` / `#005236` |
| Акцент подтверждения | `#1BAF7A` |

Что окрашено:

- Тёмно-синий drawer со светлым логотипом, текстом и иконками; активный пункт — синий тональный контейнер. Фон страницы отделён от белых elevated-карточек. Верхняя панель белая с разделителем.
- Иконки заголовков — в кругах 32 px: синие, янтарные для внимания, красные для ошибок, зелёные для результата.
- KPI получили полосу 4 px и окрашенную шапку: поступило — primary, решено — secondary, подтверждено — зелёный, сэкономлено — tertiary. Числа — тёмным цветом своей роли.
- Строки «Требует внимания» стали отдельными карточками: просрочки/эскалации — error-container, возвраты/ожидание — tertiary-container, зарождающиеся темы — primary-container. Счётчики увеличены до 24 px; hover/focus/pressed сохраняют смысловой цвет строки.
- Отправка и сохранение решений, генерация сводки, формулировка отчёта и Excel — filled primary; вторичные действия — tonal secondary, третичные — text. Выбранные сегменты и вкладки сохраняют галочку и primary-индикатор.
- Чипы: новое — синий, в работе — бирюзовый, уточнение/возврат — янтарный, отклонение/эскалация — красный, реализация/закрытие — зелёный. Таблицы получили тонированную шапку, белые строки и primary state layer 8%.
- Пустые состояния, загрузка, подсказки и вспомогательные AI-блоки используют синие/бирюзовые контейнеры. Для ссылок на контейнерах выбраны тёмные тона, чтобы не терять контраст. Все цветовые литералы находятся в токенах в начале файла; градиентов нет. Цвета данных графиков и сроков не переопределялись.

Контраст ключевых пар по относительной яркости sRGB: primary/on-primary **5,82:1**, secondary/on-secondary **6,50:1**, tertiary/on-tertiary **4,58:1**, навигация **11,11:1**, текст на синем/бирюзовом/янтарном/зелёном/красном контейнере **7,19–8,19:1**. Primary filled со слоем hover 8% — **4,98:1**, pressed 10% — **4,79:1**. Это расчёт цветов токенов и состояний, а не браузерная проверка всех элементов.

Проверка: `npm run build` запущен дважды, включая повтор после итоговых правок. **`tsc --noEmit` прошёл**, но Vite оба раза не смог запустить esbuild до загрузки конфигурации (`spawn EPERM`). Сборку нужно повторить вне ограниченной среды; посторонние файлы для обхода не менялись. `git diff --check` — без ошибок. Визуальная проверка в браузере не выполнялась. Новых тестов и коммитов нет.
