let network; 
let canvas, ctx;
let sunX = 150;
let clouds = [];
let raindrops = [];
let lightning = {active:false, timer:0};

// Normalización
const norm = {
  temp:{min:-10,max:45},hum:{min:0,max:100},pres:{min:980,max:1040},
  wind:{min:0,max:120},dir:{min:0,max:360},rain:{min:0,max:100},
  outTemp:{min:-10,max:45},outHum:{min:0,max:100}
};
function normalize(v,r){return (v-r.min)/(r.max-r.min);}
function denormalize(v,r){return v*(r.max-r.min)+r.min;}

// 🔹 Dataset más variado
const trainingRaw = [
  // calor seco
  {in:[35,30,1015,10,180,0], out:[36,28]},
  {in:[38,25,1017,8,200,0], out:[39,23]},
  {in:[32,35,1013,12,150,5], out:[33,33]},

  // calor húmedo
  {in:[30,75,1008,15,160,40], out:[31,78]},
  {in:[28,80,1007,20,140,60], out:[29,82]},
  {in:[33,70,1009,10,180,30], out:[34,72]},

  // templado seco
  {in:[22,40,1015,8,90,0], out:[23,38]},
  {in:[18,35,1018,12,100,0], out:[19,34]},
  {in:[25,45,1014,6,110,0], out:[26,43]},

  // templado húmedo
  {in:[20,70,1010,15,120,30], out:[21,72]},
  {in:[17,75,1009,18,100,40], out:[18,78]},
  {in:[23,65,1011,10,130,20], out:[24,67]},

  // frío seco
  {in:[5,30,1020,12,300,0], out:[6,28]},
  {in:[2,25,1022,15,280,0], out:[3,23]},
  {in:[8,35,1019,10,320,0], out:[9,33]},

  // frío húmedo
  {in:[5,85,1005,18,270,70], out:[6,88]},
  {in:[0,95,1002,22,290,90], out:[1,97]},
  {in:[10,80,1007,20,250,60], out:[11,83]},

  // extremos
  {in:[40,20,1015,5,200,0], out:[41,18]},   // ola de calor
  {in:[-5,90,1000,25,0,100], out:[-4,93]},  // tormenta polar
  {in:[15,60,1012,100,180,10], out:[16,58]}, // viento extremo
];

function makeTrainingSet(raw){
  return raw.map(row => {
    return {
      input:[
        normalize(row.in[0],norm.temp),
        normalize(row.in[1],norm.hum),
        normalize(row.in[2],norm.pres),
        normalize(row.in[3],norm.wind),
        normalize(row.in[4],norm.dir),
        normalize(row.in[5],norm.rain)
      ],
      output:[
        normalize(row.out[0],norm.outTemp),
        normalize(row.out[1],norm.outHum)
      ]
    };
  });
}

