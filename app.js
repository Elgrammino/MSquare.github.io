const grid=document.getElementById("grid");
const sumEl=document.getElementById("sumInput");
const preview=document.getElementById("preview");
const imageBtn=document.getElementById("imageBtn");
const modeSwitch=document.getElementById("modeSwitch");

let birthdayMode=false;
const cells=[],inputs=[];

for(let i=0;i<16;i++){
 const cell=document.createElement("div");
 cell.className="cell";

 if(i>=12){
  const input=document.createElement("input");
  input.type="text";
  input.inputMode="numeric";
  input.maxLength=3;
  input.autocomplete="off";
  input.spellcheck=false;
  cell.appendChild(input);
  cells.push(input);
  inputs.push(input);
 }else{
  const span=document.createElement("span");
  cell.appendChild(span);
  cells.push(span);
 }

 grid.appendChild(cell);
}

function getNumber(v){
 const n=parseInt(v,10);
 return Number.isFinite(n)?n:0;
}

function sanitize(input){
 input.value=input.value.replace(/\D/g,"");
 if(input.value)
  input.value=Math.min(parseInt(input.value),100);
}

let raf=false;

function scheduleUpdate(){
 if(raf)return;
 raf=true;
 requestAnimationFrame(()=>{
  raf=false;
  update();
 });
}

function setMode(on){
 birthdayMode=on;

 inputs.forEach(i=>i.disabled=birthdayMode);

 if(birthdayMode){
  sumEl.readOnly=true;
  document.querySelector(".sum-label").textContent="Сумма";
 }else{
  sumEl.readOnly=false;
  sumEl.value="0";
  inputs.forEach(i=>i.value="");
  document.querySelector(".sum-label").textContent="Введите число";
 }

 scheduleUpdate();
}

function getMatrix(){

 if(!birthdayMode){
  const n=getNumber(sumEl.value);
  return [
   [8,11,n,1],
   [n-1,2,7,12],
   [3,n+2,9,6],
   [10,5,4,n+1]
  ];
 }

 const A=getNumber(inputs[0].value);
 const B=getNumber(inputs[1].value);
 const C=getNumber(inputs[2].value);
 const D=getNumber(inputs[3].value);

 return [
  [B+1,A+3,D-3,C-1],
  [D-2,C-2,B+2,A+2],
  [C+1,D-1,A+1,B-1],
  [A,B,C,D]
 ];
}
function update(){
 const m=getMatrix();
 let d=m;

 if(!birthdayMode&&getNumber(sumEl.value)===0)
  d=[
   [8,11,0,1],
   [-1,2,7,12],
   [3,"+2",9,6],
   [10,5,4,"+1"]
  ];

 let i=0;

 for(let r=0;r<4;r++){
  for(let c=0;c<4;c++){
   let e=cells[i++];
   if(e.tagName==="INPUT") e.value=d[r][c];
   else e.textContent=d[r][c];
  }
 }

 if(birthdayMode)
  sumEl.value=m[3].reduce((a,b)=>a+b,0);
}

sumEl.oninput=()=>{
 if(!birthdayMode){
  sumEl.value=sumEl.value.replace(/\D/g,"");
  scheduleUpdate();
 }
};

inputs.forEach((input,i)=>{
 input.oninput=()=>{
  sanitize(input);
  if(input.value.length>=2)
   i<3?inputs[i+1].focus():input.blur();
  scheduleUpdate();
 };

 input.onkeydown=e=>{
  if(e.key==="Backspace"&&!input.value)
   inputs[i-1]?.focus();
 };
});

clearBtn.onclick=()=>{
 inputs.forEach(i=>i.value="");
 if(!birthdayMode)sumEl.value="0";
 preview.hidden=true;
 scheduleUpdate();
};

modeSwitch.onchange=()=>{
 setMode(modeSwitch.checked);
};
let canvas,ctx;

function getCanvas(){
 if(canvas)return canvas;
 canvas=document.createElement("canvas");
 canvas.width=900;
 canvas.height=1200;
 ctx=canvas.getContext("2d");
 ctx.textAlign="center";
 ctx.textBaseline="middle";
 return canvas;
}

function drawImage(){
 const m=getMatrix();
 getCanvas();

 ctx.fillStyle="#fff";
 ctx.fillRect(0,0,900,1200);

 ctx.fillStyle="#000";
 ctx.font="60px Caveat";

 m.flat().forEach((n,i)=>{
  let r=Math.floor(i/4);
  let c=i%4;
  ctx.fillText(
   n,
   120+c*160+80,
   180+r*160+80
  );
 });

 preview.src=canvas.toDataURL("image/jpeg",.9);
 preview.hidden=false;
}

imageBtn.onclick=drawImage;

setMode(false);
requestAnimationFrame(update);

if("serviceWorker" in navigator){
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register(
   "/MSquare.github.io/sw.js",
   {scope:"/MSquare.github.io/"}
  ).catch(e=>console.log("SW error",e));
 });
}
