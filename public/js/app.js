/**
 * SafeSense IoT - Main Application Controller & Synchronizer
 * Connects UI views with DataEngine stream and handles view routing
 */

class AppController {
  constructor() {
    this.currentView = 'dashboard';

    this.initClock();
    this.initFeather();
    
    // Subscribe to DataEngine updates
    dataEngine.subscribe(payload => this.handleDataUpdate(payload));
  }

  initFeather() {
    setTimeout(() => {
      if (window.feather) feather.replace();
    }, 100);
  }

  initClock() {
    setInterval(() => {
      const clock = document.getElementById("liveClock");
      if (clock) {
        const d = new Date();
        clock.textContent = d.toLocaleTimeString();
      }
    }, 1000);
  }

  handleDataUpdate(payload) {
    const { nodes, safety_summary, thresholds, history, alerts, notifications, is_live } = payload;

    // 1. Update Header Pills
    const mqttPill = document.getElementById("mqttStatusText");
    if (mqttPill) {
      mqttPill.textContent = is_live ? "MQTT: CONNECTED (LIVE)" : "MQTT: SIMULATOR STREAM";
    }

    const demoText = document.getElementById("demoText");
    if (demoText) {
      demoText.textContent = is_live ? "LIVE MQTT BROKER" : "DEMO SIMULATOR ACTIVE";
    }

    // 2. Dashboard View Update
    if (window.dashboardController) {
      dashboardController.render(nodes, safety_summary, thresholds);
    }

    // 3. Wave Monitor Update
    if (window.waveMonitor) {
      waveMonitor.updateWaveData(history, thresholds);
    }

    // 4. Safety Circle Radar Update
    if (window.safetyCircle) {
      safetyCircle.updateData(nodes, safety_summary, thresholds);
    }

    // 5. Sensor Nodes Cards Update
    if (window.sensorNodes && this.currentView === 'nodes') {
      sensorNodes.render(nodes);
    }

    // 6. Alert History Update
    if (window.alertHistory && this.currentView === 'alerts') {
      alertHistory.renderTable(alerts);
    }

    // 7. Notifications Drawer Update
    if (window.notificationCenter) {
      notificationCenter.renderDrawer(notifications);
    }

    // 8. Emergency Engine Check
    if (window.emergencyEngine) {
      emergencyEngine.evaluate(safety_summary);
    }
  }

  navigate(viewName) {
    this.currentView = viewName;

    // Update active navbar item
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.remove('active');
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      }
    });

    // Update visible view section
    document.querySelectorAll('.page-view').forEach(el => {
      el.classList.remove('active');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
    }

    // Trigger immediate view specific refresh
    const payload = dataEngine.getPayload();
    if (viewName === 'nodes' && window.sensorNodes) sensorNodes.render(payload.nodes);
    if (viewName === 'alerts' && window.alertHistory) alertHistory.renderTable(payload.alerts);
    if (viewName === 'chat' && window.aiChat) aiChat.renderMessages();
    if (viewName === 'settings' && window.settingsManager) settingsManager.loadSettings();

    this.initFeather();
  }

  toggleNotifDrawer() {
    const drawer = document.getElementById("notifDrawer");
    if (drawer) {
      drawer.classList.toggle("open");
      if (drawer.classList.contains("open")) {
        dataEngine.markNotifsRead();
      }
    }
  }

  toggleDemoMode() {
    dataEngine.demoMode = !dataEngine.demoMode;
    alert(dataEngine.demoMode ? "Switched to DEMO SIMULATED DATA mode." : "Waiting for LIVE MQTT BROKER STREAM...");
  }

  injectDemoSpike(type) {
    dataEngine.injectDemoSpike(type || 'gas');
  }
}

// Instantiate global app controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
