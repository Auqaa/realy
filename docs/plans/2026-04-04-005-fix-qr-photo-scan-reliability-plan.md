---
date: 2026-04-04
topic: qr-photo-scan-reliability
status: active
depth: standard
origin: docs/brainstorms/2026-04-04-qr-photo-scan-reliability-requirements.md
supersedes:
  - docs/plans/2026-04-02-003-fix-qr-scan-experience-plan.md
---

# QR Photo Scan Reliability Implementation Plan

## 1. Problem Frame

Нужно починить mobile photo-based QR scan в актуальном React-клиенте так, чтобы сценарий `Открыть камеру телефона -> сделать фото / Use Photo` стабильно работал на iPhone и Android без смены базового UX (see origin: `docs/brainstorms/2026-04-04-qr-photo-scan-reliability-requirements.md`).

Текущее поведение:

- основной runtime живёт в `frontend/`, а не в legacy `site/`;
- live camera path идёт через `react-qr-reader` в `frontend/src/components/QRScanner.jsx`;
- photo path идёт через `BrowserQRCodeReader.decodeFromImageUrl(objectUrl)` в `frontend/src/components/QRScanner.jsx`;
- ручной ввод того же QR проходит, а `/api/scan` уже принимает и нормализует payload в `backend/routes/scan.js`.

Это означает, что основной риск лежит в client-side decoding фото, а не в server-side scan contract.

## 2. Scope Boundaries

В рамках этой версии:

- сохраняется текущая одна кнопка mobile photo flow (`R1`, `R2`);
- меняется только актуальный React-клиент в `frontend/` и, при необходимости, минимально тестовая/диагностическая поверхность backend;
- ручной ввод остаётся fallback, но не становится основным рекомендованным путём (`R8`);
- не возвращается legacy `site/` как место развития QR-flow;
- не переносим QR decoding на backend как основную OCR/vision-пайплайн (`R5`, scope boundary from origin);
- не перепроектируем весь QR UX в wizard или несколько primary CTA.

## 3. Requirements Traceability

| Requirement | Плановое решение |
| --- | --- |
| `R1`, `R2` | Сохраняем текущую кнопку photo-flow и существующий layout `QRScanner`, меняем только внутренний decode pipeline |
| `R3`, `R4` | Вводим более надёжный photo decode path c client-side preprocessing и/или заменой image decode adapter |
| `R5` | Явно учитываем EXIF orientation, large images, browser capture formats и мобильный capture flow |
| `R6` | Разделяем decode failure на понятные пользовательские сообщения вместо одного общего “не удалось распознать фото” |
| `R7` | Повторная попытка остаётся на том же экране без потери состояния формы и scanner context |
| `R8` | Manual input не удаляется, но copy и логика не подталкивают пользователя к нему раньше времени |

## 4. Current Context and Research

### 4.1 Repo patterns

- `frontend/src/components/QRScanner.jsx` — единственный актуальный QR UI и точка интеграции live camera + photo upload.
- `frontend/src/pages/Home.jsx` — встраивает `QRScanner` и после успеха перезагружает points/routes.
- `frontend/src/utils/offlineStorage.js` — текущий offline queue для scan replay.
- `backend/routes/scan.js` — уже умеет canonical QR matching, duplicate-safe replay и richer response contract.
- `backend/tests/scanRoutes.test.js` — покрывает backend-side QR matching, но не photo-decoding поведение.
- Отдельного теста на `QRScanner` сейчас нет.

### 4.2 Planning-owned conclusions

- Старый план `docs/plans/2026-04-02-003-fix-qr-scan-experience-plan.md` больше не соответствует реальному runtime, потому что опирается на `site/`.
- Проблема локализуется в photo decode adapter, а не в auth, route packs или scan API.
- Отсутствие component-level тестов на `QRScanner` — главный пробел в verification для этого бага.

### 4.3 External-knowledge-shaped assumptions

Без углублённого внешнего ресёрча уже достаточно понятно, что mobile photo decoding часто ломается из-за комбинации:

- EXIF orientation после съёмки на iPhone;
- HEIC / browser-transcoded image handling;
- oversized image dimensions и memory pressure;
- ненадёжности прямого decode из `objectURL` без предварительной нормализации bitmap/canvas.

Для этого репо достаточно планировать fix вокруг preprocessing + isolated decoder abstraction; полноценное серверное vision-решение здесь было бы необоснованным усложнением.

## 5. Technical Decisions

### 5.1 Photo decode должен идти через app-owned preprocessing pipeline

