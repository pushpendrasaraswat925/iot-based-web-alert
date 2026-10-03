/**
 * SafeSense IoT - Client-Side Data Engine & IoT Telemetry Simulator
 * Standalone data provider with WebSocket/Backend auto-detection, local persistence,
 * real-time waveform generator, safety status evaluator, and AI rule engine.
 */

class DataEngine {
  constructor() {
    this.subscribers = [];
    this.demoMode = true;
    this.ws = null;
    this.isConnectedToWs = false;

    // Default Safety Thresholds (Editable & Persisted in localStorage)
    const savedThresholds = localStorage.getItem('safesense_thresholds');
    this.thresholds = savedThresholds ? JSON.parse(savedThresholds) : {
      temperature: { safe_max: 32, warning_max: 40, unsafe_min: 40, unit: '°C' },
      humidity: { safe_max: 70, warning_max: 85, unsafe_min: 85, unit: '%' },
      gas: { safe_max: 450, warning_max: 650, unsafe_min: 650, unit: 'PPM' },
      smoke: { safe_max: 200, warning_max: 400, unsafe_min: 400, unit: 'PPM' },
      flame: { safe_val: false, unsafe_val: true, unit: 'status' }
    };

    // Sensor Nodes State
    this.nodes = {
      "ESP32-Node-01": {
        node_id: "ESP32-Node-01",
        name: "Main Control Room Node",
        mcu: "ESP32-WROOM-32",
        wifi_status: "Connected",
        mqtt_status: "Connected",
        rssi: -62,
        status: "SAFE",
        sensors: ["DHT22", "MQ2 Gas", "IR Flame"],
        last_seen: new Date().toISOString(),
        current_data: { temperature: 26.4, humidity: 52.0, gas: 310, smoke: 85, flame: false }
      },
      "ESP32-Node-02": {
        node_id: "ESP32-Node-02",
        name: "Chemical Storage Node",
        mcu: "ESP32-S3",
        wifi_status: "Connected",
        mqtt_status: "Connected",
        rssi: -68,
        status: "SAFE",
        sensors: ["DHT22", "MQ9 Gas", "IR Flame"],
        last_seen: new Date().toISOString(),
        current_data: { temperature: 27.1, humidity: 49.5, gas: 340, smoke: 92, flame: false }
      },
      "ESP32-Node-03": {
        node_id: "ESP32-Node-03",
        name: "Server Rack Bay Node",
        mcu: "ESP32-C3",
        wifi_status: "Connected",
        mqtt_status: "Connected",
        rssi: -58,
        status: "SAFE",
        sensors: ["DHT22", "MQ2 Gas", "Smoke Sensor"],
        last_seen: new Date().toISOString(),
        current_data: { temperature: 25.8, humidity: 48.0, gas: 290, smoke: 70, flame: false }
      }
    };

    // Historical telemetry buffer for wave monitors (120 points)
    this.history = {
      "ESP32-Node-01": [],
      "ESP32-Node-02": [],
      "ESP32-Node-03": []
    };

    // Alert Logs
    const savedAlerts = localStorage.getItem('safesense_alerts');
    this.alerts = savedAlerts ? JSON.parse(savedAlerts) : [
      {
        id: "ALT-1001",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        node_id: "ESP32-Node-02",
        sensor: "Gas (MQ9)",
        reading: "490 PPM",
        threshold: "450 PPM",
        status: "WARNING",
        duration: "45 sec",
        acknowledged: true,
        ack_by: "Operator"
      }
    ];

    // Notification Items
    const savedNotifs = localStorage.getItem('safesense_notifs');
    this.notifications = savedNotifs ? JSON.parse(savedNotifs) : [
      {
        id: "NTF-1",
        title: "🟢 System Operating Safely",
        message: "All 3 ESP32 nodes connected via MQTT telemetry bridge.",
        severity: "SAFE",
        read: false,
        timestamp: new Date().toISOString()
      }
    ];

    // Seed Telemetry Waveform History
    this.seedHistory();

    // Start Simulation Timer (1.5 sec telemetry pulse)
    this.startSimulation();

    // Try WebSocket connection to backend if available
    this.initWebSocketBridge();
  }

