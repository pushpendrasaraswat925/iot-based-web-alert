/**
 * SafeSense IoT - Settings & Threshold Calibration Manager
 */

class SettingsManager {
  loadSettings() {
    const th = dataEngine.thresholds;
    if (!th) return;

    if (document.getElementById('cfgTempSafe')) document.getElementById('cfgTempSafe').value = th.temperature?.safe_max || 32;
    if (document.getElementById('cfgTempUnsafe')) document.getElementById('cfgTempUnsafe').value = th.temperature?.unsafe_min || 40;
    if (document.getElementById('cfgGasSafe')) document.getElementById('cfgGasSafe').value = th.gas?.safe_max || 450;
    if (document.getElementById('cfgGasUnsafe')) document.getElementById('cfgGasUnsafe').value = th.gas?.unsafe_min || 650;
    if (document.getElementById('cfgHumSafe')) document.getElementById('cfgHumSafe').value = th.humidity?.safe_max || 70;
    if (document.getElementById('cfgSmokeUnsafe')) document.getElementById('cfgSmokeUnsafe').value = th.smoke?.unsafe_min || 400;
  }

  saveThresholds(event) {
    if (event) event.preventDefault();

    const confirmed = confirm("⚠ SAFETY WARNING:\nAre you sure you want to update safety thresholds?\nThreshold changes will directly affect alert triggers and classification.");
    if (!confirmed) return;

    const tempSafe = parseFloat(document.getElementById('cfgTempSafe').value) || 32;
    const tempUnsafe = parseFloat(document.getElementById('cfgTempUnsafe').value) || 40;
    const gasSafe = parseInt(document.getElementById('cfgGasSafe').value) || 450;
    const gasUnsafe = parseInt(document.getElementById('cfgGasUnsafe').value) || 650;
    const humSafe = parseInt(document.getElementById('cfgHumSafe').value) || 70;
    const smokeUnsafe = parseInt(document.getElementById('cfgSmokeUnsafe').value) || 400;

    const newThresholds = {
      temperature: { safe_max: tempSafe, warning_max: tempUnsafe, unsafe_min: tempUnsafe, unit: '°C' },
      gas: { safe_max: gasSafe, warning_max: gasUnsafe, unsafe_min: gasUnsafe, unit: 'PPM' },
      humidity: { safe_max: humSafe, warning_max: 85, unsafe_min: 85, unit: '%' },
      smoke: { safe_max: 200, warning_max: smokeUnsafe, unsafe_min: smokeUnsafe, unit: 'PPM' },
      flame: { safe_val: false, unsafe_val: true, unit: 'status' }
    };

    dataEngine.updateThresholds(newThresholds);
    alert("✓ Safety thresholds successfully updated and calibrated!");
  }
}

const settingsManager = new SettingsManager();