`decodeFromImageUrl(objectUrl)` слишком хрупок для мобильных capture-файлов. Новый плановый pipeline:

1. принять `File`;
2. загрузить изображение через browser image APIs;
3. нормализовать ориентацию и raster dimensions;
4. при необходимости downscale до разумного decode size;
5. передать в QR decoder уже предсказуемый image source / pixel buffer.

Это напрямую закрывает `R3`–`R5`.

### 5.2 QR decode adapter должен быть изолирован от UI-компонента

Вместо того чтобы держать весь decoding knowledge внутри `QRScanner.jsx`, стоит вынести photo-specific decode helpers в отдельный модуль, например:

- `frontend/src/utils/qrPhotoDecode.js`

или близкий по смыслу helper-файл.

Это даст:

- тестируемость без рендера всего экрана;
- возможность менять decoding strategy без переписывания UI;
- ясную границу между UI state и image processing.

### 5.3 Ошибки нужно классифицировать по типу сбоя, а не только по финальному исходу

UI должен различать хотя бы:

- файл не удалось открыть / декодировать как изображение;
- QR не найден на валидном изображении;
- платформа/браузер не дал подготовить изображение к decode;
- scan submit в backend упал уже после успешного QR-read.

Это нужно для `R6` и чтобы на телефоне было понятно, когда стоит “сделать фото ближе”, а когда проблема техническая.

### 5.4 Live camera path не должен ломаться при улучшении photo path

Хотя баг в photo flow, live camera через `react-qr-reader` остаётся частью того же компонента. Изменения должны:

- не менять его current UX без необходимости;
- не вводить shared state, который блокирует live scanning после upload failure;
- сохранять существующий `switchCamera` и `handleResult` flow.

## 6. High-Level Design

```text
QRScanner
  -> live camera path (existing)
  -> mobile photo button (existing UX)
      -> read selected File
      -> normalize photo for decode
      -> decode QR from normalized image
      -> submitQrValue(decodedText)
  -> manual fallback (existing)
```

Directional module split:

```text
frontend/src/components/QRScanner.jsx
  owns UI state, permissions copy, retry affordances

frontend/src/utils/qrPhotoDecode.js
  owns file -> image -> normalized bitmap/canvas -> QR decode pipeline

frontend/src/components/__tests__/QRScanner.test.jsx
  verifies user-visible states and retry/failure behavior
```

Optional helper split if needed during execution:

```text
frontend/src/utils/qrImageNormalization.js
frontend/src/utils/qrPhotoDecode.js
```

Только если это реально упрощает код; отдельные abstraction layers ради самих abstraction layers не нужны.

## 7. Implementation Units

### [ ] Unit 1 — Reliable mobile photo decode pipeline in React client

Primary files:

- `frontend/src/components/QRScanner.jsx`
- `frontend/src/utils/qrPhotoDecode.js` (new, recommended)

Test files:

- `frontend/src/components/__tests__/QRScanner.test.jsx` (new)

Work:

- вынести photo decode logic из `handleCapturedImage` в app-owned helper;
- заменить прямой `decodeFromImageUrl(objectUrl)` на preprocessing-aware pipeline;
- обеспечить cleanup временных object URLs / image resources;
- сохранить текущую кнопку `Открыть камеру телефона` и existing upload flow;
- не трогать manual submit и live camera сверх необходимого для совместимости.

Test scenarios:

- валидный QR-файл после `input[type=file]` приводит к вызову submit flow с распознанным текстом;
- после успешного decode UI выходит из `processingUpload` и не остаётся заблокированным;
- ошибка decode не ломает последующую повторную попытку с новым фото;
- live camera path продолжает рендериться и не исчезает после photo attempt;
- при отмене выбора файла ничего не ломается и ошибок не показывается.

### [ ] Unit 2 — Mobile-specific image normalization and decoder fallbacks

Primary files:

- `frontend/src/utils/qrPhotoDecode.js`
- `frontend/package.json` (только если execution покажет, что нужна другая decode dependency)

Test files:

- `frontend/src/components/__tests__/QRScanner.test.jsx`
- при необходимости `frontend/src/utils/__tests__/qrPhotoDecode.test.js` (new)

Work:

- определить минимальный preprocessing pipeline для mobile captures;
- нормализовать orientation / dimensions перед decode;
- спланировать fallback strategy, если первичный decode path не нашёл QR:
  - повторный decode по уже нормализованному canvas / bitmap;
  - optional alternate decode mode, только если это оправдано;
