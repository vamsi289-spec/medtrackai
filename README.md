# MedTrack AI

> **Clinical Health & Intelligence Platform: Track &bull; Aware &bull; Stay Healthy**

MedTrack AI is a full-stack clinical healthcare and triage intelligence platform built with React, TypeScript, Tailwind CSS, Express, PostgreSQL/SQLite, and Google Gemini API.

---

## 🚀 Features

- 🔬 **Multimodal AI Vision Screening**: Upload clinical images (rashes, skin lesions, ocular signs) for preliminary dermatological triage.
- 📋 **Laboratory Report & Biomarker OCR**: Automated extraction of hematology, metabolic, and vital biomarker panels.
- ⏰ **Scheduled Health Alarms & Custom Audio**: In-browser daily health check-in notifications with custom audio ringtones.
- 📍 **GPS Pharmacy & Medical Store Locator**: Google Maps-powered finder for nearby pharmacies, hospitals, and clinics.
- 📄 **Clinical Doctor Consultation Brief**: PDF and print-ready longitudinal health briefs formatted for physician visits.
- 🛡️ **Level 4 Emergency Red-Flag Protocols**: Immediate clinical safety detection and local emergency guidance.

---

## 📦 Deployment

### Step 1: Push to GitHub
1. Export or commit this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "feat: Initial commit of MedTrack AI"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your GitHub repository from the list and click **"Import"**.
3. In the project settings, configure your **Environment Variables**:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `VITE_GOOGLE_MAPS_API_KEY`: *(Optional)* Google Maps JavaScript API Key for interactive map markers and pharmacy routing.
4. Click **Deploy**. Vercel will automatically build the frontend into `dist/` and configure the backend `/api` routes via Serverless Functions.

---

## 💻 Local Development

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   npm start
   ```
