/**
 * SafeSense IoT - Live Wave Monitor Controller
 * Real-time scrolling waveform charts with threshold reference lines & time filters
 */

class WaveMonitorController {
  constructor() {
    this.chartGas = null;
    this.chartTemp = null;
    this.currentTimeFilter = '1m';
    this.maxPoints = 40;

    this.gasBuffer = [];
    this.tempBuffer = [];
    this.timestamps = [];

    this.initWaveCharts();
  }

  initWaveCharts() {
    setTimeout(() => {
      const elGas = document.getElementById("waveChartGas");
      const elTemp = document.getElementById("waveChartTemp");

      if (elGas) {
        this.chartGas = new Chart(elGas.getContext('2d'), {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Actual Gas Reading (PPM)',
                data: [],
                borderColor: '#ffffff',
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#06b6d4',
                zIndex: 10
              },
              {
                label: 'Safe Threshold (450 PPM)',
                data: [],
                borderColor: '#10b981',
                borderWidth: 2,
                borderDash: [6, 6],
                pointRadius: 0,
                fill: false
              },
              {
                label: 'Warning Threshold (650 PPM)',
                data: [],
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderDash: [6, 6],
                pointRadius: 0,
                fill: false
              },
              {
                label: 'Unsafe Threshold (> 650 PPM)',
                data: [],
                borderColor: '#ef4444',
                borderWidth: 2,
                borderDash: [4, 4],
                pointRadius: 0,
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
              x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#9ca3af', font: { size: 10 } }
              },
              y: {
                min: 0,
                max: 1000,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#9ca3af' }
              }
            },
            plugins: {
              legend: { display: false }
            }
          }
        });
      }

      if (elTemp) {
        this.chartTemp = new Chart(elTemp.getContext('2d'), {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Actual Temperature (°C)',
                data: [],
                borderColor: '#3b82f6',
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#3b82f6'
              },
              {
                label: 'Safe Max (32°C)',
                data: [],
                borderColor: '#10b981',
                borderWidth: 2,
                borderDash: [6, 6],
                pointRadius: 0
              },
              {
                label: 'Unsafe Threshold (40°C)',
                data: [],
                borderColor: '#ef4444',
                borderWidth: 2,
                borderDash: [4, 4],
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
              x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { size: 10 } } },
              y: { min: 10, max: 60, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
            },
            plugins: { legend: { display: false } }
          }
        });
      }

    }, 300);
  }

  setTimeFilter(filter, btnEl) {
    this.currentTimeFilter = filter;
    
    // Update button styles
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    if (filter === '1m') this.maxPoints = 40;
    else if (filter === '5m') this.maxPoints = 80;
    else if (filter === '30m') this.maxPoints = 120;
    else this.maxPoints = 150;
  }

  updateWaveData(historyData, thresholds) {
    if (!historyData || !historyData["ESP32-Node-02"]) return;

    const packets = historyData["ESP32-Node-02"].slice(-this.maxPoints);
    const th = thresholds || {
      gas: { safe_max: 450, unsafe_min: 650 },
      temperature: { safe_max: 32, unsafe_min: 40 }
    };

    const labels = packets.map(p => {
      const d = new Date(p.timestamp);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    });

    const gasValues = packets.map(p => p.gas);
    const tempValues = packets.map(p => p.temperature);

    const safeGasLine = Array(packets.length).fill(th.gas.safe_max);
    const warnGasLine = Array(packets.length).fill(th.gas.unsafe_min);
    const unsafeGasLine = Array(packets.length).fill(th.gas.unsafe_min + 50);

    const safeTempLine = Array(packets.length).fill(th.temperature.safe_max);
    const unsafeTempLine = Array(packets.length).fill(th.temperature.unsafe_min);

    // Update Gas Chart
    if (this.chartGas) {
      this.chartGas.data.labels = labels;
      this.chartGas.data.datasets[0].data = gasValues;
      this.chartGas.data.datasets[1].data = safeGasLine;
      this.chartGas.data.datasets[2].data = warnGasLine;
      this.chartGas.data.datasets[3].data = unsafeGasLine;

      // Dynamic line color if unsafe breached
      const lastGas = gasValues[gasValues.length - 1] || 0;
      if (lastGas >= th.gas.unsafe_min) {
        this.chartGas.data.datasets[0].borderColor = '#ef4444';
      } else if (lastGas >= th.gas.safe_max) {
        this.chartGas.data.datasets[0].borderColor = '#f59e0b';
      } else {
        this.chartGas.data.datasets[0].borderColor = '#06b6d4';
      }

      this.chartGas.update('none');
    }

    // Update Temp Chart
    if (this.chartTemp) {
      this.chartTemp.data.labels = labels;
      this.chartTemp.data.datasets[0].data = tempValues;
      this.chartTemp.data.datasets[1].data = safeTempLine;
      this.chartTemp.data.datasets[2].data = unsafeTempLine;
      this.chartTemp.update('none');
    }
  }
}

const waveMonitor = new WaveMonitorController();
