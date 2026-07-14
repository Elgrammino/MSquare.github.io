const grid = document.getElementById("grid");
const sumEl = document.getElementById("sum");
const preview = document.getElementById("preview");
const imageBtn = document.getElementById("imageBtn");
const modeSwitch = document.getElementById("modeSwitch");
let birthdayMode = false;
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

/* ---------- MATRIX ---------- */

function getMatrix() {

  if (birthdayMode) {

    const n = getNumber(sumEl.textContent);

    return [
      [8, 11, n, 1],
      [n - 1, 2, 7, 12],
      [3, n + 2, 9, 6],
      [10, 5, 4, n + 1]
    ];
  }

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

/* ---------- UPDATE ---------- */

function update() {

  const m = getMatrix();

  sumEl.contentEditable = birthdayMode;

  let i = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {

      const el = cells[i];
      const val = m[r][c];

      if (!renderedOnce) {
        el.textContent = val;
      } else if (el.textContent !== String(val)) {
        el.textContent = val;
      }

      i++;
    }
  }

  if (!birthdayMode) {
    sumEl.textContent =
      m[3][0] +
      m[3][1] +
      m[3][2] +
      m[3][3];
  }

}

/* ---------- MODE ---------- */

function setMode(on) {

  birthdayMode = !on;

  inputs.forEach(input => {
    input.disabled = birthdayMode;

    if (birthdayMode) {
      input.value = "";
    }
  });

  if (birthdayMode) {
    sumEl.textContent = "0";
  }

  scheduleUpdate();
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

  input.addEventListener("blur", scheduleUpdate);

});

/* ---------- CLEAR ---------- */

document.getElementById("clearBtn")
.addEventListener("click", () => {

  inputs.forEach(input => input.value = "");

  if (birthdayMode) {
    sumEl.textContent = "0";
  }

  preview.hidden = true;

  if (!birthdayMode) {
    inputs[0].focus();
  }

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
function drawImage() {
  const m = getMatrix();
  getCanvas();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const x = 120;
  const y = 180;
  const s = 160;
  ctx.fillStyle = "#000000";
  ctx.font = "60px Caveat";
  m.flat().forEach((number, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    ctx.fillText(
      String(number),
      x + col * s + s / 2,
      y + row * s + s / 2
    );
  });
  preview.src = canvas.toDataURL("image/jpeg", 0.9);
  preview.hidden = false;
}
/* ---------- BUTTONS ---------- */
imageBtn.addEventListener("click", drawImage);
modeSwitch.addEventListener("change", () => {
  setMode(modeSwitch.checked);
});
sumEl.addEventListener("input", () => {
  if (!birthdayMode) return;
  sumEl.textContent = sumEl.textContent.replace(/\D/g, "");
  scheduleUpdate();
});
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