  seedHistory() {
    const nodes = Object.keys(this.nodes);
    const now = Date.now();

    nodes.forEach(nodeId => {
      this.history[nodeId] = [];
      for (let i = 60; i >= 0; i--) {
        const ts = new Date(now - i * 3000).toISOString();
        const temp = 25 + Math.sin(i / 6) * 3 + (Math.random() * 0.4);
        const hum = 50 + Math.cos(i / 5) * 4 + (Math.random() * 0.8);
        const gas = 310 + Math.sin(i / 4) * 35 + (Math.random() * 15);
        const smoke = 80 + Math.cos(i / 7) * 10 + (Math.random() * 5);

        this.history[nodeId].push({
          node_id: nodeId,
          timestamp: ts,
          temperature: parseFloat(temp.toFixed(1)),
          humidity: parseFloat(hum.toFixed(1)),
          gas: Math.round(gas),
          smoke: Math.round(smoke),
          flame: false
        });
      }
    });
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    // Immediate initial push
    callback(this.getPayload());
  }

  notifySubscribers() {
    const payload = this.getPayload();
    this.subscribers.forEach(cb => cb(payload));
  }

  getPayload() {
    const safetySummary = this.evaluateSafety();
    return {
      nodes: this.nodes,
      safety_summary: safetySummary,
      thresholds: this.thresholds,
      history: this.history,
      alerts: this.alerts,
      notifications: this.notifications,
      is_live: this.isConnectedToWs
    };
  }

  evaluateSafety() {
    let overallStatus = "SAFE";
    const triggers = [];

    Object.values(this.nodes).forEach(node => {
      const data = node.current_data;
      if (!data) return;

      // Flame
      if (data.flame === true) {
        overallStatus = "UNSAFE";
        triggers.push({ node_id: node.node_id, sensor: "Flame", value: "FIRE DETECTED", threshold: "No Flame" });
      }

      // Gas
      if (data.gas >= this.thresholds.gas.unsafe_min) {
        overallStatus = "UNSAFE";
        triggers.push({ node_id: node.node_id, sensor: "Gas", value: `${data.gas} PPM`, threshold: `${this.thresholds.gas.unsafe_min} PPM` });
      } else if (data.gas >= this.thresholds.gas.safe_max && overallStatus !== "UNSAFE") {
        overallStatus = "WARNING";
        triggers.push({ node_id: node.node_id, sensor: "Gas", value: `${data.gas} PPM`, threshold: `${this.thresholds.gas.safe_max} PPM` });
      }

      // Temperature
      if (data.temperature >= this.thresholds.temperature.unsafe_min) {
        overallStatus = "UNSAFE";
        triggers.push({ node_id: node.node_id, sensor: "Temperature", value: `${data.temperature}°C`, threshold: `${this.thresholds.temperature.unsafe_min}°C` });
      } else if (data.temperature >= this.thresholds.temperature.safe_max && overallStatus !== "UNSAFE") {
        overallStatus = "WARNING";
        triggers.push({ node_id: node.node_id, sensor: "Temperature", value: `${data.temperature}°C`, threshold: `${this.thresholds.temperature.safe_max}°C` });
      }

      // Smoke
      if (data.smoke >= this.thresholds.smoke.unsafe_min) {
        overallStatus = "UNSAFE";
        triggers.push({ node_id: node.node_id, sensor: "Smoke", value: `${data.smoke} PPM`, threshold: `${this.thresholds.smoke.unsafe_min} PPM` });
      }
    });

    return {
      status: overallStatus,
      triggers: triggers,
      primary_trigger: triggers[0] || null,
      active_nodes_count: Object.keys(this.nodes).length,
      timestamp: new Date().toISOString()
    };
  }

