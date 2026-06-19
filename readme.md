# FrejFit

Web MVP for creating a personalized training plan and tracking progress.

## What is included

- **Workout onboarding**
  - Home vs gym training context
  - Available equipment checklist
  - Personal stats: weight, height, age
- **Training plan generation**
  - 3-day plan generated from onboarding answers
  - Plan adapts to selected training context and equipment
- **Progress tracking**
  - Monthly photo upload (one photo per month)
  - Photo history view
  - Stats history table with BMI
- **Exercise tutorials**
  - Curated GIF exercise library from the dataset:
    - https://github.com/hasaneyldrm/exercises-dataset

## Run locally

No build step is required.

1. Open a terminal in the repository root.
2. Start a local static server:

   ```bash
   python -m http.server 8080
   ```

3. Open `http://localhost:8080`.

## Data persistence

For MVP simplicity, user profile, plan, stats history, and monthly photos are stored in browser `localStorage`.