window.onload = () => {
  // Crear red neuronal
  network = new brain.NeuralNetwork({
    hiddenLayers: [16,12]
  });

  // DOM
  const statusEl = document.getElementById('status');
  const outTempEl = document.getElementById('outTemp');
  const outHumEl = document.getElementById('outHum');

  // Canvas
  canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 300;
  ctx = canvas.getContext("2d");
  document.querySelector(".wrap").appendChild(canvas);

  // Inicializar nubes
  for(let i=0;i<5;i++){
    clouds.push({x:Math.random()*canvas.width,y:50+Math.random()*80,speed:0.3+Math.random()*0.4});
  }

  // Botón entrenar
  document.getElementById('trainBtn').onclick = () => {
    const trainingData = makeTrainingSet(trainingRaw);
    const stats = network.train(trainingData,{
      iterations:12000,   // más entrenamiento
      errorThresh:0.003,  // menor error
      learningRate:0.01   // estable
    });
    statusEl.textContent = "Entrenada (error: " + stats.error.toFixed(4) + ")";
  };

  // Botón predecir
  document.getElementById('predBtn').onclick = () => {
    if (!network) {
      alert("Primero entrena la red antes de predecir.");
      return;
    }

    const t = parseFloat(document.getElementById('temp').value);
    const h = parseFloat(document.getElementById('hum').value);
    const p = parseFloat(document.getElementById('pres').value);
    const w = parseFloat(document.getElementById('wind').value);
    const d = parseFloat(document.getElementById('dir').value);
    const r = parseFloat(document.getElementById('rain').value);

    const inp = [
      normalize(t,norm.temp),
      normalize(h,norm.hum),
      normalize(p,norm.pres),
      normalize(w,norm.wind),
      normalize(d,norm.dir),
      normalize(r,norm.rain)
    ];

    const out = network.run(inp);
    if (!out) {
      alert("La red aún no tiene resultados. Entrénala primero.");
      return;
    }

    const temp24 = denormalize(out[0], norm.outTemp);
    const hum24  = denormalize(out[1], norm.outHum);

    outTempEl.textContent = temp24.toFixed(1) + " °C";
    outHumEl.textContent  = hum24.toFixed(0) + " %";

    // Activar relámpagos si condiciones extremas
    if(hum24 > 85 && r > 70){
      lightning.active = true;
      lightning.timer = Date.now();
    } else {
      lightning.active = false;
    }
  };

  // Entrenar al inicio
  const trainingData = makeTrainingSet(trainingRaw);
  network.train(trainingData, {iterations:4000, errorThresh:0.01, learningRate:0.02});
  statusEl.textContent = "Pre-entrenada (lista)";

  // Animación
  function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // valores actuales (default si no se ha predecido)
    let temp = parseFloat(outTempEl.textContent) || 20;
    let hum  = parseFloat(outHumEl.textContent) || 50;

    drawSun(temp);
    drawClouds(hum);
    drawRain(hum);
    drawLightning();

    requestAnimationFrame(animate);
  }
  animate();
};

// ---------- Dibujo ----------

function drawSun(temp){
  const sunY = 150 - (temp / 45) * 100;
  const gradient = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 40);
  gradient.addColorStop(0, "yellow");
  gradient.addColorStop(1, "orange");

  ctx.beginPath();
  ctx.arc(sunX, sunY, 35, 0, 2 * Math.PI);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 200, 0, 0.5)";
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6 + Date.now() / 1000;
    const x1 = sunX + Math.cos(angle) * 45;
    const y1 = sunY + Math.sin(angle) * 45;
    const x2 = sunX + Math.cos(angle) * 65;
    const y2 = sunY + Math.sin(angle) * 65;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawClouds(hum){
  clouds.forEach(cloud=>{
    const cloudY = cloud.y + (1 - hum/100)*30;
    const gradient = ctx.createLinearGradient(cloud.x-40, cloudY-20, cloud.x+40, cloudY+20);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(1, "rgba(200,200,200,0.8)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cloud.x, cloudY, 30, 0, 2*Math.PI);
    ctx.arc(cloud.x+30, cloudY+10, 30, 0, 2*Math.PI);
    ctx.arc(cloud.x-30, cloudY+10, 30, 0, 2*Math.PI);
    ctx.arc(cloud.x, cloudY+20, 30, 0, 2*Math.PI);
    ctx.fill();

    cloud.x += cloud.speed;
    if(cloud.x > canvas.width+60) cloud.x = -60;
  });
}

function drawRain(hum){
  if(hum < 70) return;

  if(raindrops.length < 150){
    raindrops.push({
      x: Math.random()*canvas.width,
      y: 0,
      speed: 4+Math.random()*4,
      len: 10+Math.random()*15
    });
  }

  ctx.strokeStyle = "rgba(0,191,255,0.7)";
  ctx.lineWidth = 2;
  raindrops.forEach((drop,i)=>{
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x, drop.y + drop.len);
    ctx.stroke();

    drop.y += drop.speed;
    if(drop.y > canvas.height){
      ctx.beginPath();
      ctx.arc(drop.x, canvas.height-2, 3, 0, 2*Math.PI);
      ctx.strokeStyle = "rgba(0,191,255,0.3)";
      ctx.stroke();
      raindrops.splice(i,1);
    }
  });
}

function drawLightning(){
  if(lightning.active){
    const now = Date.now();
    if(now - lightning.timer < 200){
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    if(now - lightning.timer > 2000){
      lightning.timer = now;
    }
  }
}
