/**
 * SafeSense IoT - Dashboard Controller
 * Manages sensor cards, central status panel, progress bars, and mini wave graphs
 */

class DashboardController {
  constructor() {
    this.charts = {};
    this.miniChartData = {
      temp: Array(15).fill(26.0),
      hum: Array(15).fill(52.0),
      gas: Array(15).fill(310),
      flame: Array(15).fill(0)
    };
    
    this.initMiniCharts();
  }

  // Initialize Sparkline Charts for Sensor Cards
  initMiniCharts() {
    const chartConfig = (color, label) => ({
      type: 'line',
      data: {
        labels: Array(15).fill(''),
        datasets: [{
          label: label,
          data: Array(15).fill(0),
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });

    setTimeout(() => {
      const elTemp = document.getElementById('miniChartTemp');
      const elHum = document.getElementById('miniChartHum');
      const elGas = document.getElementById('miniChartGas');
      const elFlame = document.getElementById('miniChartFlame');

      if (elTemp) this.charts.temp = new Chart(elTemp.getContext('2d'), chartConfig('#10b981', 'Temp'));
      if (elHum) this.charts.hum = new Chart(elHum.getContext('2d'), chartConfig('#06b6d4', 'Humidity'));
      if (elGas) this.charts.gas = new Chart(elGas.getContext('2d'), chartConfig('#f59e0b', 'Gas'));
      if (elFlame) this.charts.flame = new Chart(elFlame.getContext('2d'), chartConfig('#ef4444', 'Flame'));
    }, 200);
  }

  // Update Mini Sparkline Chart
  updateMiniChart(key, val) {
    if (!this.miniChartData[key] || !this.charts[key]) return;

    this.miniChartData[key].push(val);
    if (this.miniChartData[key].length > 15) this.miniChartData[key].shift();

    this.charts[key].data.datasets[0].data = [...this.miniChartData[key]];
    this.charts[key].update('none');
  }

  // Render Telemetry Packet & System Safety Summary
  render(nodesData, safetySummary, thresholds) {
    // Determine representative node values (e.g. Node-01 or highest)
    const node1 = nodesData["ESP32-Node-01"]?.current_data || {};
    const node2 = nodesData["ESP32-Node-02"]?.current_data || {};

    const tempVal = node1.temperature || 26.4;
    const humVal = node1.humidity || 52.0;
    const gasVal = Math.max(node1.gas || 0, node2.gas || 0) || 310;
    const flameVal = (node1.flame === true || node2.flame === true);

    const th = thresholds || {
      temperature: { safe_max: 32, unsafe_min: 40 },
      humidity: { safe_max: 70, unsafe_min: 85 },
      gas: { safe_max: 450, unsafe_min: 650 }
    };

    // 1. TEMPERATURE CARD
    const elTempVal = document.getElementById("valTemp");
    if (elTempVal) elTempVal.textContent = tempVal.toFixed(1);
    
    let tempStatus = "safe";
    if (tempVal >= th.temperature.unsafe_min) tempStatus = "unsafe";
    else if (tempVal >= th.temperature.safe_max) tempStatus = "warning";

    this.updateCardBadge("badgeTemp", tempStatus);
    this.updateProgressBar("progressTemp", (tempVal / 50) * 100, tempStatus);
    this.updateMiniChart('temp', tempVal);

    // 2. HUMIDITY CARD
    const elHumVal = document.getElementById("valHum");
    if (elHumVal) elHumVal.textContent = humVal.toFixed(1);

    let humStatus = "safe";
    if (humVal >= th.humidity.unsafe_min) humStatus = "unsafe";
    else if (humVal >= th.humidity.safe_max) humStatus = "warning";

    this.updateCardBadge("badgeHum", humStatus);
    this.updateProgressBar("progressHum", (humVal / 100) * 100, humStatus);
    this.updateMiniChart('hum', humVal);

    // 3. GAS CARD
    const elGasVal = document.getElementById("valGas");
    if (elGasVal) elGasVal.textContent = gasVal;

    let gasStatus = "safe";
    if (gasVal >= th.gas.unsafe_min) gasStatus = "unsafe";
    else if (gasVal >= th.gas.safe_max) gasStatus = "warning";

    this.updateCardBadge("badgeGas", gasStatus);
    this.updateProgressBar("progressGas", (gasVal / 1000) * 100, gasStatus);
    this.updateMiniChart('gas', gasVal);

    // 4. FLAME CARD
    const elFlameVal = document.getElementById("valFlame");
    let flameStatus = flameVal ? "unsafe" : "safe";
    if (elFlameVal) {
      elFlameVal.textContent = flameVal ? "FIRE DETECTED!" : "NO FLAME";
      elFlameVal.style.color = flameVal ? "var(--unsafe-red)" : "white";
    }

    this.updateCardBadge("badgeFlame", flameStatus);
    this.updateProgressBar("progressFlame", flameVal ? 100 : 0, flameStatus);
    this.updateMiniChart('flame', flameVal ? 1 : 0);

    // 5. CENTRAL SAFETY STATUS PANEL
    this.updateCentralPanel(safetySummary, { tempStatus, humStatus, gasStatus, flameStatus });
  }

  updateCardBadge(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `status-badge ${status}`;
    el.textContent = status.toUpperCase();
  }

  updateProgressBar(id, pct, status) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    if (status === 'safe') el.style.backgroundColor = 'var(--safe-green)';
    else if (status === 'warning') el.style.backgroundColor = 'var(--warning-yellow)';
    else el.style.backgroundColor = 'var(--unsafe-red)';
  }

  updateCentralPanel(safetySummary, statuses) {
    const panel = document.getElementById("centralSafetyPanel");
    const icon = document.getElementById("statusBigIcon");
    const title = document.getElementById("statusTitle");
    const sub = document.getElementById("statusSubtitle");
    const chips = document.getElementById("statusChips");
    const ackBtn = document.getElementById("ackAlertBtn");

    if (!panel) return;

    const overallStatus = safetySummary.status; // SAFE, WARNING, UNSAFE

    if (overallStatus === "SAFE") {
      panel.className = "safety-status-panel status-safe";
      if (icon) icon.textContent = "✓";
      if (title) title.textContent = "✓ SYSTEM SAFE";
      if (sub) sub.textContent = "All environmental parameter readings are within safe calibrated limits.";
      if (ackBtn) ackBtn.style.display = "none";

    } else if (overallStatus === "WARNING") {
      panel.className = "safety-status-panel status-warning";
      if (icon) icon.textContent = "⚠";
      if (title) title.textContent = "⚠ WARNING DETECTED";
      if (sub) sub.textContent = "One or more sensors have breached safe warning thresholds. Monitor readings closely.";
      if (ackBtn) ackBtn.style.display = "none";

    } else if (overallStatus === "UNSAFE") {
      panel.className = "safety-status-panel status-unsafe";
      if (icon) icon.textContent = "🚨";
      if (title) title.textContent = "🚨 UNSAFE CONDITION DETECTED";
      
      const trg = safetySummary.triggers[0];
      if (sub && trg) {
        sub.textContent = `${trg.sensor} level exceeded safe threshold on ${trg.node_id}! Reading: ${trg.value}`;
      } else if (sub) {
        sub.textContent = "Dangerous environmental conditions detected across IoT sensor nodes!";
      }

      if (ackBtn) ackBtn.style.display = "inline-flex";

      // Trigger full emergency protocol if not acknowledged
      if (trg && (!emergencyEngine.currentEmergency || emergencyEngine.currentEmergency.sensor !== trg.sensor)) {
        emergencyEngine.triggerEmergency(trg);
      }
    }

    // Render chips breakdown
    if (chips) {
      chips.innerHTML = `
        <span class="chip chip-${statuses.tempStatus}">Temp: ${statuses.tempStatus.toUpperCase()}</span>
        <span class="chip chip-${statuses.humStatus}">Humidity: ${statuses.humStatus.toUpperCase()}</span>
        <span class="chip chip-${statuses.gasStatus}">Gas: ${statuses.gasStatus.toUpperCase()}</span>
        <span class="chip chip-${statuses.flameStatus}">Flame: ${statuses.flameStatus.toUpperCase()}</span>
      `;
    }
  }
}

const dashboardController = new DashboardController();
