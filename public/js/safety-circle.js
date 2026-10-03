/**
 * SafeSense IoT - Safety Wave Circle Radar Controller
 * Dynamic 360° Circular Radar & Animated Safety Wave Visualization
 */

class SafetyCircleController {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.angle = 0;
    this.isAnimRunning = false;

    this.sensorData = {
      temp: { name: 'Temp', value: 26.4, status: 'safe', pct: 0.4 },
      hum: { name: 'Humidity', value: 52.0, status: 'safe', pct: 0.5 },
      gas: { name: 'Gas', value: 310, status: 'safe', pct: 0.3 },
      smoke: { name: 'Smoke', value: 85, status: 'safe', pct: 0.2 },
      flame: { name: 'Flame', value: 'FALSE', status: 'safe', pct: 0 }
    };

    this.initCanvas();
  }

  initCanvas() {
    setTimeout(() => {
      this.canvas = document.getElementById("radarCanvas");
      if (this.canvas) {
        this.ctx = this.canvas.getContext("2d");
        this.startAnimation();
      }
    }, 400);
  }

  startAnimation() {
    if (this.isAnimRunning) return;
    this.isAnimRunning = true;

    const renderLoop = () => {
      if (this.ctx && this.canvas) {
        this.drawRadar();
      }
      this.angle += 0.03;
      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
  }

  drawRadar() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 160;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Concentric Circles
    for (let r = 40; r <= radius; r += 40) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2. Draw Crosshair Lines
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.stroke();

    // 3. Draw Rotating Radar Sweep Line
    const sweepX = cx + Math.cos(this.angle) * radius;
    const sweepY = cy + Math.sin(this.angle) * radius;

    const grad = ctx.createLinearGradient(cx, cy, sweepX, sweepY);
    grad.addColorStop(0, "rgba(16, 185, 129, 0)");
    grad.addColorStop(1, "rgba(16, 185, 129, 0.4)");

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, this.angle - 0.4, this.angle);
    ctx.lineTo(cx, cy);
    ctx.fillStyle = grad;
    ctx.fill();

    // 4. Draw Sensor Nodes along Circle Circumference
    const sensors = Object.values(this.sensorData);
    const stepAngle = (Math.PI * 2) / sensors.length;

    sensors.forEach((s, idx) => {
      const a = idx * stepAngle - Math.PI / 2;
      const nodeR = 60 + (s.pct * 80);
      const nx = cx + Math.cos(a) * nodeR;
      const ny = cy + Math.sin(a) * nodeR;

      let color = "#10b981";
      if (s.status === 'warning') color = "#f59e0b";
      if (s.status === 'unsafe') color = "#ef4444";

      // Connecting line from center
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = `${color}44`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Sensor Dot
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Outer Pulse Ring around node
      ctx.beginPath();
      ctx.arc(nx, ny, 12 + Math.sin(this.angle * 2) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}88`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  updateData(nodesData, safetySummary, thresholds) {
    const n1 = nodesData["ESP32-Node-01"]?.current_data || {};
    const n2 = nodesData["ESP32-Node-02"]?.current_data || {};

    const tempVal = n1.temperature || 26.4;
    const humVal = n1.humidity || 52.0;
    const gasVal = Math.max(n1.gas || 0, n2.gas || 0) || 310;
    const smokeVal = Math.max(n1.smoke || 0, n2.smoke || 0) || 85;
    const flameVal = (n1.flame === true || n2.flame === true);

    const th = thresholds || {
      gas: { safe_max: 450, unsafe_min: 650 },
      temperature: { safe_max: 32, unsafe_min: 40 },
      humidity: { safe_max: 70 },
      smoke: { safe_max: 200, unsafe_min: 400 }
    };

    // Calculate dynamic Safety Score (0 - 100)
    let score = 100;
    if (gasVal > th.gas.safe_max) score -= Math.min(40, (gasVal - th.gas.safe_max) / 10);
    if (tempVal > th.temperature.safe_max) score -= Math.min(30, (tempVal - th.temperature.safe_max) * 3);
    if (smokeVal > th.smoke.safe_max) score -= Math.min(30, (smokeVal - th.smoke.safe_max) / 10);
    if (flameVal) score -= 80;

    score = Math.max(5, Math.min(100, Math.round(score)));

    // Update center box
    const scoreValEl = document.getElementById("radarScoreVal");
    const centerBox = document.getElementById("radarCenterBox");

    if (scoreValEl) scoreValEl.textContent = score;

    if (centerBox) {
      if (score >= 80) {
        centerBox.style.borderColor = "var(--safe-green)";
        centerBox.style.boxShadow = "var(--safe-green-glow)";
        scoreValEl.style.color = "var(--safe-green)";
      } else if (score >= 50) {
        centerBox.style.borderColor = "var(--warning-yellow)";
        centerBox.style.boxShadow = "var(--warning-yellow-glow)";
        scoreValEl.style.color = "var(--warning-yellow)";
      } else {
        centerBox.style.borderColor = "var(--unsafe-red)";
        centerBox.style.boxShadow = "var(--unsafe-red-glow)";
        scoreValEl.style.color = "var(--unsafe-red)";
      }
    }

    // Update sensor object statuses
    this.sensorData.temp.value = tempVal;
    this.sensorData.temp.pct = Math.min(1, tempVal / 50);
    this.sensorData.temp.status = tempVal >= th.temperature.unsafe_min ? 'unsafe' : (tempVal >= th.temperature.safe_max ? 'warning' : 'safe');

    this.sensorData.hum.value = humVal;
    this.sensorData.hum.pct = Math.min(1, humVal / 100);
    this.sensorData.hum.status = humVal >= th.humidity.safe_max ? 'warning' : 'safe';

    this.sensorData.gas.value = gasVal;
    this.sensorData.gas.pct = Math.min(1, gasVal / 1000);
    this.sensorData.gas.status = gasVal >= th.gas.unsafe_min ? 'unsafe' : (gasVal >= th.gas.safe_max ? 'warning' : 'safe');

    this.sensorData.smoke.value = smokeVal;
    this.sensorData.smoke.pct = Math.min(1, smokeVal / 500);
    this.sensorData.smoke.status = smokeVal >= th.smoke.unsafe_min ? 'unsafe' : (smokeVal >= th.smoke.safe_max ? 'warning' : 'safe');

    this.sensorData.flame.value = flameVal ? 'FIRE' : 'SAFE';
    this.sensorData.flame.pct = flameVal ? 1 : 0;
    this.sensorData.flame.status = flameVal ? 'unsafe' : 'safe';

    // Render readouts grid
    const readoutsContainer = document.getElementById("radarReadoutsGrid");
    if (readoutsContainer) {
      readoutsContainer.innerHTML = Object.values(this.sensorData).map(s => `
        <div class="glass-card" style="padding: 1rem; border-left: 3px solid var(--${s.status === 'safe' ? 'safe-green' : (s.status === 'warning' ? 'warning-yellow' : 'unsafe-red')});">
          <div style="font-size: 0.75rem; color: var(--text-muted);">${s.name.toUpperCase()} RADIAL</div>
          <div style="font-size: 1.25rem; font-weight: 700; margin: 0.25rem 0;">${s.value}</div>
          <span class="status-badge ${s.status}">${s.status.toUpperCase()}</span>
        </div>
      `).join('');
    }
  }
}

const safetyCircle = new SafetyCircleController();