  startSimulation() {
    setInterval(() => {
      if (this.isConnectedToWs) return; // If connected to WebSocket server, skip simulation

      const now = new Date().toISOString();
      Object.keys(this.nodes).forEach((nodeId, idx) => {
        const node = this.nodes[nodeId];
        const data = node.current_data;

        // Skip simulation for a node if temporary spike mode is active
        if (node.spike_ticks && node.spike_ticks > 0) {
          node.spike_ticks--;
          if (node.spike_ticks === 0) {
            data.gas = 320;
            data.flame = false;
            data.temperature = 26.5;
          }
        } else {
          // Normal micro fluctuations
          data.temperature = parseFloat(Math.max(18, Math.min(48, data.temperature + (Math.random() * 0.4 - 0.2))).toFixed(1));
          data.humidity = parseFloat(Math.max(30, Math.min(90, data.humidity + (Math.random() * 0.6 - 0.3))).toFixed(1));
          data.gas = Math.round(Math.max(150, Math.min(900, data.gas + (Math.random() * 10 - 5))));
          data.smoke = Math.round(Math.max(40, Math.min(500, data.smoke + (Math.random() * 4 - 2))));
        }

        node.last_seen = now;

        // Append to history buffer
        if (!this.history[nodeId]) this.history[nodeId] = [];
        this.history[nodeId].push({
          node_id: nodeId,
          timestamp: now,
          temperature: data.temperature,
          humidity: data.humidity,
          gas: data.gas,
          smoke: data.smoke,
          flame: data.flame
        });

        if (this.history[nodeId].length > 120) {
          this.history[nodeId].shift();
        }
      });

      // Check if a new alert log needs to be created
      const summary = this.evaluateSafety();
      if (summary.status === "UNSAFE" && summary.primary_trigger) {
        const trg = summary.primary_trigger;
        const exists = this.alerts.find(a => a.node_id === trg.node_id && a.sensor.includes(trg.sensor) && !a.acknowledged);
        if (!exists) {
          const newAlert = {
            id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: now,
            node_id: trg.node_id,
            sensor: trg.sensor,
            reading: `${trg.value}`,
            threshold: `${trg.threshold}`,
            status: "UNSAFE",
            duration: "Active",
            acknowledged: false
          };
          this.alerts.unshift(newAlert);
          this.saveAlerts();

          // Add notification
          this.addNotification({
            id: `NTF-${Date.now()}`,
            title: `🚨 UNSAFE ${trg.sensor.toUpperCase()} DETECTED`,
            message: `Node ${trg.node_id} reported ${trg.value} exceeding threshold ${trg.threshold}.`,
            severity: "UNSAFE",
            read: false,
            timestamp: now
          });
        }
      }

      this.notifySubscribers();
    }, 1500);
  }

