/**
 * SafeSense IoT - Emergency Engine & Mobile Web Notification Manager
 * Handles Audio Synth Alarms, Web Push Notifications, Device Vibration, and Emergency Overlays
 */

class EmergencyEngine {
  constructor() {
    this.audioCtx = null;
    this.alarmInterval = null;
    this.isAlarmPlaying = false;
    this.currentEmergency = null;
    this.last30mNotifTime = Date.now();
    this.acknowledgedAlertId = null;

    this.initNotificationPermission();
  }

  // Request Web Push Notification Permission
  initNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  // Web Audio API Synth Alarm (Plays 5-second emergency beep pattern)
  playAlarmAudio() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.isAlarmPlaying = true;
      let startTime = this.audioCtx.currentTime;

      // Beep sequence over 5 seconds
      for (let i = 0; i < 6; i++) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 1200, startTime + i * 0.7);

        gain.gain.setValueAtTime(0.3, startTime + i * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + i * 0.7 + 0.5);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime + i * 0.7);
        osc.stop(startTime + i * 0.7 + 0.5);
      }

      setTimeout(() => {
        this.isAlarmPlaying = false;
      }, 5000);

    } catch (e) {
      console.warn("Web Audio API not supported or blocked by browser:", e);
    }
  }

  // Mobile Device Vibration (Up to 5 seconds gracefully handled)
  triggerVibration() {
    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([600, 300, 600, 300, 600, 300, 600]);
      }
    } catch (e) {
      console.log("Device vibration not supported or denied.");
    }
  }

  // Send Browser / Mobile Web Push Notification
  sendPushNotification(title, body) {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body: body,
          icon: 'css/shield-icon.png',
          tag: 'safesense-alert',
          requireInteraction: true
        });
      }
    } catch (e) {
      console.log("Push notification failed:", e);
    }
  }

  evaluate(safetySummary) {
    if (safetySummary.status === "UNSAFE" && safetySummary.primary_trigger) {
      const trg = safetySummary.primary_trigger;
      const triggerKey = `${trg.node_id}-${trg.sensor}-${trg.value}`;

      if (this.currentEmergency !== triggerKey) {
        this.triggerEmergency({
          node_id: trg.node_id,
          sensor: trg.sensor,
          value: trg.value,
          threshold: trg.threshold
        });
        this.currentEmergency = triggerKey;
      }
    } else if (safetySummary.status === "SAFE") {
      this.currentEmergency = null;
      document.getElementById("emergencyModal")?.classList.remove("active");
    }

    this.check30MinReminder(safetySummary);
  }

  // Trigger Full Emergency Protocol
  triggerEmergency(triggerDetails) {
    // 1. Play Audio Alarm (5 seconds)
    this.playAlarmAudio();

    // 2. Trigger Device Vibration (Up to 5 seconds)
    this.triggerVibration();

    // 3. Send Mobile Push Notification
    const node = triggerDetails.node_id || "ESP32-Node-02";
    const sensor = triggerDetails.sensor || "Gas/Smoke";
    const val = triggerDetails.value || "785";
    this.sendPushNotification(`🚨 SAFESENSE EMERGENCY`, `UNSAFE ${sensor.toUpperCase()} DETECTED\nNode: ${node}\nReading: ${val}\nImmediate Action Required!`);

    // 4. Update Emergency Overlay UI
    const elSensor = document.getElementById("emgSensor");
    const elNode = document.getElementById("emgNode");
    const elReading = document.getElementById("emgReading");
    const elThreshold = document.getElementById("emgThreshold");

    if (elSensor) elSensor.textContent = sensor;
    if (elNode) elNode.textContent = node;
    if (elReading) elReading.textContent = `${val}`;
    if (elThreshold) elThreshold.textContent = `${triggerDetails.threshold || 'Configured Limit'}`;

    const modal = document.getElementById("emergencyModal");
    if (modal) modal.classList.add("active");
  }

  // Silence Alarm Sound
  silenceAlarm() {
    if (this.audioCtx) {
      this.audioCtx.suspend();
    }
    this.isAlarmPlaying = false;
  }

  // Acknowledge & Dismiss Alert
  acknowledgeCurrentAlert() {
    this.silenceAlarm();
    const modal = document.getElementById("emergencyModal");
    if (modal) modal.classList.remove("active");

    const payload = dataEngine.getPayload();
    if (payload.alerts && payload.alerts.length > 0) {
      dataEngine.acknowledgeAlert(payload.alerts[0].id);
    }
  }

  // 30-Minute Monitoring Summary Reminder Push
  check30MinReminder(statusSummary) {
    const now = Date.now();
    if (now - this.last30mNotifTime > 1800000) {
      this.last30mNotifTime = now;
      this.sendPushNotification(
        "SafeSense 30-Min Status Report",
        `System Status: ${statusSummary.status}. Environmental monitoring active.`
      );
    }
  }
}

const emergencyEngine = new EmergencyEngine();
