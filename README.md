# SAFE Personality Assessment

A dynamic, component-driven React application designed to administer the **SAFE (Sodhani Academy of Fintech Enablers Ltd.) Personality Assessment**. It maps users across 5 psychological dimensions to assign one of 16 distinct personality profiles.

## ✨ Features

- **Dynamic Questionnaire:** Supports multiple question types (5-Point Scale, 7-Point Scale, Spectrum, Single Choice, Multi-Select, and Scenarios) that seamlessly map to personality trait poles.
- **Config-Driven Scoring:** There is no hardcoded scoring logic. The entire assessment algorithm is driven by the questions' weight and score mappings defined in the admin settings.
- **Admin Dashboard:** A fully integrated, password-protected Admin Panel (`Password: admin`).
- **Real-Time Configuration Editor:** Modify questions, add custom answers, edit personality profile descriptions, and instantly see changes reflected globally in real-time.
- **Dynamic Estimates:** The app automatically calculates completion time estimates based on your active question count.
- **Local Storage Sync:** All admin changes, settings, and active test sessions are instantly synced and persisted in the browser's local storage.

## 🚀 Getting Started (Development)

To run the application locally on your machine, open your terminal and run:

```bash
npm install
npm run dev
```

> **Note for Windows PowerShell Users:** If you get an "Execution Policy" error when running `npm`, run this command as an administrator in PowerShell to permanently fix it:
> `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
> Alternatively, you can use Command Prompt (cmd) to run `npm run dev`.

The app will be available at `http://localhost:5173`.

## 📦 Building for Production

When you are ready to deploy the website to production (e.g. Vercel, Netlify, AWS, etc.):

```bash
npm run build
```

This will bundle the application into a `dist/` folder containing highly optimized, static HTML, CSS, and JS files.

## ⚙️ Architecture & Codebase

- `src/App.jsx`: The main controller and router of the app. It holds the global state and navigates between the Landing page, Test, Report, and Admin panel.
- `src/data/config.js`: The "database" of the application. It holds the default 100 questions, the 16 personality profiles, and the report sections.
- `src/engine/scoring.js`: The algorithm engine. It dynamically evaluates user answers against the active questions' scoring mapping to determine the final 4-letter personality code.
- `src/components/admin/`: Contains the modular tabs of the Admin panel (Questions, Profiles, Report, Settings).
- `src/components/questions/QuestionRenderer.jsx`: The core registry for question UI. When a new question type is needed, it is registered here, making the app highly extensible.
- `src/hooks/useStore.js`: A custom React hook that completely automates data persistence in the browser's `localStorage`.

## 🔒 Security

Currently, the Admin panel is protected by a static password (`admin`). When deploying to a public production environment, it is highly recommended to secure the `/admin` route or replace the static password with an authenticated backend service if the public should not have access to alter questions.