  injectDemoSpike(type = 'gas') {
    const node = this.nodes["ESP32-Node-02"];
    if (!node) return;

    node.spike_ticks = 12; // Spike active for 18 seconds (12 x 1.5s)
    if (type === 'gas') {
      node.current_data.gas = 785;
    } else if (type === 'fire' || type === 'flame') {
      node.current_data.flame = true;
    } else if (type === 'temp') {
      node.current_data.temperature = 42.5;
    }

    this.notifySubscribers();
  }

  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    localStorage.setItem('safesense_thresholds', JSON.stringify(this.thresholds));
    this.notifySubscribers();
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.ack_by = "Dashboard Operator";
      this.saveAlerts();
      this.notifySubscribers();
    }
  }

  saveAlerts() {
    localStorage.setItem('safesense_alerts', JSON.stringify(this.alerts.slice(0, 30)));
  }

  addNotification(notif) {
    this.notifications.unshift(notif);
    localStorage.setItem('safesense_notifs', JSON.stringify(this.notifications.slice(0, 20)));
  }

  markNotifsRead() {
    this.notifications.forEach(n => n.read = true);
    localStorage.setItem('safesense_notifs', JSON.stringify(this.notifications.slice(0, 20)));
    this.notifySubscribers();
  }

  initWebSocketBridge() {
    try {
      if (window.location.protocol === 'file:') return; // Skip WS if running via file://
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("Connected to SafeSense Backend Telemetry Stream.");
        this.isConnectedToWs = true;
        this.notifySubscribers();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "TELEMETRY_UPDATE") {
            if (data.nodes) this.nodes = data.nodes;
            if (data.history) this.history = data.history;
            this.notifySubscribers();
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      this.ws.onclose = () => {
        this.isConnectedToWs = false;
        console.warn("WebSocket disconnected. Running in client-side telemetry mode.");
      };
    } catch (e) {
      this.isConnectedToWs = false;
    }
  }

  // Multi-Level AI Safety Assistant Query Processor (No backend dependency required)
  processAiQuery(level, userQuery) {
    const query = userQuery.toLowerCase();
    const summary = this.evaluateSafety();
    const n1 = this.nodes["ESP32-Node-01"].current_data;
    const n2 = this.nodes["ESP32-Node-02"].current_data;
    const n3 = this.nodes["ESP32-Node-03"].current_data;

    const maxGas = Math.max(n1.gas, n2.gas, n3.gas);
    const maxTemp = Math.max(n1.temperature, n2.temperature, n3.temperature);
    const anyFlame = (n1.flame || n2.flame || n3.flame);

    if (level === 'safety') {
      if (query.includes('safe') || query.includes('status') || query.includes('everything')) {
        if (summary.status === 'SAFE') {
          return `✓ Current system status: SAFE.\n• Temperature: ${maxTemp}°C\n• Humidity: ${n1.humidity}%\n• Gas Level: ${maxGas} PPM (Normal)\n• Flame: Not detected.\nAll 3 ESP32 sensor nodes are transmitting within normal thresholds.`;
        } else if (summary.status === 'WARNING') {
          return `⚠ System status: WARNING DETECTED.\nElevated reading detected on ${summary.primary_trigger?.node_id || 'ESP32 Node'}: ${summary.primary_trigger?.sensor} is ${summary.primary_trigger?.value} (Warning Limit: ${summary.primary_trigger?.threshold}).`;
        } else {
          return `🚨 UNSAFE CONDITION DETECTED!\nEmergency trigger on ${summary.primary_trigger?.node_id}: ${summary.primary_trigger?.sensor} reached ${summary.primary_trigger?.value} (Unsafe Threshold: ${summary.primary_trigger?.threshold}). Please check the location immediately!`;
        }
      }
      return `SafeSense Level 1 Assistant: System overall status is ${summary.status}. Active nodes: 3 ESP32 nodes. Highest Gas: ${maxGas} PPM, Max Temp: ${maxTemp}°C.`;
    }

    if (level === 'sensor') {
      if (query.includes('gas') || query.includes('smoke') || query.includes('mq2') || query.includes('mq9')) {
        return `Sensor Diagnostic (Gas & Smoke):\n• Node-01 (MQ2): ${n1.gas} PPM\n• Node-02 (MQ9): ${n2.gas} PPM\n• Node-03 (MQ2): ${n3.gas} PPM\nConfigured Safe Threshold: ≤ ${this.thresholds.gas.safe_max} PPM\nConfigured Unsafe Threshold: ≥ ${this.thresholds.gas.unsafe_min} PPM`;
      }
      if (query.includes('temp') || query.includes('dht') || query.includes('humidity')) {
        return `Sensor Diagnostic (Temperature & Humidity):\n• Node-01 (DHT22): ${n1.temperature}°C / ${n1.humidity}%\n• Node-02 (DHT22): ${n2.temperature}°C / ${n2.humidity}%\n• Node-03 (DHT22): ${n3.temperature}°C / ${n3.humidity}%\nSafe Temp Limit: ≤ ${this.thresholds.temperature.safe_max}°C`;
      }
      if (query.includes('flame') || query.includes('fire')) {
        return `Sensor Diagnostic (Flame Sensor):\nFlame detection status: ${anyFlame ? '🚨 FIRE DETECTED!' : '✓ SAFE (No flame detected)'}.\nActive Sensors: 3 IR Flame Sensors on ESP32 Nodes.`;
      }
      return `Sensor Assistant: Monitored sensors include MQ2/MQ9 Gas, DHT22 Temp/Humidity, and IR Flame sensors across 3 ESP32 nodes.`;
    }

    if (level === 'wave') {
      if (query.includes('why') && query.includes('red')) {
        if (summary.status === 'UNSAFE') {
          return `Waveform Analysis: The gas waveform line is RED because the current reading (${summary.primary_trigger?.value}) exceeds the configured unsafe threshold (${summary.primary_trigger?.threshold}).`;
        } else {
          return `Waveform Analysis: The graph waveform is currently normal and safe. The green zone represents ≤ ${this.thresholds.gas.safe_max} PPM, yellow zone is warning, and red zone is ≥ ${this.thresholds.gas.unsafe_min} PPM.`;
        }
      }
      if (query.includes('threshold') || query.includes('line') || query.includes('zone')) {
        return `Threshold Reference:\n• Green Line (Safe Limit): ${this.thresholds.gas.safe_max} PPM / ${this.thresholds.temperature.safe_max}°C\n• Yellow Line (Warning Limit): 550 PPM / 36°C\n• Red Line (Unsafe Limit): ${this.thresholds.gas.unsafe_min} PPM / ${this.thresholds.temperature.unsafe_min}°C`;
      }
      return `Wave Analysis Assistant: Waveform visualizer displays continuous scrolling line graphs with reference threshold bands (Green = Safe, Yellow = Warning, Red = Unsafe). Data updates every 1.5 seconds.`;
    }

    return "SafeSense AI Safety Assistant ready to help.";
  }
}

// Global Data Engine Instance
const dataEngine = new DataEngine();
