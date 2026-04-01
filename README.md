# Learning Tracker Pro

A meticulously designed, full-stack productivity and learning management application built to effortlessly track syllabus progress, monitor study analytics, and gamify the learning experience.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Premium+Learning+Dashboard)

## 🚀 The Tech Stack

**Frontend Frameworks & Ecosystem**
- **React.js (Vite)**: Lightning-fast development and optimized production builds.
- **Tailwind CSS**: Utility-first framework providing the sleek, premium design system.
- **Recharts**: Responsive SVG charting library powering the analytics dashboard.
- **React Router Dom**: Seamless client-side routing and state injection.
- **React Hot Toast**: Beautiful, highly-customizable push notifications and custom inline confirmation modals.
- **Lucide React**: Clean, modern iconography natively styled.
- **Date-fns**: Robust native date and timezone parsing.

**Backend Architecture**
- **Python FastAPI**: A modern, hyper-performant web framework for building REST APIs.
- **SQLAlchemy ORM**: Powerful database bridging for complex, aggregated subqueries.
- **Alembic**: Strict, methodical database migrations.
- **PostgreSQL**: Production-grade relational database engine.

---

## 💎 Core Features
*   **Analytics Dashboard:** Visualizing total study hours, subject-wise breakdowns, and consecutive streak mapping leveraging highly aggregated SQL subqueries.
*   **Granular Syllabus Tracking:** Subjects automatically populate with structurally segmented Learning Units. Track exactly how many 2-mark and 11-mark questions you have completed to derive absolute progress percentages.
*   **Time Logging Engine:** Log study sessions (in minutes) aggressively tied to specific subjects. The backend rejects attempts to "master" a subject if you haven't actually put any time into it!
*   **Optimistic UI Interactivity:** Satisfying, zero-latency interactions. Checkboxes animate locally in frontend memory instantaneously, quietly syncing with the server in the background for a flawless user experience.
*   **Architectural Data Integrity:** Delete actions perform safe soft-deletes (`archived_at`). Subjects vanish from your dashboard to keep your space clean, but your historical time analytics remain permanently preserved.
*   **Smart "Dropoff" Engine:** The Analytics router constantly monitors your inactivity. If a subject isn't studied for 7 days, a beautiful Action Banner drops into your Dashboard prompting you to instantly slide open its drawer and revive your streak.

---

## 🛠️ Local Development Setup

To run this application locally, you'll need both the Python backend and the Vite React frontend running simultaneously.

### 1. Backend Setup (FastAPI)

1. Navigate to the root folder (where `main.py` is located).
2. Create and activate a Virtual Environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run Alembic migrations to build your database schema:
   ```bash
   alembic upgrade head
   ```
5. Boot the ASGI Server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Setup (React/Vite)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Fire up the development server:
   ```bash
   npm run dev
   ```

*The application will render at `http://localhost:5173`.*

---

## 🧠 Architectural Highlights

The system heavily embraces React Router's `useLocation` state payloads to bridge components. For example, clicking an abandoned subject in the Dashboard injects a secure ID payload into the router. The `Subjects.jsx` component intercepts this payload instantly on-mount to execute a targeted `GET` request, violently bypassing standard pagination limits, and programmatically sliding open that precise subject's Sidebar Drawer.

All destructive actions explicitly pass through customized, localized Modal engines rather than relying on native browser `<alert()>` loops, honoring modern UI constraints.
