const grid = document.getElementById("grid");
const sumEl = document.getElementById("sum");
const preview = document.getElementById("preview");
const imageBtn = document.getElementById("imageBtn");

const cells = [];

for (let i = 0; i < 16; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";

  if (i >= 12) {
    const input = document.createElement("input");

    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 3;

    cell.appendChild(input);
    cells.push(input);
  } else {
    const span =
      document.createElement("span");

    cell.appendChild(span);
    cells.push(span);
  }

  grid.appendChild(cell);
}

const inputs = cells.slice(12);

const canvas =
  document.createElement("canvas");

canvas.width = 1000;
canvas.height = 1300;

const c =
  canvas.getContext("2d");

function getNumber(v) {
  v = parseInt(v, 10);

  return Number.isFinite(v)
    ? v
    : 0;
}

function sanitize(input) {
  let value =
    input.value.replace(/\D/g, "");

  if (!value) return;

  value = Math.max(
    1,
    Math.min(
      100,
      parseInt(value)
    )
  );

  input.value = value;
}

function animateValue(el, value) {
  value = String(value);

  if (el.textContent === value) {
    return;
  }

  const old =
    document.createElement("span");

  const next =
    document.createElement("span");

  old.className =
    "digit old";

  next.className =
    "digit next";

  old.textContent =
    el.textContent;

  next.textContent =
    value;

  el.innerHTML = "";

  el.append(old);
  el.append(next);

  requestAnimationFrame(() => {
    old.classList.add("hide");
    next.classList.add("show");
  });

  setTimeout(() => {
    el.textContent = value;
  }, 250);
}

function handLine(
  x1,
  y1,
  x2,
  y2
) {
  const pieces = 18;

  c.beginPath();
  c.moveTo(x1, y1);

  for (
    let i = 1;
    i <= pieces;
    i++
  ) {
    const t = i / pieces;

    const nx =
      x1 +
      (x2 - x1) * t;

    const ny =
      y1 +
      (y2 - y1) * t;

    const dx =
      Math.random() * 8 - 4;

    const dy =
      Math.random() * 8 - 4;

    c.lineTo(
      nx + dx,
      ny + dy
    );
  }

  c.stroke();
}

function getMatrix() {
  const A =
    getNumber(inputs[0].value);

  const B =
    getNumber(inputs[1].value);

  const C =
    getNumber(inputs[2].value);

  const D =
    getNumber(inputs[3].value);

  return [
    [B + 1, A + 3, D - 3, C - 1],
    [D - 2, C - 2, B + 2, A + 2],
    [C + 1, D - 1, A + 1, B - 1],
    [A, B, C, D]
  ];
}

function drawImage() {
  const matrix =
    getMatrix();

  c.fillStyle = "#fff";
  c.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const x = 140;
  const y = 220;
  const s = 180;

  c.strokeStyle = "#000";
  c.lineCap = "round";
  c.lineJoin = "round";

  for (
    let p = 0;
    p < 2;
    p++
  ) {
    c.lineWidth =
      5 +
      Math.random() * 3;

    for (
      let i = 0;
      i <= 4;
      i++
    ) {
      handLine(
        x + i * s,
        y,
        x + i * s,
        y + s * 4
      );

      handLine(
        x,
        y + i * s,
        x + s * 4,
        y + i * s
      );
    }
  }

  c.fillStyle = "#000";
  c.textAlign = "center";
  c.textBaseline =
    "middle";

  c.font =
    "70px Caveat";

  matrix.flat().forEach(
    (n, i) => {
      const row =
        Math.floor(i / 4);

      const col =
        i % 4;

      c.save();

      c.translate(
        x +
          col * s +
          s / 2 +
          (Math.random() * 10 - 5),

        y +
          row * s +
          s / 2 +
          (Math.random() * 10 - 5)
      );

      c.rotate(
        (Math.random() * 8 - 4) *
        Math.PI /
        180
      );

      c.fillText(
        String(n),
        0,
        0
      );

      c.restore();
    }
  );

  preview.src =
    canvas.toDataURL(
      "image/jpeg",
      0.92
    );

  preview.hidden = false;
}

function update() {
  const matrix =
    getMatrix();

  let i = 0;

  for (
    let r = 0;
    r < 3;
    r++
  ) {
    for (
      let c = 0;
      c < 4;
      c++
    ) {
      animateValue(
        cells[i],
        matrix[r][c]
      );

      i++;
    }
  }

  const sum =
    matrix[3][0] +
    matrix[3][1] +
    matrix[3][2] +
    matrix[3][3];

  sumEl.textContent = sum;
}

inputs.forEach(
  (input, index) => {
    input.addEventListener(
      "input",
      () => {
        sanitize(input);

        if (
          input.value.length >= 2
        ) {
          inputs[
            index + 1
          ]?.focus();
        }

        update();
      }
    );

    input.addEventListener(
      "keydown",
      e => {
        if (
          e.key ===
            "Backspace" &&
          !input.value
        ) {
          inputs[
            index - 1
          ]?.focus();
        }
      }
    );
  }
);

document
  .getElementById("clearBtn")
  .addEventListener(
    "click",
    () => {
      inputs.forEach(
        input =>
          (input.value = "")
      );

      preview.hidden = true;

      inputs[0].focus();

      update();
    }
  );

imageBtn.addEventListener(
  "click",
  drawImage
);

update();
