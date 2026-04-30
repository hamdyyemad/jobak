# 🧠 AI Job Finder Platform

An AI-powered job-matching platform that helps users find highly relevant job opportunities based on their preferences (remote/on-site, location, field, skills, etc.). The system collects user inputs via a guided onboarding flow and triggers an automated n8n workflow to scrape, filter, and recommend jobs using AI.

---

## 🎯 Objectives
- Provide personalized job recommendations.
- Support both remote and location-based jobs.
- Automate job discovery using combined AI and web scraping workflows.
- Integrate seamlessly with external AI APIs (e.g., Grok).

---

## 🛠️ Tech Stack
- **Frontend:** React / Next.js, TailwindCSS
- **Backend:** Node.js (Express / NestJS) or Serverless
- **Automation/Workflow:** n8n
- **Database:** PostgreSQL / Supabase
- **AI Processing:** Grok API (or OpenAI fallback)

---

## 🧱 System Architecture

```text
[ Frontend (React/Next.js) ]
            ↓
[ API Layer (Backend/Serverless) ]
            ↓
[ n8n Webhook Trigger ]
            ↓
[ n8n Workflow (Scraping + AI) ]
            ↓
[ Job Results Storage (DB/Cache) ]
            ↓
[ Frontend (User Dashboard) ]
```

---

## 🧑‍💻 User Flow

### 1. Sign-Up / Login
- Email/password or OAuth (Google, LinkedIn).

### 2. Onboarding (Step-by-Step Form)
- **Step 1: Work Preference** - Remote (Worldwide), On-site (Local), or Hybrid.
- **Step 2: Location** - Country, City (optional for on-site/hybrid).
- **Step 3: Job Field** - E.g., Software Engineering, Marketing, Finance, Design.
- **Step 4: Skills & Experience** - Years of experience, key skills (tags), and technologies.
- **Step 5: Job Preferences** - Full-time/Part-time/Freelance, Salary expectations, Seniority level.
- **Step 6: AI Integration** - Input field for Grok API Key OR "Connect AI" button (sends token securely to the backend).

### 3. Submit & Trigger Workflow
Upon submission, data is sent to the backend API, which triggers the n8n webhook:

```json
POST /webhook/job-search
{
  "userId": "123",
  "workPreference": "remote",
  "location": {
    "country": "Egypt",
    "city": "Cairo"
  },
  "field": "Software Engineering",
  "skills": ["JavaScript", "React", ".NET"],
  "experience": 2,
  "jobType": "Full-time",
  "seniority": "Mid",
  "apiKey": "GROK_API_KEY"
}
```

---

## ⚙️ n8n Workflow Design

1. **Trigger:** Webhook node receives user data.
2. **Processing & Validation:** Ensures required fields exist, cleans, and normalizes data.
3. **Query Builder:** Constructs search strings (e.g., `"React Developer remote"` or `"Software Engineer Cairo .NET"`).
4. **Scraping Nodes:** Extracts job title, company, location, salary, and job link from sources like:
   - LinkedIn Jobs
   - Indeed
   - RemoteOK
   - Wuzzuf
   - Glassdoor
5. **AI Processing (Grok / LLM):** - Filters out irrelevant jobs.
   - Ranks jobs based on skills, experience, and location match.
   - *Optional:* Generates a summary and scores jobs (0–100 relevance).
6. **Output:** ```json
{
  "jobs": [
    {
      "title": "Frontend Developer",
      "company": "Company X",
      "location": "Remote",
      "score": 92,
      "link": "https://..."
    }
  ]
}
```

---

## 🗄️ Data Storage

### `Users` Table
- `id` (PK)
- `email`
- `created_at`

### `Profiles` Table
- `user_id` (FK)
- `preferences` (JSON)
- `skills` (JSON)
- `api_key` (Encrypted string)

### `Jobs` Table
- `id` (PK)
- `user_id` (FK)
- `title`
- `company`
- `location`
- `score`
- `link`
- `created_at`

---

## 🖥️ Frontend Features
- **Dashboard:** View job recommendations list, apply filters (location, salary, type), and save/bookmark jobs.
- **Notifications:** Email or in-app alerts for new high-score matches.
- **Settings:** Update job preferences, skills, and manage API keys.

---

## 🔐 Security Considerations
- **API Keys:** Symmetrically encrypt all user API keys before storing them in the database.
- **HTTPS:** Enforce TLS/HTTPS for all frontend-to-backend and backend-to-n8n communication.
- **Rate Limiting:** Protect the webhook endpoints from spam/abuse.
- **Scraping Ethics:** Respect `robots.txt` and use appropriate delays/proxies to avoid scraping violations.

---

## 🚀 Future Enhancements
- [ ] CV Upload & AI Parsing
- [ ] One-click Auto-apply feature
- [ ] AI-generated personalized cover letters
- [ ] Real-time push notifications for new job alerts
- [ ] Browser extension for quick application tracking

---

> **Note:** The priority for V1 is keeping the onboarding structured but simple, starting with 2-3 reliable job scraping sources before scaling, and prioritizing the *quality* of AI job matches over raw quantity.
