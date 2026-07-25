# 🚀 BigQuery Release Radar (`antigravity-event-talks-app`)

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/framework-Flask-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/Snigdha28Personal/antigravity-event-talks-app)

> A modern, web application built using **Python Flask**, **Vanilla JavaScript**, **CSS3 (Glassmorphism)**, and **HTML5**. The app tracks official [Google Cloud BigQuery Release Notes](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml), parses and categorizes updates, and enables users to compose and post updates directly to **X (formerly Twitter)**.

---

## ✨ Features

- **📡 Real-Time RSS Feed Ingestion**: Connects directly to Google Cloud's official BigQuery Atom/RSS XML feed.
- **🔄 Refresh Button with Spinner**: On-demand feed sync with animated CSS keyframe loading spinners and pulse status indicators.
- **🏷️ Automated Category Tagging**: Intelligently classifies updates into badges (`GA`, `FEATURE`, `PREVIEW`, `CHANGED`, `DEPRECATED`, `FIX`).
- **🔍 Instant Search & Filtering**: Client-side query search, tag pill filters, and date sorting (Newest/Oldest).
- **🐦 Select & Tweet Integration**: One-click **"Tweet about this"** action on any update launching a custom Tweet Composer Modal with character limit tracking (280 max), hashtag toggles (`#BigQuery`, `#GoogleCloud`), and direct X Web Intent posting (`x.com/intent/tweet`).
- **🛡️ Offline Fallback Resiliency**: Serves structured fallback sample data if network endpoints are blocked or offline.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python 3.9+, Flask, `requests`, `feedparser`, `beautifulsoup4`
- **Frontend**: Plain Vanilla HTML5, CSS3 Glassmorphism UI system, Vanilla ES6 JavaScript
- **API Protocol**: REST API (`/api/release-notes`)
- **Integration**: X (Twitter) Web Intent API (`https://twitter.com/intent/tweet`)

---

## 📁 Repository Structure

```
bigquery_notes_app/
├── app.py                  # Flask server, RSS XML parser & REST API
├── requirements.txt        # Python package dependencies
├── .gitignore              # Git ignore configuration
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Main HTML5 Single Page Application template
└── static/
    ├── css/
    │   └── style.css       # Custom Glassmorphism styles & animations
    └── js/
        └── app.js          # Client-side state, filtering & Tweet modal logic
```

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have **Python 3.9+** and **git** installed:
```bash
python --version
git --version
```

### 2. Clone the Repository
```bash
git clone https://github.com/Snigdha28Personal/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```

### 5. Access the Web App
Open your browser and navigate to:
👉 **`http://127.0.0.1:5000`**

---

## 📸 Screenshots & Workflow

### 1. Main Dashboard
View latest BigQuery updates categorized by General Availability, Features, and Preview announcements.

### 2. Tweet Composer Modal
Click **"Tweet about this"** on any release note to preview the formatted copy, adjust hashtags, and post directly to X.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