- если текущий `@zxing/browser` path после preprocessing всё ещё недостаточно надёжен, допустить точечную замену decoder implementation без изменения UI-контракта.

Test scenarios:

- pipeline корректно обрабатывает крупный image input без зависания UI;
- decode helper возвращает доменный “QR not found” результат отдельно от “image processing failed”;
- iPhone/Android class of inputs не требует от пользователя другого UX-path;
- повторная обработка второго файла после первого сбоя работает в том же экземпляре компонента.

### [ ] Unit 3 — User-visible failure handling and retry UX

Primary files:

- `frontend/src/components/QRScanner.jsx`

Test files:

- `frontend/src/components/__tests__/QRScanner.test.jsx`

Work:

- заменить один общий `toast.error` на более точные сообщения по типу failure;
- оставить пользователя на том же экране после decode failure;
- убедиться, что `processingUpload`, `cameraError` и manual input не входят в конфликт;
- при backend submit error после успешного decode показывать сообщение уровня submit failure, а не “не удалось распознать QR”.

Test scenarios:

- unreadable photo показывает сообщение про качество/читаемость снимка;
- технический image-processing сбой показывает более нейтральную retry message;
- backend rejection после успешного decode показывает server/domain error;
- после любой ошибки пользователь может сразу выбрать новое фото без reload страницы.

### [ ] Unit 4 — Regression coverage and product verification

Primary files:

- `frontend/src/components/__tests__/QRScanner.test.jsx`
- `docs/manual-tests/qr-photo-scan-regression-checklist.md` (new)

Test files:

- `frontend/src/components/__tests__/QRScanner.test.jsx`

Work:

- покрыть основной success/failure matrix на уровне React tests;
- оформить manual checklist именно под реальные телефоны;
- зафиксировать smoke-сценарии для iPhone Safari и Android Chrome.

Manual verification scenarios:

- iPhone Safari: `Открыть камеру телефона -> сделать фото QR -> Use Photo` успешно приводит к scan success;
- Android Chrome: тот же flow успешно проходит;
- невалидное/размытое фото показывает понятную ошибку и даёт повторить попытку;
- manual code path по-прежнему работает;
- offline/online replay после успешного decode не ломается;
- live camera mode по-прежнему распознаёт QR как раньше.

## 8. Sequence

1. Сначала выделить photo decode в отдельный helper и определить минимальный preprocessing pipeline.
2. Затем встроить новый helper обратно в `QRScanner.jsx`, не меняя внешний UX.
3. После этого разделить error states и retry behavior на уровне UI.
4. В конце добавить component tests и manual mobile regression checklist.

## 9. Risks and Mitigations

### Risk: preprocessing усложнит код сильнее, чем сам баг того стоит

Mitigation:

- держать helper узким и заточенным только под photo decode;
- не выносить лишние generic image abstractions;
- сначала покрыть один основной reliable path, а не строить decode framework.

### Risk: выбранный decoder всё равно нестабилен на отдельных mobile captures

Mitigation:

- изолировать decoder behind helper boundary;
- разрешить execution-time swap decoder implementation без переписывания UI;
- сначала проверить, насколько далеко хватает preprocessing поверх текущего `@zxing/browser`.

### Risk: тесты не смогут реалистично симулировать мобильные изображения

Mitigation:

- unit/component tests использовать для state machine и branching;
- реальные iPhone/Android прогнать через manual checklist;
- не обещать полной device-fidelity только на jsdom-тестах.

### Risk: исправление photo path случайно сломает live path

Mitigation:

- не объединять live-camera и photo state сильнее, чем сейчас;
- добавить явные regression tests на наличие live scanner после photo attempts;
- держать `handleResult` и upload pipeline независимыми.

## 10. Verification Matrix

- React component tests проходят для success, decode failure, backend failure и retry behavior.
- `backend/tests/scanRoutes.test.js` остаётся зелёным без контрактных regressions.
- На iPhone по шагам `open camera -> take photo -> Use Photo` валидный QR проходит.
- На Android тот же путь проходит без альтернативного UX.
- Ошибка “не удалось распознать QR” остаётся только для реально нечитаемых фото, а не для обычных валидных снимков.
- После ошибки пользователь может повторить попытку на том же экране.

## 11. Deferred Follow-Ups

- добавить device-specific telemetry/debug markers для QR decode failures, если после релиза останутся трудно воспроизводимые кейсы;
- рассмотреть отдельный util-level тестовый набор для image normalization, если helper станет заметно сложнее;
- при повторных сбоях на конкретных iPhone formats отдельно оценить необходимость альтернативной decode библиотеки.
