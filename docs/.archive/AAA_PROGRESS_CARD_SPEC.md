# AAA progress card: Anchors, Pipeline, MVP (spec v2)

Обновлённая спецификация с учётом «болтов»: assets как CanvasImageSource, frameInset, debug overlay, pixel-snap, glowStroke-дисциплина, лента от measureText, чипы по двум строкам, slotsRow.slots, порядок ассетов, разбивка MVP-1 на 4 коммита.

---

## 0. Рамки

- Только `input.kind === 'progress_summary'` в `src/utils/socialGenerator.ts`.
- Canvas 2D, без новых зависимостей.
- Лэйаут не меняем — снимаем координаты по ходу рендера, поверх рисуем рамки/блики/слоты.
- Базовый размер: 1080 (width для story). `S = width / 1080`.

---

## 1. Assets: не строки, а CanvasImageSource

Загрузка/кеш — **вне** socialGenerator (или отдельная утилита заранее). В input передаём уже готовые изображения.

```ts
assets?: {
  frame?: CanvasImageSource;
  texture?: CanvasImageSource;
  pill?: CanvasImageSource;
  slot?: CanvasImageSource;
  divider?: CanvasImageSource;
};
```

Если нужен URL — отдельный слой подготовки: URL → ImageBitmap, затем вызов генератора с `assets.*`.

---

## 2. Anchors + frameInset + debug

Типы:

```ts
type Rect = { x: number; y: number; w: number; h: number; r?: number };
type Circle = { cx: number; cy: number; r: number };

type ProgressAnchors = {
  card: Rect;
  safe: Rect;
  frame: Rect;
  topHud?: Rect;
  pill: Rect;
  avatar: Circle;
  avatarRing: Circle;
  rankTitle: { x: number; y: number; maxW: number; baseline: 'alphabetic' | 'middle' };
  rankRibbon?: Rect;
  statsLine: { x: number; y: number; maxW: number };
  statsChips?: { left: Rect; right: Rect };
  slotsRow: { y: number; r: number; slots: { cx: number; locked: boolean }[] };
  buff: Rect;
  footerDivider: Rect;
  footer: Rect;
};
```

Разделение frame и safe:

- `const frameInset = 10 * S;` (или 8–12)
- `A.frame = insetRect(A.card, frameInset);`
- `A.safe = insetRect(A.card, pad);`

Утилита:

```ts
function insetRect(r: Rect, d: number, rr?: number): Rect {
  return { x: r.x + d, y: r.y + d, w: r.w - 2*d, h: r.h - 2*d, r: rr ?? r.r };
}
```

Debug overlay (чтобы проверить, что anchors стоят ровно):

```ts
function drawAnchorsDebug(ctx: CanvasRenderingContext2D, A: ProgressAnchors, S: number) {
  withSaved(ctx, () => {
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2 * S;
    ctx.strokeStyle = "rgba(0,255,255,0.6)";
    strokeRoundRect(ctx, A.frame);
    ctx.strokeStyle = "rgba(255,0,255,0.6)";
    strokeRoundRect(ctx, A.safe);
  });
}
```

---

## 3. Pixel-snap для тонких линий

Canvas 2D размывает 1px линии. Для HUD/разделителей/скоб (особенно скин A):

```ts
const snap = (v: number) => Math.round(v) + 0.5;
```

Использовать в координатах тонких stroke (1px, odd).

---

## 4. glowStroke: дисциплина (composite только внутри withSaved)

Композит только внутри вызова, наружу не выносить.

```ts
function glowStroke(
  ctx: CanvasRenderingContext2D,
  pathFn: () => void,
  color: string,
  baseWidth: number,
  steps: number,
  alpha0: number,
  composite?: GlobalCompositeOperation
) {
  withSaved(ctx, () => {
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (let i = 0; i < steps; i++) {
      const t = i / Math.max(1, steps - 1);
      ctx.globalAlpha = alpha0 * (1 - t) * (1 - t);
      ctx.lineWidth = baseWidth + (baseWidth * 2.2) * t;

      if (composite && i === 0) ctx.globalCompositeOperation = composite;

      ctx.beginPath();
      pathFn();
      ctx.stroke();
    }
  });
}
```

