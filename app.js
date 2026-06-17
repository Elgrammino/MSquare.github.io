
const grid = document.getElementById("grid");
const sumEl = document.getElementById("sum");
const preview = document.getElementById("preview");

const cells = [];
for(let i=0;i<16;i++){
  const div = document.createElement("div");
  div.className = "cell";

  if(i >= 12){
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 3;
    input.dataset.index = i - 12;
    div.appendChild(input);
    cells.push(input);
  }else{
    const span = document.createElement("span");
    span.textContent = "";
    div.appendChild(span);
    cells.push(span);
  }

  grid.appendChild(div);
}

const inputs = cells.slice(12);

function num(v){
  v = parseInt(v,10);
  return Number.isFinite(v) ? v : 0;
}

function clampInput(input){
  let value = input.value.replace(/\D/g,"");
  if(value){
    value = Math.min(100, Math.max(1, parseInt(value,10))).toString();
  }
  input.value = value;
}

function animateValue(el, value){
  if(el.textContent === String(value)) return;

  el.style.transform = "translateY(100%)";
  el.style.opacity = "0";

  requestAnimationFrame(()=>{
    el.textContent = value;
    el.style.transition = "none";
    el.style.transform = "translateY(-100%)";
    el.style.opacity = "0";

    requestAnimationFrame(()=>{
      el.style.transition = "transform .2s ease-out, opacity .2s ease-out";
      el.style.transform = "translateY(0)";
      el.style.opacity = "1";
    });
  });
}

function drawImage(matrix){
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1050;
  const c = canvas.getContext("2d");

  c.fillStyle = "#fff";
  c.fillRect(0,0,canvas.width,canvas.height);

  c.fillStyle = "#000";
  c.font = "bold 70px Caveat";
  c.textAlign = "center";
  c.fillText("Магический квадрат", canvas.width/2, 120);

  const x = 150;
  const y = 220;
  const s = 150;

  function wobble(v){
    return v + (Math.random() * 4 - 2);
  }

  c.lineWidth = 4;

  for(let i=0;i<=4;i++){
    c.beginPath();
    c.moveTo(wobble(x + i*s), wobble(y));
    c.lineTo(wobble(x + i*s), wobble(y + s*4));
    c.stroke();

    c.beginPath();
    c.moveTo(wobble(x), wobble(y + i*s));
    c.lineTo(wobble(x + s*4), wobble(y + i*s));
    c.stroke();
  }

  c.font = "56px Caveat";

  matrix.flat().forEach((n,i)=>{
    const r = Math.floor(i/4);
    const col = i % 4;

    c.fillText(
      n ? n : "",
      x + col*s + s/2,
      y + r*s + s/2 + 18
    );
  });

  preview.src = canvas.toDataURL("image/jpeg",0.95);
}

function update(){
  const A = num(inputs[0].value);
  const B = num(inputs[1].value);
  const C = num(inputs[2].value);
  const D = num(inputs[3].value);

  const matrix = [
    [B+1, A+3, D-3, C-1],
    [D-2, C-2, B+2, A+2],
    [C+1, D-1, A+1, B-1],
    [A, B, C, D]
  ];

  let idx = 0;
  for(let r=0;r<3;r++){
    for(let c=0;c<4;c++){
      animateValue(cells[idx], matrix[r][c]);
      idx++;
    }
  }

  sumEl.textContent = A+B+C+D;
  drawImage(matrix);
}

inputs.forEach((input,index)=>{
  input.addEventListener("input",()=>{
    clampInput(input);

    if(
      (input.value.length === 2 && input.value !== "10") ||
      input.value.length === 3
    ){
      inputs[index + 1]?.focus();
    }

    update();
  });

  input.addEventListener("keydown",(e)=>{
    if(e.key === "Backspace" && !input.value){
      inputs[index - 1]?.focus();
    }
  });
});

document.getElementById("clearBtn").addEventListener("click",()=>{
  inputs.forEach(i=>i.value = "");
  inputs[0].focus();
  update();
});

update();
