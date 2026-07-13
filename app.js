const grid = document.getElementById("grid");
const sumEl = document.getElementById("sum");
const preview = document.getElementById("preview");
const imageBtn = document.getElementById("imageBtn");

const sumInput = sumEl;

const modeSwitch = document.getElementById("modeSwitch");

let birthMode = true; // true = ДР, false = Сумма

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

/* ---------- UTILS ---------- */

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function getNumber(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function sanitize(input) {
  let v = input.value.replace(/\D/g, "");
  if (!v) {
    input.value = "";
    return;
  }

  input.value = String(clamp(parseInt(v, 10), 0, 100));
}

/* ---------- IOS-STYLE HAPTIC FEEL (soft render batching) ---------- */

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

/* ---------- MATRIX ---------- */

function getMatrix() {
  if (birthMode) {
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

  const sum = clamp(getNumber(sumEl.textContent || sumEl.value), 20, 999);
  const n = sum - 20;

  return [
    [8, 11, n, 1],
    [n - 1, 2, 7, 12],
    [3, n + 2, 9, 6],
    [10, 5, 4, n + 1]
  ];
}

/* ---------- UPDATE (SMOOTH IOS FEEL) ---------- */

function update() {
  const m = getMatrix();

  let i = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const el = cells[i];
      const val = m[r][c];

      if (!renderedOnce) {
        el.textContent = val;
      } else {
        if (el.textContent !== String(val)) {
          el.textContent = val;
        }
      }

      i++;
    }
  }

 if (birthMode) {
  sumEl.textContent =
    m[3][0] + m[3][1] + m[3][2] + m[3][3];
}

/* ---------- INPUTS (IOS-STYLE INPUT FLOW) ---------- */

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

  /* iOS-like blur soft update */
  input.addEventListener("blur", scheduleUpdate);
});

/* ---------- CLEAR (SOFT RESET FEEL) ---------- */

document.getElementById("clearBtn")
  .addEventListener("click", () => {
    inputs.forEach(i => (i.value = ""));
    preview.hidden = true;
    inputs[0].focus();

    scheduleUpdate();
  });

/* ---------- IMAGE (LAZY INIT) ---------- */

let canvas, ctx;

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

function drawImage() {
  const m = getMatrix();
  getCanvas();

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const x = 120;
  const y = 180;
  const s = 160;

  ctx.fillStyle = "#000";
  ctx.font = "60px Caveat";

  m.flat().forEach((n, i) => {
    const r = Math.floor(i / 4);
    const c = i % 4;

    ctx.fillText(
      String(n),
      x + c * s + s / 2,
      y + r * s + s / 2
    );
  });

  preview.src = canvas.toDataURL("image/jpeg", 0.9);
  preview.hidden = false;
}

/* ---------- BUTTON ---------- */

imageBtn.addEventListener("click", drawImage);

/* ---------- IOS-INSTANT START ---------- */

requestAnimationFrame(update);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration =
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
modeSwitch.addEventListener("click", () => {
  birthMode = !birthMode;

  modeSwitch.classList.toggle("active");

  if (birthMode) {
    // режим ДР
    sumEl.setAttribute("readonly", true);
    inputs.forEach(i => i.disabled = false);
  } else {
    // режим суммы
    sumEl.removeAttribute("readonly");
    inputs.forEach(i => i.disabled = true);
  }

  scheduleUpdate();
});
  sumEl.setAttribute("readonly", true);
modeSwitch.classList.add("active");
