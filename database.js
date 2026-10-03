/**
 * SafeSense IoT - In-Memory Database & Persistence Engine
 * Supports Node.js server fallback with default thresholds, active nodes, and alert logs.
 */

class Database {
  constructor() {
    this.thresholds = {
      temperature: { safe_max: 32, warning_max: 40, unsafe_min: 40, unit: '°C' },
      humidity: { safe_max: 70, warning_max: 85, unsafe_min: 85, unit: '%' },
      gas: { safe_max: 450, warning_max: 650, unsafe_min: 650, unit: 'PPM' },
      smoke: { safe_max: 200, warning_max: 400, unsafe_min: 400, unit: 'PPM' },
      flame: { safe_val: false, unsafe_val: true, unit: 'status' }
    };

    this.settings = {
      demo_mode: true,
      notif_30m: true,
      audio_synth: true,
      vibration: true
    };

    this.nodes = {
      "ESP32-Node-01": {
        node_id: "ESP32-Node-01",
        name: "Main Control Room Node",
        mcu: "ESP32-WROOM-32",
        wifi_status: "Connected",
        mqtt_status: "Connected",
        rssi: -62,
        status: "SAFE",
        sensors: ["DHT22", "MQ2", "IR Flame"],
        last_seen: new Date().toISOString(),
        current_data: {
          temperature: 26.4,
          humidity: 52.0,
          gas: 310,
          smoke: 85,
          flame: false
        }
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
        current_data: {
          temperature: 27.1,
          humidity: 49.5,
          gas: 340,
          smoke: 92,
          flame: false
        }
      },
      "ESP32-Node-03": {
        node_id: "ESP32-Node-03",
        name: "Server Rack Bay Node",
        mcu: "ESP32-C3",
        wifi_status: "Connected",
        mqtt_status: "Connected",
        rssi: -58,
        status: "SAFE",
        sensors: ["DHT22", "MQ2", "Smoke Sensor"],
        last_seen: new Date().toISOString(),
        current_data: {
          temperature: 25.8,
          humidity: 48.0,
          gas: 290,
          smoke: 70,
          flame: false
        }
      }
    };

    this.alerts = [
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

    this.notifications = [
      {
        id: "NTF-1",
        title: "🟢 System Operating Safely",
        message: "All 3 ESP32 nodes connected via MQTT stream.",
        severity: "SAFE",
        read: false,
        timestamp: new Date().toISOString()
      }
    ];
  }

  getThresholds() {
    return this.thresholds;
  }

  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    return this.thresholds;
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return this.settings;
  }

  getNodes() {
    return this.nodes;
  }

  updateNodeData(nodeId, data) {
    if (this.nodes[nodeId]) {
      this.nodes[nodeId].current_data = { ...this.nodes[nodeId].current_data, ...data };
      this.nodes[nodeId].last_seen = new Date().toISOString();
    }
  }

  getAlerts() {
    return this.alerts;
  }

  addAlert(alert) {
    this.alerts.unshift(alert);
    if (this.alerts.length > 50) this.alerts.pop();
  }

  acknowledgeAlert(alertId, ackBy) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.ack_by = ackBy || "Dashboard Operator";
    }
    return alert;
  }

  getNotifications() {
    return this.notifications;
  }

  addNotification(notif) {
    this.notifications.unshift(notif);
    if (this.notifications.length > 30) this.notifications.pop();
  }

  markNotificationsRead() {
    this.notifications.forEach(n => n.read = true);
    return true;
  }
}

module.exports = new Database();
