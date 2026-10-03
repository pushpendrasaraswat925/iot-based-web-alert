/**
 * SafeSense IoT - Multi-Level AI Safety Assistant Controller
 * Visually structured 3-Level Chatbot Hierarchy: Safety Assistant -> Sensor Assistant -> Wave Analysis Assistant
 */

class AiChatController {
  constructor() {
    this.currentLevel = 'safety'; // 'safety' | 'sensor' | 'wave'
    
    // Separate chat histories for each chatbot level
    this.histories = {
      safety: [
        { sender: 'bot', text: 'Level 1: System Safety Assistant initialized.\nAsk me questions about overall environmental safety status.' }
      ],
      sensor: [
        { sender: 'bot', text: 'Level 2: Sensor Assistant initialized.\nAsk me about individual sensor metrics for Gas (MQ2/MQ9), IR Flame, Temp, or Humidity.' }
      ],
      wave: [
        { sender: 'bot', text: 'Level 3: Wave Analysis Assistant initialized.\nAsk me why a waveform shifted color, current threshold lines, or trend analysis.' }
      ]
    };
  }

  switchLevel(level, tabEl) {
    this.currentLevel = level;

    // Update Tab UI
    const tabs = document.querySelectorAll('.chat-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');

    this.renderMessages();
  }

  renderMessages() {
    const container = document.getElementById("chatMessages");
    if (!container) return;

    const messages = this.histories[this.currentLevel] || [];
    container.innerHTML = messages.map(m => `
      <div class="chat-bubble ${m.sender}">
        ${m.text.replace(/\n/g, '<br>')}
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  sendMessage(event) {
    if (event) event.preventDefault();
    const input = document.getElementById("chatInput");
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = "";

    // Add user message to current level history
    this.histories[this.currentLevel].push({ sender: 'user', text: userText });
    this.renderMessages();

    // Process reply locally via DataEngine rule engine (or server if available)
    setTimeout(() => {
      const replyText = dataEngine.processAiQuery(this.currentLevel, userText);
      this.histories[this.currentLevel].push({ sender: 'bot', text: replyText });
      this.renderMessages();
    }, 200);
  }
}

const aiChat = new AiChatController();
