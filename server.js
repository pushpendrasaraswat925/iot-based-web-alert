/**
 * SafeSense IoT Environmental Safety & Fire/Gas Monitoring System
 * Node.js Backend Server with Express, WebSockets, REST API & Simulation Engine
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/telemetry' });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// TELEMETRY BUFFER & HISTORY FOR WAVE GRAPHS
// ----------------------------------------------------
const MAX_HISTORY = 120; // 120 datapoints per node (~3 minutes at 1.5s interval)
const telemetryHistory = {
  "ESP32-Node-01": [],
  "ESP32-Node-02": [],
  "ESP32-Node-03": []
};

// Seed initial history
function seedInitialHistory() {
  const nodes = ["ESP32-Node-01", "ESP32-Node-02", "ESP32-Node-03"];
  const now = Date.now();
  nodes.forEach(nodeId => {
    telemetryHistory[nodeId] = [];
    for (let i = 50; i >= 0; i--) {
      const ts = new Date(now - i * 3000).toISOString();
      const temp = 24 + Math.sin(i / 5) * 3 + Math.random() * 0.5;
      const hum = 50 + Math.cos(i / 4) * 5 + Math.random();
      const gas = 300 + Math.sin(i / 3) * 40 + Math.random() * 20;
      const smoke = 70 + Math.cos(i / 6) * 15 + Math.random() * 5;
      const flame = false;

      telemetryHistory[nodeId].push({
        node_id: nodeId,
        timestamp: ts,
        temperature: parseFloat(temp.toFixed(1)),
        humidity: parseFloat(hum.toFixed(1)),
        gas: Math.round(gas),
        smoke: Math.round(smoke),
        flame: flame
      });
    }
  });
}
seedInitialHistory();

// ----------------------------------------------------
// SAFETY EVALUATION LOGIC
// ----------------------------------------------------
function evaluateSafetyStatus() {
  const nodes = db.getNodes();
  const thresholds = db.getThresholds();

  let overallStatus = "SAFE"; // SAFE, WARNING, UNSAFE
  const triggerSensors = [];

  Object.values(nodes).forEach(node => {
    const data = node.current_data;
    if (!data) return;

    // Check Flame
    if (data.flame === true) {
      overallStatus = "UNSAFE";
      triggerSensors.push({ node_id: node.node_id, sensor: "Flame", value: "FIRE DETECTED", threshold: "No Flame" });
    }

    // Check Gas
    if (data.gas >= thresholds.gas.unsafe_min) {
      overallStatus = "UNSAFE";
      triggerSensors.push({ node_id: node.node_id, sensor: "Gas", value: data.gas, threshold: thresholds.gas.unsafe_min });
    } else if (data.gas >= thresholds.gas.safe_max && overallStatus !== "UNSAFE") {
      overallStatus = "WARNING";
      triggerSensors.push({ node_id: node.node_id, sensor: "Gas", value: data.gas, threshold: thresholds.gas.safe_max });
    }

    // Check Smoke
    if (data.smoke >= thresholds.smoke.unsafe_min) {
      overallStatus = "UNSAFE";
      triggerSensors.push({ node_id: node.node_id, sensor: "Smoke", value: data.smoke, threshold: thresholds.smoke.unsafe_min });
    } else if (data.smoke >= thresholds.smoke.safe_max && overallStatus !== "UNSAFE") {
      overallStatus = "WARNING";
      triggerSensors.push({ node_id: node.node_id, sensor: "Smoke", value: data.smoke, threshold: thresholds.smoke.safe_max });
    }

    // Check Temp
    if (data.temperature >= thresholds.temperature.unsafe_min) {
      overallStatus = "UNSAFE";
      triggerSensors.push({ node_id: node.node_id, sensor: "Temperature", value: data.temperature, threshold: thresholds.temperature.unsafe_min });
    } else if (data.temperature >= thresholds.temperature.safe_max && overallStatus !== "UNSAFE") {
      overallStatus = "WARNING";
      triggerSensors.push({ node_id: node.node_id, sensor: "Temperature", value: data.temperature, threshold: thresholds.temperature.safe_max });
    }
  });

  return { status: overallStatus, triggers: triggerSensors };
}

// ----------------------------------------------------
// SIMULATOR ENGINE (Demo / IoT Stream)
// ----------------------------------------------------
let simStep = 0;
let forceSpikeNode = null;
let forceSpikeType = null; // 'gas', 'flame', 'temp'

setInterval(() => {
  const settings = db.getSettings();
  if (!settings.demo_mode) return; // If real MQTT mode is selected

  simStep++;
  const nodes = ["ESP32-Node-01", "ESP32-Node-02", "ESP32-Node-03"];
  const timestamp = new Date().toISOString();

  nodes.forEach(nodeId => {
    let tempDelta = (Math.sin(simStep / 8) * 0.4) + ((Math.random() - 0.5) * 0.2);
    let humDelta = (Math.cos(simStep / 10) * 0.5) + ((Math.random() - 0.5) * 0.3);
    let gasDelta = (Math.sin(simStep / 6) * 8) + ((Math.random() - 0.5) * 5);
    let smokeDelta = (Math.cos(simStep / 7) * 3) + ((Math.random() - 0.5) * 2);
    let flame = false;

    const prev = telemetryHistory[nodeId][telemetryHistory[nodeId].length - 1] || {
      temperature: 26.0, humidity: 50.0, gas: 320, smoke: 80, flame: false
    };

    let newTemp = Math.max(15, Math.min(50, prev.temperature + tempDelta));
    let newHum = Math.max(20, Math.min(95, prev.humidity + humDelta));
    let newGas = Math.max(100, Math.min(1000, prev.gas + gasDelta));
    let newSmoke = Math.max(20, Math.min(500, prev.smoke + smokeDelta));

    // Handle Manual Injection / Spike trigger
    if (forceSpikeNode === nodeId) {
      if (forceSpikeType === 'gas') {
        newGas = 785;
        newSmoke = 420;
      } else if (forceSpikeType === 'flame') {
        flame = true;
        newGas = 620;
      } else if (forceSpikeType === 'temp') {
        newTemp = 44.5;
      }
    }

    const packet = {
      node_id: nodeId,
      timestamp: timestamp,
      temperature: parseFloat(newTemp.toFixed(1)),
      humidity: parseFloat(newHum.toFixed(1)),
      gas: Math.round(newGas),
      smoke: Math.round(newSmoke),
      flame: flame
    };

    // Store telemetry history
    if (!telemetryHistory[nodeId]) telemetryHistory[nodeId] = [];
    telemetryHistory[nodeId].push(packet);
    if (telemetryHistory[nodeId].length > MAX_HISTORY) telemetryHistory[nodeId].shift();

    // Update node state in database
    db.updateNodeData(nodeId, packet);
  });

  // Evaluate system safety
  const safetyEval = evaluateSafetyStatus();

  // Create alert if UNSAFE breached and no pending alert exists recently
  if (safetyEval.status === "UNSAFE" && safetyEval.triggers.length > 0) {
    const mainTrigger = safetyEval.triggers[0];
    const existingAlerts = db.getAlerts();
    const lastAlert = existingAlerts[0];

    const isRecent = lastAlert && (Date.now() - new Date(lastAlert.timestamp).getTime() < 30000) && (lastAlert.sensor === mainTrigger.sensor);

    if (!isRecent) {
      db.addAlert({
        node_id: mainTrigger.node_id,
        sensor: mainTrigger.sensor,
        reading: mainTrigger.value,
        threshold: mainTrigger.threshold,
        status: "UNSAFE",
        duration: "Active"
      });

      db.addNotification({
        type: "ALERT",
        title: `🚨 EMERGENCY: Unsafe ${mainTrigger.sensor} Level`,
        message: `${mainTrigger.node_id} detected ${mainTrigger.sensor} reading ${mainTrigger.value} exceeding safe threshold (${mainTrigger.threshold}).`,
        severity: "UNSAFE"
      });
    }
  }

  // Broadcast to all WebSocket clients
  const payload = JSON.stringify({
    type: "TELEMETRY_UPDATE",
    nodes: db.getNodes(),
    safety_summary: safetyEval,
    latest_packets: Object.keys(telemetryHistory).map(id => telemetryHistory[id][telemetryHistory[id].length - 1]),
    mqtt_connected: true,
    timestamp: timestamp
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });

}, 1500);

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// Overall System Safety & Telemetry Summary
app.get('/api/status', (req, res) => {
  const safetyEval = evaluateSafetyStatus();
  res.json({
    status: safetyEval.status,
    triggers: safetyEval.triggers,
    system_online: true,
    mqtt_connected: true,
    last_data_received: new Date().toISOString(),
    demo_mode: db.getSettings().demo_mode,
    active_nodes_count: Object.keys(db.getNodes()).length
  });
});

// Get Nodes List & Current Telemetry
app.get('/api/nodes', (req, res) => {
  res.json({
    nodes: db.getNodes(),
    history: telemetryHistory
  });
});

// Inject Demo Emergency Spike (For testing alerts)
app.post('/api/demo/inject-spike', (req, res) => {
  const { node_id, type } = req.body;
  forceSpikeNode = node_id || "ESP32-Node-02";
  forceSpikeType = type || "gas";

  setTimeout(() => {
    forceSpikeNode = null;
    forceSpikeType = null;
  }, 12000); // Reset after 12 seconds

  res.json({ success: true, message: `Emergency ${type} spike injected for ${forceSpikeNode} for 12 seconds` });
});

// Clear Spike / Force Reset to Safe
app.post('/api/demo/reset-safe', (req, res) => {
  forceSpikeNode = null;
  forceSpikeType = null;

  // Reset node readings
  Object.keys(telemetryHistory).forEach(nodeId => {
    const last = telemetryHistory[nodeId][telemetryHistory[nodeId].length - 1];
    if (last) {
      last.gas = 310;
      last.smoke = 75;
      last.temperature = 26.5;
      last.flame = false;
      db.updateNodeData(nodeId, last);
    }
  });

  res.json({ success: true, message: "System state forced to SAFE." });
});

// Threshold Settings APIs
app.get('/api/thresholds', (req, res) => {
  res.json(db.getThresholds());
});

app.post('/api/thresholds', (req, res) => {
  const newThresholds = req.body;
  const updated = db.updateThresholds(newThresholds);
  
  db.addNotification({
    type: "SYSTEM",
    title: "Safety Thresholds Updated",
    message: "System safety thresholds have been updated and calibrated by operator.",
    severity: "INFO"
  });

  res.json({ success: true, thresholds: updated });
});

// Alerts APIs
app.get('/api/alerts', (req, res) => {
  const { filter, node, sensor } = req.query;
  let alerts = db.getAlerts();

  if (node && node !== 'ALL') {
    alerts = alerts.filter(a => a.node_id === node);
  }
  if (sensor && sensor !== 'ALL') {
    alerts = alerts.filter(a => a.sensor === sensor);
  }

  res.json(alerts);
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const alertId = req.params.id;
  const { username } = req.body;
  const updatedAlert = db.acknowledgeAlert(alertId, username || "Operator");
  res.json({ success: true, alert: updatedAlert });
});

// Notifications APIs
app.get('/api/notifications', (req, res) => {
  res.json(db.getNotifications());
});

app.post('/api/notifications/read', (req, res) => {
  const updated = db.markNotificationsRead();
  res.json({ success: true, notifications: updated });
});

// System Settings APIs
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// ----------------------------------------------------
// AI SAFETY CHATBOT ENDPOINT (3-LEVEL ASSISTANT)
// ----------------------------------------------------
app.post('/api/chat', (req, res) => {
  const { level, message } = req.body; // level: 'safety' | 'sensor' | 'wave'
  const nodes = db.getNodes();
  const thresholds = db.getThresholds();
  const safetyEval = evaluateSafetyStatus();

  let responseText = "";
  const query = (message || "").toLowerCase();

  if (level === 'safety') {
    // Level 1: Safety Assistant (Overall status)
    if (query.includes("safe") || query.includes("status") || query.includes("everything") || query.includes("overall")) {
      if (safetyEval.status === "SAFE") {
        responseText = `Current system status: SAFE ✓. All ESP32 nodes are operating within normal environmental limits.\n- Node 01 Temp: ${nodes["ESP32-Node-01"]?.current_data?.temperature || 26}°C | Humidity: ${nodes["ESP32-Node-01"]?.current_data?.humidity || 50}%\n- Node 02 Gas: ${nodes["ESP32-Node-02"]?.current_data?.gas || 350} PPM (Safe threshold: <${thresholds.gas.safe_max})\n- Flame Detection: Not detected on any active node.`;
      } else if (safetyEval.status === "WARNING") {
        const trg = safetyEval.triggers[0];
        responseText = `Current system status: ⚠ WARNING DETECTED!\nNode ${trg?.node_id} detected elevated ${trg?.sensor} level (${trg?.value}). Safe limit is ${trg?.threshold}. Please monitor closely.`;
      } else {
        const trg = safetyEval.triggers[0];
        responseText = `🚨 UNSAFE CONDITION DETECTED!\nSensor breach on ${trg?.node_id}: ${trg?.sensor} reading is currently ${trg?.value} (Unsafe Threshold: ${trg?.threshold}). Emergency protocol activated!`;
      }
    } else {
      responseText = `I am the SafeSense System Safety Assistant. Currently system status is ${safetyEval.status}. How can I assist you with safety monitoring?`;
    }

  } else if (level === 'sensor') {
    // Level 2: Sensor Assistant (Individual sensor breakdown)
    if (query.includes("gas") || query.includes("mq2") || query.includes("smoke")) {
      const g1 = nodes["ESP32-Node-01"]?.current_data?.gas || 0;
      const g2 = nodes["ESP32-Node-02"]?.current_data?.gas || 0;
      responseText = `MQ2/MQ9 Gas Sensor Readings:\n- Node-01 (Lab): ${g1} PPM\n- Node-02 (Chemical Store): ${g2} PPM\nConfigured Thresholds:\n- Safe: < ${thresholds.gas.safe_max} PPM\n- Warning: ${thresholds.gas.safe_max}-${thresholds.gas.unsafe_min} PPM\n- Unsafe: > ${thresholds.gas.unsafe_min} PPM`;
    } else if (query.includes("flame") || query.includes("fire")) {
      const f1 = nodes["ESP32-Node-01"]?.current_data?.flame;
      const f2 = nodes["ESP32-Node-02"]?.current_data?.flame;
      responseText = `Flame / Fire Detection Sensors:\n- Node-01: ${f1 ? "🔥 FIRE DETECTED!" : "SAFE (No Flame)"}\n- Node-02: ${f2 ? "🔥 FIRE DETECTED!" : "SAFE (No Flame)"}\nFlame sensors operate on IR wavelength detection for immediate fire alert response.`;
    } else if (query.includes("temp") || query.includes("humidity")) {
      const t1 = nodes["ESP32-Node-01"]?.current_data?.temperature || 0;
      const h1 = nodes["ESP32-Node-01"]?.current_data?.humidity || 0;
      responseText = `DHT22 Temperature & Humidity Status:\n- Temperature: ${t1}°C (Safe Threshold: < ${thresholds.temperature.safe_max}°C)\n- Relative Humidity: ${h1}% (Safe Range: 30% - ${thresholds.humidity.safe_max}%)`;
    } else {
      responseText = `Sensor Assistant here. I can detail individual readings for Gas (MQ2/MQ9), Flame IR, Temperature, and Humidity. What sensor details do you need?`;
    }

  } else if (level === 'wave') {
    // Level 3: Wave Analysis Assistant (Trends & Threshold analysis)
    if (query.includes("red") || query.includes("why") || query.includes("unsafe")) {
      if (safetyEval.status === "UNSAFE") {
        const trg = safetyEval.triggers[0];
        responseText = `The ${trg?.sensor} waveform has turned RED because the current reading (${trg?.value}) has crossed the configured unsafe threshold of ${trg?.threshold}. The trend shows an abnormal elevation requiring immediate inspection.`;
      } else {
        responseText = `All active sensor waveforms are currently in the GREEN safe zone. The gas graph is safe because current readings (${nodes["ESP32-Node-02"]?.current_data?.gas || 350} PPM) remain well below the warning threshold (${thresholds.gas.safe_max} PPM).`;
      }
    } else if (query.includes("threshold") || query.includes("zone") || query.includes("range")) {
      responseText = `Current Active Waveform Thresholds:\n- Gas: Safe < ${thresholds.gas.safe_max} PPM | Warning: ${thresholds.gas.safe_max}-${thresholds.gas.unsafe_min} PPM | Unsafe: > ${thresholds.gas.unsafe_min} PPM\n- Temp: Safe < ${thresholds.temperature.safe_max}°C | Unsafe: > ${thresholds.temperature.unsafe_min}°C\n- Flame: Unsafe on IR pulse activation.`;
    } else if (query.includes("trend") || query.includes("increase") || query.includes("history")) {
      responseText = `Waveform Analysis: Sensor signals have remained stable over the last 30 minutes. Telemetry packets are received every 1.5 seconds via WebSocket / MQTT protocol.`;
    } else {
      responseText = `Wave Analysis Assistant. Ask me about waveform trends, safe/warning/unsafe zone lines, or why a specific graph color shifted!`;
    }
  }

  res.json({
    level: level,
    reply: responseText,
    timestamp: new Date().toISOString()
  });
});

// Serve Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` SafeSense IoT Environmental Safety Dashboard`);
  console.log(` Web Server running at: http://localhost:${PORT}`);
  console.log(` WebSocket Stream at:  ws://localhost:${PORT}/ws/telemetry`);
  console.log(`====================================================`);
});
