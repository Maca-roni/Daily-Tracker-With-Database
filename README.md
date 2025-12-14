<!--
  Stardew Valley Well-Being Farm
  README - thematic, with emojis and Mermaid ERD
 -->

<div align="center">
  <h1>🌿 Stardew Well-Being Farm</h1>
  <p><em>A cozy personal tracker for habits, mood, tasks and journaling — Stardew-styled.</em></p>
</div>

---

## Overview

Welcome to the Stardew Well-Being Farm — a small single-user Flask app that helps you track daily mood, cultivate habits, manage tasks, and keep a farm journal. The UI is intentionally styled with a pixel / Stardew-inspired theme, with calm colors and playful icons to make habit-building feel like tending a virtual farm. 🌾

- Mood tracking with energy levels and notes
- Habit garden with simple logging
- Task list with due dates and completion
- Journal with image uploads and entry editing
- Farm Statistics and Settings pages

---

## ERD (Entity Relationship Diagram)

Below is a Mermaid ERD representing the main tables used by the application. Paste this into a Markdown viewer that supports Mermaid (e.g., GitHub) to render the diagram.

```mermaid
erDiagram
    MOOD {
        int mood_id PK
        int user_id
        string mood
        int energy_level
        text notes
        date log_date
        datetime created_at
    }

    HABITS {
        int habit_id PK
        int user_id
        string habit_name
        text description
    }

    HABIT_LOGS {
        int habit_log_id PK
        int habit_id FK
        bool completed
        date log_date
    }

    TASKS {
        int task_id PK
        int user_id
        string task_name
        date due_date
        bool is_completed
        string priority
    }

    JOURNAL {
        int journal_id PK
        int user_id
        text content
        text stickers  "(JSON list of image URLs)"
        date entry_date
        datetime created_at
    }

    MOOD ||--o{ HABIT_LOGS : "(not directly linked)"
    HABITS ||--o{ HABIT_LOGS : "logs"
    HABITS ||--o{ TASKS : "(conceptual)"
    TASKS ||--o{ JOURNAL : "(conceptual)"
```

---

## How to run (Windows examples)

1. Clone or open this project folder.
2. Create a Python virtual environment and install dependencies.

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

3. Start the server:

```powershell
python app_fixed.py
```

4. Open your browser at: http://localhost:5000

Notes:
- Place any uploaded images into `static/uploads/` (the upload endpoint will save near there).
- To enable site music, put your music file at `static/audio/stardew_theme.mp3`.

---

## Screenshots

  <div style="width:320px">
    <img src="static/img/mood.PNG" width="100%">
    <p align="center">Mood</p>
  </div>
  <div style="width:320px">
    <img src="static/img/habit.PNG" width="100%">
    <p align="center">Habit</p>
  </div>
  <div style="width:320px">
    <img src="static/img/tasks.PNG" width="100%">
    <p align="center">Tasks</p>
  </div>
  <div style="width:320px">
    <img src="static/img/journal.PNG" width="100%">
    <p align="center">Journal</p>
  </div>
</div>



## Thank you 🌟

Thanks for using the Stardew Well-Being Farm — may your days be calm, your crops plentiful, and your habits steady. If you'd like, I can help add more pages, bundle assets (fonts/music), or wire settings to a user model.

<p align="center">🍀 Happy farming! — The Tiny Farmhands</p>