`steps = Math.max(4, Math.min(7, Math.round(6 * S)))`.

---

## 5. Ранг/лента: от measureText, fitFontSize по шагам

- Лента: `textWidth + paddingX*2`; `maxW = A.safe.w - ...` чтобы не упираться в край.
- fitTextToWidth — по шагам вниз, без прыжков:

```ts
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  base: number,
  min: number,
  fontFamily: string
): number {
  for (let s = base; s >= min; s -= 1) {
    ctx.font = `${s}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxW) return s;
  }
  return min;
}
```

---

## 6. Статы: два чипа по двум подстрокам

Не парсить "Закрыто N • В пути M". Числа уже есть — собираем:

- `s1 = "Закрыто ${closed} ${levelsWord}"`
- `s2 = "В пути ${inProgress}"`

Чипы строим по measureText(s1), measureText(s2). Рисуем под тем же baseline: `chipY = textY - fontSize*0.9` (или по метрикам), текст не двигаем.

---

## 7. slotsRow: тип слота в anchor

Не только центры, но и locked:

```ts
slotsRow: {
  y: number;
  r: number;
  slots: { cx: number; locked: boolean }[];
}
```

Тогда `drawSlotBase(slot, skin)` получает всё без внешних переменных.

---

## 8. Assets hook: порядок один и тот же

На всех слоях:

1. Если ассет есть → `drawImage` в anchor.
2. Иначе → процедурно по skin.

Опционально: даже при ассете можно поверх нарисовать тонкую accent-обводку (A/B), чтобы ранг связывался с темой.

---

## 9. Pipeline: один блок вызовов в коде

Закрепить порядок одним комментарием-блоком:

```ts
// 1) BG
drawBaseGradient(); drawStars();
drawVignetteSoft(A.card); drawVignetteCorners(A.card);
drawRankAura(accent, A.avatar ?? A.card);
drawTexture();

// 2) FRAME
drawFrame(A.frame, skin);

// 3) BRAND + PILL
drawBrand();
drawPill(A.pill, skin);

// 4) AVATAR
drawAvatarImage();
drawAvatarRing(A.avatarRing, skin);

// 5) RANK
computeRankRibbonRectFromText();
drawRankRibbon();
drawRankTitleStrokeFill();
drawEmblemLeftOfRank();

// 6) STATS
drawStatsChipsUnderText();
drawStatsText();

// 7) SLOTS
drawSlotsRow();

// 8) BUFF
drawBuffFrame();
drawBuffText();

// 9) FOOTER
drawFooterDivider();
drawFooterText();
```

При необходимости перед футером: `if (DEBUG_ANCHORS) drawAnchorsDebug(ctx, A, S);`

---

## 10. MVP-1 «сегодня»: 4 коммита

**Коммит 1:** S-токены + каркас ProgressAnchors + insetRect + drawAnchorsDebug (заполнение anchors по месту, debug по флагу).

**Коммит 2:** Двойная виньетка + аура ранга + кеш noisePattern (drawTexture).

**Коммит 3:** Рамка A (двойной кант + фаска + угловые скобы), с snap где нужно.

**Коммит 4:** Пилл стекло + кольцо аватара glowStroke + divider A.

После этого карточка уже заметно «не как сейчас». Остальное — усиление (MVP-2, MVP-3).

---

## 11. Мини-токены, скины, QA

Без изменений: accentHi, accentLo, ink, glass1, glass2, gold (B); skin 'A'|'B'|'D'; приёмка 1080×1920 / 720×1280, светлый/тёмный accent, locked без glow, A/B/D различимы.
