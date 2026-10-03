/**
 * SafeSense IoT - Notification Center Drawer Manager
 */

class NotificationCenter {
  renderDrawer(items) {
    const list = document.getElementById("notifDrawerList");
    const badge = document.getElementById("notifBadgeCount");

    if (!items || items.length === 0) {
      if (list) list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No notifications.</div>`;
      if (badge) badge.style.display = 'none';
      return;
    }

    const unreadCount = items.filter(i => !i.read).length;
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    if (list) {
      list.innerHTML = items.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
          <div style="font-weight: 700; color: ${n.severity === 'UNSAFE' ? 'var(--unsafe-red)' : 'white'};">${n.title}</div>
          <div style="color: var(--text-muted); margin-top: 0.25rem;">${n.message}</div>
          <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.5rem;">${new Date(n.timestamp).toLocaleTimeString()}</div>
        </div>
      `).join('');
    }
  }

  markRead() {
    dataEngine.markNotifsRead();
  }
}

const notificationCenter = new NotificationCenter();
