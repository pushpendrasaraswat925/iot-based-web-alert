/**
 * SafeSense IoT - Alert History Log Controller
 * Loads, filters, and renders historical alert security logs
 */

class AlertHistoryController {
  loadAlerts() {
    const payload = dataEngine.getPayload();
    this.renderTable(payload.alerts);
  }

  renderTable(alertsList) {
    const tbody = document.getElementById("alertTableBody");
    if (!tbody) return;

    const nodeFilter = document.getElementById("alertFilterNode")?.value || "ALL";
    const statusFilter = document.getElementById("alertFilterStatus")?.value || "ALL";

    let filtered = alertsList || [];
    if (nodeFilter !== "ALL") {
      filtered = filtered.filter(a => a.node_id === nodeFilter);
    }
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (!filtered || filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No alerts recorded for this filter. System operating cleanly.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(a => {
      const dateStr = new Date(a.timestamp).toLocaleString();
      const statusClass = (a.status || 'SAFE').toLowerCase();

      return `
        <tr>
          <td><i data-feather="clock" style="width: 14px; margin-right: 4px; vertical-align: middle;"></i> ${dateStr}</td>
          <td><strong>${a.node_id}</strong></td>
          <td>${a.sensor}</td>
          <td style="font-weight: 700; color: ${a.status === 'UNSAFE' ? 'var(--unsafe-red)' : 'var(--text-main)'};">${a.reading}</td>
          <td>${a.threshold}</td>
          <td><span class="status-badge ${statusClass}">${a.status}</span></td>
          <td>${a.duration || 'Active'}</td>
          <td>
            ${a.acknowledged ? 
              `<span style="color: var(--safe-green); font-size: 0.8rem;"><i data-feather="check"></i> Acked (${a.ack_by || 'Operator'})</span>` : 
              `<button class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.4);" onclick="alertHistory.acknowledge('${a.id}')">Acknowledge</button>`
            }
          </td>
        </tr>
      `;
    }).join('');

    if (window.feather) feather.replace();
  }

  acknowledge(alertId) {
    dataEngine.acknowledgeAlert(alertId);
    this.loadAlerts();
  }
}

const alertHistory = new AlertHistoryController();
