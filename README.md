# 🔥 SafeSense IoT – Environmental Safety Monitoring System

## 📌 About the Project

**SafeSense IoT** is a web-based environmental safety monitoring dashboard designed to monitor temperature, humidity, gas/smoke concentration, and fire/flame conditions.

The project provides a modern dashboard with sensor readings, live waveform graphs, safety status indicators, alert history, sensor node management, and an AI Safety Assistant interface.

It is designed for an ESP32-based IoT sensor network and includes a demo simulator for testing the dashboard without physical hardware.

## ✨ Features

* **Real-Time Dashboard:** Displays environmental sensor readings and overall safety status.
* **Temperature Monitoring:** Monitors temperature in °C.
* **Humidity Monitoring:** Displays humidity levels in percentage.
* **Gas & Smoke Detection:** Monitors gas/smoke concentration in PPM.
* **Fire & Flame Detection:** Displays flame sensor status.
* **Live Wave Graphs:** Visualizes sensor readings using Chart.js.
* **Safety Circle:** Provides a circular radar visualization and safety score.
* **Sensor Node Management:** Displays ESP32 sensor node information.
* **Alert History:** Maintains a view of warning and unsafe events.
* **AI Safety Assistant:** Provides a chatbot interface for safety-related queries.
* **Emergency Alerts:** Includes an emergency popup, alarm controls, and alert acknowledgement.
* **Threshold Calibration:** Allows users to configure safety thresholds.
* **Notification Settings:** Includes audio alarm, vibration, and monitoring summary preferences.
* **Demo Simulator:** Supports simulated readings and test alerts.

## 🛠️ Technologies Used

* HTML5
* CSS3
* JavaScript
* Chart.js
* Feather Icons
* ESP32 IoT Platform (intended hardware integration)
* MQTT (intended sensor communication)

## 📂 Project Structure

```text
SafeSense-IoT/
│
├── index.html
│
├── css/
│   └── styles.css
│
└── js/
    ├── data-engine.js
    ├── emergency.js
    ├── dashboard.js
    ├── wave-monitor.js
    ├── safety-circle.js
    ├── sensor-nodes.js
    ├── alert-history.js
    ├── ai-assistant.js
    ├── settings.js
    ├── notifications.js
    └── app.js
```

## 🚀 How to Run the Project

**Step 1:** Download or clone this repository.

```bash
git clone YOUR_REPOSITORY_URL
```

**Step 2:** Open the project folder in VS Code.

```bash
cd SafeSense-IoT
```

**Step 3:** Check that all HTML, CSS, and JavaScript files are in their correct folders.

**Step 4:** Open `index.html` in your browser, or use the Live Server extension in VS Code.

**Step 5:** Explore the dashboard, waveform graphs, sensor nodes, alert history, AI assistant interface, and settings.

> Note: Chart.js and Feather Icons are loaded through CDNs, so an internet connection is required for these libraries.

## 📊 Sensor Parameters

| Sensor          | Parameter       | Unit          |
| --------------- | --------------- | ------------- |
| DHT22           | Temperature     | °C            |
| DHT22           | Humidity        | %             |
| MQ-2 / MQ-9     | Gas and smoke   | PPM           |
| IR Flame Sensor | Flame detection | Digital state |

## ⚙️ Safety Thresholds

The default dashboard configuration includes:

* Temperature safe limit: 32°C
* Temperature unsafe threshold: 40°C
* Gas safe limit: 450 PPM
* Gas unsafe threshold: 650 PPM
* Humidity safe range: approximately 30–70%

These are configurable project values, not universal safety standards. Actual thresholds must be calibrated for the sensors, gases, environment, and applicable safety requirements.

## 🎯 Project Objectives

* Learn frontend web development using HTML, CSS, and JavaScript.
* Build an interactive environmental monitoring dashboard.
* Visualize sensor data through graphs and status indicators.
* Understand IoT sensor network monitoring concepts.
* Explore emergency alert handling and configurable thresholds.
* Develop a foundation for future ESP32 and MQTT integration.

## 🔮 Future Improvements

* Connect real ESP32 hardware and environmental sensors.
* Integrate a live MQTT broker for sensor data transmission.
* Store readings and alert history in a database.
* Add user authentication and access control.
* Connect an actual AI model to the Safety Assistant.
* Deploy the dashboard to a web server.

## ⚠️ Disclaimer

This project is intended for educational and demonstration purposes. The demo simulator and dashboard should not be treated as a certified fire alarm or life-safety system. Do not rely on this project as a replacement for certified safety equipment.

## 👨‍💻 Author

**Pushpendra Saraswat**

## 📄 License

This project is available for educational and learning purposes. Add a suitable open-source license file if you intend to distribute it under a specific license.
