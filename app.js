const grid = document.getElementById("grid");
const sumEl = document.getElementById("sum");
const preview = document.getElementById("preview");

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
    const span = document.createElement("span");
    span.textContent = "";

    cell.appendChild(span);
    cells.push(span);
  }

  grid.appendChild(cell);
}

const inputs = cells.slice(12);

function getNumber(value) {
  value = parseInt(value, 10);

  return Number.isFinite(value)
    ? value
    : 0;
}

function sanitize(input) {
  let value =
    input.value.replace(/\D/g, "");

  if (value) {
    value = parseInt(value);

    value =
      Math.max(
        1,
        Math.min(100, value)
      );

    input.value = value;
  }
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
  ctx,
  x1,
  y1,
  x2,
  y2
) {
  const parts = 20;

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (
    let i = 1;
    i <= parts;
    i++
  ) {
    const t = i / parts;

    const nx =
      x1 +
      (x2 - x1) * t;

    const ny =
      y1 +
      (y2 - y1) * t;

    const bend =
      Math.sin(
        t * Math.PI
      ) * 10;

    const dx =
      Math.random() * 14 - 7;

    const dy =
      Math.random() * 14 - 7;

    if (
      Math.abs(x2 - x1) >
      Math.abs(y2 - y1)
    ) {
      ctx.lineTo(
        nx + dx,
        ny + dy + bend
      );
    } else {
      ctx.lineTo(
        nx + dx + bend,
        ny + dy
      );
    }
  }

  ctx.stroke();
}

function drawImage(matrix) {
  const canvas =
    document.createElement("canvas");

  canvas.width = 1400;
  canvas.height = 1800;

  const c =
    canvas.getContext("2d");

  c.fillStyle = "#fff";
  c.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  c.fillStyle = "#000";
  c.textAlign = "center";

  c.font =
    "bold 110px Caveat";

  c.fillText(
    "Магический квадрат",
    canvas.width / 2,
    180
  );

  const x = 260;
  const y = 350;
  const s = 220;

  c.lineCap = "round";
  c.lineJoin = "round";

  for (
    let pass = 0;
    pass < 2;
    pass++
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
        c,
        x + i * s,
        y,
        x + i * s,
        y + s * 4
      );

      handLine(
        c,
        x,
        y + i * s,
        x + s * 4,
        y + i * s
      );
    }
  }

  c.font =
    "78px Caveat";

  matrix.flat().forEach(
    (n, i) => {
      const row =
        Math.floor(i / 4);

      const col =
        i % 4;

      const dx =
        Math.random() * 8 - 4;

      const dy =
        Math.random() * 8 - 4;

      c.fillText(
        String(n),
        x +
          col * s +
          s / 2 +
          dx,
        y +
          row * s +
          s / 2 +
          30 +
          dy
      );
    }
  );

  preview.src =
    canvas.toDataURL(
      "image/jpeg",
      0.95
    );
}

function update() {
  const A =
    getNumber(inputs[0].value);

  const B =
    getNumber(inputs[1].value);

  const C =
    getNumber(inputs[2].value);

  const D =
    getNumber(inputs[3].value);

  const matrix = [
    [B + 1, A + 3, D - 3, C - 1],
    [D - 2, C - 2, B + 2, A + 2],
    [C + 1, D - 1, A + 1, B - 1],
    [A, B, C, D]
  ];

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

  sumEl.textContent =
    A + B + C + D;

  drawImage(matrix);
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

      inputs[0].focus();
      update();
    }
  );

update();