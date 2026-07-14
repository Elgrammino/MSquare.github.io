const grid = document.getElementById("grid");
const sumEl = document.getElementById("sum");
const sumLabelEl = document.getElementById("sumLabel");
const preview = document.getElementById("preview");
const imageBtn = document.getElementById("imageBtn");
const hintEl = document.getElementById("hint");
const modeToggle = document.getElementById("modeToggle");

const cells = [];
const inputs = [];

/* ---------- FAST INIT ---------- */

for (let i = 0; i < 16; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";

  if (i >= 12) {
    const input = document.createElement("input");

    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 3;
    input.autocomplete = "off";
    input.spellcheck = false;

    cell.appendChild(input);

    cells.push(input);
    inputs.push(input);
  } else {
    const span = document.createElement("span");
    cell.appendChild(span);
    cells.push(span);
  }

  grid.appendChild(cell);
}

/* ---------- MODE STATE ---------- */
/* checked = "Дата рождения" (справа), unchecked = "Обычный квадрат" (слева) */

let mode = modeToggle.checked ? "date" : "normal";

let savedDateValues = ["", "", "", ""];
let normalNumberRaw = "";

/* ---------- UTILS ---------- */

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function getNumber(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function setCellDisplay(el, text) {
  if (el.tagName === "INPUT") {
    el.value = text;
  } else if (el.textContent !== text) {
    el.textContent = text;
  }
}

function sanitize(input) {
  let v = input.value.replace(/\D/g, "");

  if (!v) {
    input.value = "";
    return;
  }

  input.value = String(clamp(parseInt(v, 10), 0, 100));
}

function updateHint() {
  const anyFilled = inputs.some(input => input.value.trim() !== "");
  hintEl.classList.toggle("hidden", anyFilled);
}

/* ---------- IOS-STYLE HAPTIC FEEL ---------- */

let rafPending = false;
let renderedOnce = false;

function scheduleUpdate() {
  if (rafPending) return;

  rafPending = true;

  requestAnimationFrame(() => {
    rafPending = false;
    update();
    renderedOnce = true;
  });
}

/* ---------- MODE "ДАТА РОЖДЕНИЯ" (не трогаем формулу) ---------- */

function getDateMatrix() {

  const A = getNumber(inputs[0].value);
  const B = getNumber(inputs[1].value);
  const C = getNumber(inputs[2].value);
  const D = getNumber(inputs[3].value);

  return [
    [B + 1, A + 3, D - 3, C - 1],
    [D - 2, C - 2, B + 2, A + 2],
    [C + 1, D - 1, A + 1, B - 1],
    [A, B, C, D]
  ];
}

function renderDateMode() {

  updateHint();

  const m = getDateMatrix();

  let i = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      setCellDisplay(cells[i], String(m[r][c]));
      i++;
    }
  }

  sumEl.textContent =
    m[3][0] +
    m[3][1] +
    m[3][2] +
    m[3][3];

}

/* ---------- MODE "ОБЫЧНЫЙ КВАДРАТ" ---------- */
/*
  8   11   n    1
  n-1 2    7    12
  3   n+2  9    6
  10  5    4    n+1

  Человек вводит нужную сумму каждой строки/столбца/диагонали
  (число > 20). Внутренняя переменная н = введённое число - 20.

  Пока число не введено — показываем не сами вычисленные
  цифры, а "+2"/"+1" для ячеек с плюсовым смещением
  (чтобы не путать их с фиксированными 2 и 1 в квадрате),
  и обычное вычисленное значение для смещения в минус.
*/

const NORMAL_TEMPLATE = [
  [{ fixed: 8 }, { fixed: 11 }, { offset: 0 }, { fixed: 1 }],
  [{ offset: -1 }, { fixed: 2 }, { fixed: 7 }, { fixed: 12 }],
  [{ fixed: 3 }, { offset: 2 }, { fixed: 9 }, { fixed: 6 }],
  [{ fixed: 10 }, { fixed: 5 }, { fixed: 4 }, { offset: 1 }]
];

function formatOffsetCell(offset, hasN, n) {

  if (hasN) return String(n + offset);

  if (offset === 0) return "0";
  if (offset > 0) return "+" + offset;

  return String(offset);

}

function getNormalNumericMatrix(n) {

  return NORMAL_TEMPLATE.map(row =>
    row.map(spec => spec.fixed !== undefined ? spec.fixed : n + spec.offset)
  );

}

function renderNormalMode() {

  const hasN = normalNumberRaw !== "";
  const entered = hasN ? parseInt(normalNumberRaw, 10) : 0;
  const n = entered - 20;

  let i = 0;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {

      const spec = NORMAL_TEMPLATE[r][c];

      const text = spec.fixed !== undefined
        ? String(spec.fixed)
        : formatOffsetCell(spec.offset, hasN, n);

      setCellDisplay(cells[i], text);

      i++;
    }
  }

}

/* ---------- UPDATE (диспетчер по режиму) ---------- */

function update() {

  if (mode === "date") {
    renderDateMode();
  } else {
    renderNormalMode();
  }

}

/* ---------- MODE SWITCH ---------- */

