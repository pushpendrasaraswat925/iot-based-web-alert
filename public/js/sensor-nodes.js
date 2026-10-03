/**
 * SafeSense IoT - Sensor Nodes Management View
 * Renders hardware cards for ESP32 nodes (Node 01, Node 02, Node 03)
 */

class SensorNodesController {
  render(nodesData) {
    const container = document.getElementById("nodesGridContainer");
    if (!container || !nodesData) return;

    const nodesList = Object.values(nodesData);
    
    container.innerHTML = nodesList.map(node => {
      const data = node.current_data || {};
      const statusClass = (node.status || "SAFE").toLowerCase();
      
      const lastSeenDate = new Date(node.last_seen || Date.now());
      const ageSec = Math.round((Date.now() - lastSeenDate.getTime()) / 1000);

      return `
        <div class="glass-card">
          <div class="node-card-top">
            <div>
              <div class="node-title">${node.node_id}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${node.name || 'IoT Node'}</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem;">
              <span class="status-badge ${statusClass}">${node.status || 'SAFE'}</span>
              <span class="node-mcu-badge">${node.mcu || 'ESP32'}</span>
            </div>
          </div>

          <div class="node-metrics-list">
            <div class="metric-row">
              <span class="metric-label">Wi-Fi Status:</span>
              <span class="metric-val" style="color: var(--safe-green);">✓ ${node.wifi_status || 'Connected'} (${node.rssi || -65} dBm)</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">MQTT Connection:</span>
              <span class="metric-val" style="color: var(--cyan-accent);">${node.mqtt_status || 'Connected'}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Sensors Attached:</span>
              <span class="metric-val">${(node.sensors || ["DHT22", "MQ2", "IR Flame"]).join(', ')}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Last Packet:</span>
              <span class="metric-val">${ageSec} sec ago</span>
            </div>

            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; text-align: center;">
              <div style="background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 8px;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">TEMP / HUM</div>
                <div style="font-size: 0.95rem; font-weight: 700;">${data.temperature || 26.5}°C / ${data.humidity || 50}%</div>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 8px;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">GAS / FLAME</div>
                <div style="font-size: 0.95rem; font-weight: 700;">${data.gas || 310} PPM / ${data.flame ? 'FIRE' : 'SAFE'}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

const sensorNodes = new SensorNodesController();
