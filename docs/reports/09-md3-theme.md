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