function setMode(newMode) {

  mode = newMode;

  const isNormal = mode === "normal";

  if (isNormal) {

    savedDateValues = inputs.map(input => input.value);
    inputs.forEach(input => { input.disabled = true; });

    sumEl.setAttribute("contenteditable", "true");
    sumEl.classList.add("editable");
    sumLabelEl.textContent = "Введите число";
    sumEl.textContent = normalNumberRaw;

    hintEl.style.display = "none";

  } else {

    inputs.forEach((input, i) => {
      input.disabled = false;
      input.value = savedDateValues[i] || "";
    });

    sumEl.removeAttribute("contenteditable");
    sumEl.classList.remove("editable");
    sumLabelEl.textContent = "Сумма";

    hintEl.style.display = "";

  }

  preview.hidden = true;

  scheduleUpdate();

}

modeToggle.addEventListener("change", () => {
  setMode(modeToggle.checked ? "date" : "normal");
});

/* ---------- INPUTS (IOS-STYLE INPUT FLOW, режим "дата рождения") ---------- */

inputs.forEach((input, i) => {

  input.addEventListener("input", () => {

    sanitize(input);

    if (input.value.length >= 2) {

      if (i < inputs.length - 1) {
        inputs[i + 1].focus();
      } else {
        input.blur();
      }

    }

    scheduleUpdate();

  });

  input.addEventListener("keydown", (e) => {

    if (e.key === "Backspace" && !input.value) {
      inputs[i - 1]?.focus();
    }

  });

  input.addEventListener("blur", scheduleUpdate);

});

/* ---------- ВВОД ЧИСЛА (режим "обычный квадрат") ---------- */

sumEl.addEventListener("input", () => {

  if (mode !== "normal") return;

  const digits = sumEl.textContent.replace(/\D/g, "").slice(0, 3);

  if (sumEl.textContent !== digits) {
    sumEl.textContent = digits;

    // курсор в конец после чистки не-цифр
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(sumEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  normalNumberRaw = digits;

  scheduleUpdate();

});

sumEl.addEventListener("blur", () => {

  if (mode !== "normal") return;

  if (normalNumberRaw !== "" && parseInt(normalNumberRaw, 10) <= 20) {
    normalNumberRaw = "21";
    sumEl.textContent = normalNumberRaw;
  }

  scheduleUpdate();

});

sumEl.addEventListener("keydown", (e) => {

  if (mode === "normal" && e.key === "Enter") {
    e.preventDefault();
    sumEl.blur();
  }

});

/* ---------- CLEAR ---------- */

document.getElementById("clearBtn")
.addEventListener("click", () => {

  if (mode === "date") {

    inputs.forEach(input => input.value = "");
    inputs[0].focus();

  } else {

    normalNumberRaw = "";
    sumEl.textContent = "";
    sumEl.focus();

  }

  preview.hidden = true;

  scheduleUpdate();

});

/* ---------- IMAGE ---------- */

let canvas;
let ctx;

function getCanvas() {

  if (canvas) return canvas;

  canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1200;

  ctx = canvas.getContext("2d");

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  return canvas;

}

/* ---------- HAND-DRAWN HELPERS ---------- */

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Рисует слегка "дрожащую" линию от руки между двумя точками
function wobblyLine(x1, y1, x2, y2, jitter, segments) {

  const pts = [{ x: x1, y: y1 }];

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    pts.push({
      x: x1 + (x2 - x1) * t + rand(-jitter, jitter),
      y: y1 + (y2 - y1) * t + rand(-jitter, jitter)
    });
  }

  pts.push({ x: x2, y: y2 });

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }

  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();

}

// Рисует сетку 4x4 нарисованными от руки линиями
function drawHandDrawnGrid(x, y, s, size) {

  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.85;

  // вертикальные линии
  for (let c = 0; c <= size; c++) {
    wobblyLine(x + c * s, y, x + c * s, y + size * s, 3, 6);
  }

  // горизонтальные линии
  for (let r = 0; r <= size; r++) {
    wobblyLine(x, y + r * s, x + size * s, y + r * s, 3, 6);
  }

  ctx.globalAlpha = 1;

}

function drawImage() {

  const m = mode === "date"
    ? getDateMatrix()
    : getNormalNumericMatrix((normalNumberRaw !== "" ? parseInt(normalNumberRaw, 10) : 20) - 20);

  getCanvas();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const x = 120;
  const y = 180;
  const s = 160;

  drawHandDrawnGrid(x, y, s, 4);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "60px Caveat";

  m.flat().forEach((number, index) => {

    const row = Math.floor(index / 4);
    const col = index % 4;

    const cx = x + col * s + s / 2 + rand(-4, 4);
    const cy = y + row * s + s / 2 + rand(-4, 4);
    const angle = rand(-4, 4) * Math.PI / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillText(String(number), 0, 0);
    ctx.restore();

  });

  preview.src = canvas.toDataURL("image/jpeg", 0.9);
  preview.hidden = false;

}

/* ---------- BUTTONS ---------- */

imageBtn.addEventListener("click", drawImage);

/* ---------- START ---------- */

requestAnimationFrame(update);

if ("serviceWorker" in navigator) {

  window.addEventListener("load", async () => {

    try {

      await navigator.serviceWorker.register(
        "/MSquare.github.io/sw.js",
        {
          scope: "/MSquare.github.io/"
        }
      );

    } catch (e) {

      console.error("SW error:", e);

    }

  });

}
