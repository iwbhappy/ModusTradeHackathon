Три помощника реализованы. [Отчёт](docs/reports/08-ai-assist.md) добавлен.

- `uv run pytest`: **21 passed**, ровно 2 новых теста без сети.
- `npm run build`: успешно.
- `build:mock`: TypeScript прошёл, Vite заблокирован ошибкой esbuild `spawn EPERM`.
- Gemini: **3 вызова, 2056 токенов**; повторы взяты из кеша.

Браузерная проверка не выполнялась. `docs/roles-guide.md` не изменял, коммитов нет.