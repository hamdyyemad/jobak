# 🧠 Jobak - AI-Powered Job Matching Platform

## Project Overview

**Jobak** is an intelligent job-matching platform that leverages AI to deliver highly personalized job recommendations. The platform automates job discovery by combining user preferences with web scraping and AI filtering through n8n workflows, helping job seekers find the most relevant opportunities based on their skills, location, experience, and preferences.

---

## 🎯 Core Objectives

1. **Personalized Job Discovery**: Match users with jobs that align with their specific preferences (remote/hybrid/on-site, location, field, skills, experience level)
2. **Multi-Source Aggregation**: Scrape and aggregate jobs from multiple platforms (LinkedIn, Indeed, RemoteOK, Wuzzuf, Glassdoor, Remotive)
3. **AI-Powered Filtering**: Use Grok API (or OpenAI) to filter irrelevant jobs and score matches (0-100 relevance score)
4. **Automated Workflow**: Trigger automated job searches via n8n workflows based on user preferences
5. **User-Friendly Experience**: Provide an intuitive onboarding flow and dashboard for job management

---

## 🏗️ Technical Architecture

### Tech Stack

#### Frontend
- **Framework**: Next.js 16.2.4 (App Router)
- **UI Library**: React 19.2.4
- **Styling**: TailwindCSS 4
- **Components**: Radix UI primitives
- **Icons**: Lucide React
- **Type Safety**: TypeScript 5

#### Backend
- **API**: Next.js API Routes (serverless) + Server Actions
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (@supabase/ssr, @supabase/supabase-js)
- **Automation**: n8n workflow engine
- **AI Processing**: Grok API (user-provided keys, stored encrypted)
- **Encryption**: AES-256-GCM for API key storage

#### Infrastructure
- **Package Manager**: pnpm 9.12.0+
- **Node Version**: >=20.9.0
- **Version Control**: Git + Husky for git hooks
- **CI/CD**: GitHub Actions
- **Development**: VS Code with custom configuration

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌────────────┬──────────────┬────────────────────────────┐ │
│  │   Public   │     Auth     │        Protected           │ │
│  │  Landing   │  Login/      │   Dashboard + Onboarding   │ │
│  │   Pages    │  Register    │                            │ │
│  └────────────┴──────────────┴────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /api/v1/auth/*       │  /api/v1/webhook/job-search/*  │ │
│  │  Authentication       │  Trigger n8n workflow          │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   n8n Automation Workflow                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. Webhook Trigger → 2. Query Builder → 3. Scrapers   │ │
│  │                                                          │ │
│  │ 4. Data Normalization → 5. Deduplication               │ │
│  │                                                          │ │
│  │ 6. AI Filtering (Grok) → 7. Job Scoring (0-100)       │ │
│  │                                                          │ │
│  │ 8. Store in Database → 9. Return Results               │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (Supabase)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database:                                  │ │
│  │  • users, profiles                                     │ │
│  │  • jobs (title, company, location, score, etc.)       │ │
│  │  • sources (job platforms)                             │ │
│  │  • regions (geographic areas)                          │ │
│  │  • user_preferences (onboarding data)                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## � Authentication & Security

### Authentication Flow

The platform uses **Supabase Auth** with a three-tier client architecture:

1. **Browser Client** (`src/backend/lib/supabase/client.ts`)
   - Used in client components for auth state
   - Access via `createClient()`

2. **Server Client** (`src/backend/lib/supabase/server.ts`)
   - Used in Server Components and API routes
   - Handles SSR cookie management
   - Access via `await createClient()`

3. **Service Client** (`src/backend/lib/supabase/service.ts`)
   - Uses service role key (bypasses RLS)
   - Server-only for admin operations
   - Access via `createServiceClient()`

### Middleware Protection

The `src/middleware.ts` file implements route-based authentication:

**Protected Routes**:
- `/dashboard` - Requires auth + completed onboarding
- `/onboarding` - Requires auth, redirects if already completed

**Auth Routes**:
- `/login`, `/register`, `/forgot-password` - Redirects authenticated users

**Redirect Logic**:
```typescript
Unauthenticated → /dashboard     → /login
Authenticated   → /login         → /dashboard or /onboarding
Authenticated   → /dashboard     → /onboarding (if not completed)
Authenticated   → /onboarding    → /dashboard (if already completed)
```

### Server Actions

Authentication logic is handled via Server Actions (`src/backend/actions/auth.ts`):

- `signUp(formData)` - Creates account, redirects to onboarding
- `signIn(formData)` - Authenticates, redirects based on onboarding status
- `signOut()` - Logs out, redirects to login
- `getSession()` - Returns current session
- `getUser()` - Returns current user

### Groq API Key Encryption

User-provided Groq API keys are encrypted using **AES-256-GCM** before storage:

**Implementation** (`src/backend/lib/crypto/groq-key.ts`):
```typescript
// Encryption
const encrypted = await encryptGroqKey(plaintext);
// Format: "iv_hex:ciphertext_hex"

// Decryption
const plaintext = await decryptGroqKey(encrypted);
```

**Requirements**:
- `ENCRYPTION_SECRET` environment variable (64-char hex = 32 bytes)
- Generate with: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`

**Security Features**:
- Random IV (initialization vector) per encryption
- Key never exposed to client-side code
- Stored encrypted in `user_preferences.groq_api_key_encrypted`
- Decrypted server-side only when triggering n8n workflows

---

## �🚀 User Flow & Features

### 1. Landing Page (Public)
- **Hero Section**: Eye-catching introduction with CTA
- **How It Works**: Step-by-step explanation of the process
- **Features**: Platform benefits and unique selling points
- **Job Sources**: Display of integrated platforms
- **CTA**: Encourage sign-up

### 2. Authentication Flow

**✅ Fully Implemented**

- **Login** (`src/app/(auth)/login/page.tsx`):
  - Email/password authentication
  - Show/hide password toggle
  - "Forgot password" link
  - Loading states and error handling
  - Redirects to dashboard or onboarding based on completion status
  - Uses `signIn()` Server Action

- **Register** (`src/app/(auth)/register/page.tsx`):
  - First name, last name, email, password fields
  - Real-time password strength validation:
    - At least 8 characters
    - One uppercase letter
    - One number
  - Visual feedback for password requirements
  - Loading states and error handling
  - Uses `signUp()` Server Action
  - Always redirects to onboarding for new users

- **Forgot Password** (`src/app/(auth)/forgot-password/page.tsx`):
  - Password reset email flow
  - (To be fully implemented)

**Shared Components**:
- `AuthLayout` - Consistent layout for all auth pages
- `AuthPanel` - Left panel with branding/description
- `AuthInput` - Styled input component with label

### 3. Onboarding Flow (7-Step Process)

Protected route that collects user preferences through a guided wizard:

#### Step 1: Work Preference
- Remote (Worldwide)
- On-site (Local)
- Hybrid

#### Step 2: Location
- Country selection
- City selection (optional for remote, required for on-site/hybrid)
- Dynamically shown based on work preference

#### Step 3: Field & Skills
- Job field (e.g., Software Engineering, Marketing, Finance, Design)
- Key skills (tags/chips input)
- Technologies or frameworks

#### Step 4: Job Preferences
- Employment type: Full-time, Part-time, Freelance, Contract (multi-select)
- Seniority level: Entry, Mid, Senior, Lead

#### Step 5: Salary Expectations
- Minimum salary
- Maximum salary
- Currency selection

#### Step 6: API Integration
- Grok API Key input field
- Secure transmission to backend
- Optional: OAuth-style "Connect AI" button

#### Step 7: Review & Submit
- Summary of all selections
- Submit button triggers webhook

**Data Structure** (`OnboardingData`):
```typescript
{
  workPreference: "remote" | "on-site" | "hybrid",
  location: { country: string, city: string },
  field: string,
  skills: string[],
  experience: number,
  jobType: ("full-time" | "part-time" | "freelance" | "contract")[],
  seniority: "entry" | "mid" | "senior" | "lead",
  salary: { min: number, max: number, currency: string },
  apiKey: string
}
```

### 4. Webhook Trigger (API → n8n)

**✅ Fully Implemented** (`src/app/api/v1/webhook/job-search/route.ts`)

Upon onboarding completion, the frontend sends data to:

**Endpoint**: `POST /api/v1/webhook/job-search`

**Implementation Flow**:
1. **Authentication**: Verify user via Supabase Auth
2. **Validation**: Check required fields (workPreference, field, apiKey)
3. **Encryption**: Encrypt Groq API key using AES-256-GCM
4. **Database**: Upsert user preferences with `onboarding_completed = true`
5. **n8n Trigger**: Forward payload to n8n webhook with plaintext API key
6. **Response**: Return success or error with appropriate status codes

**Payload Example**:
```json
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
  "jobType": ["full-time"],
  "seniority": "mid",
  "salary": {
    "min": 50000,
    "max": 80000,
    "currency": "USD"
  },
  "groqApiKey": "gsk_xxxxx"  // Plaintext for n8n only
}
```

**Error Handling**:
- Returns 401 if user not authenticated
- Returns 400 for missing/invalid fields
- Returns 500 for database or encryption errors
- Returns success even if n8n fails (preferences saved, can retry)

### 5. n8n Workflow Processing

The n8n workflow (`Scrape Jobs & Store in Supabase.json`) executes the following pipeline:

#### A. Configuration Setup
- Load Grok API key
- Load Supabase credentials (URL + Service Role Key)
- Timestamp the workflow run

#### B. Web Scraping (Parallel Execution)
**Sources scraped:**
1. **Wuzzuf** (Egypt-focused): HTML parsing with JSON-LD extraction
2. **RemoteOK** (Remote jobs): API-based, filters for developer/engineer roles
3. **Remotive** (Remote jobs): API-based, software development category

**Scraping Strategy**:
- User-Agent spoofing to avoid blocks
- Continue on fail (if one source fails, others proceed)
- Always output data (empty arrays allowed)

#### C. Data Normalization
Each source has a dedicated normalization node that converts raw data to a unified schema:

```typescript
{
  title: string,
  company: string,
  location: string,
  job_type: "remote" | "onsite" | "hybrid",
  description: string, // HTML stripped, max 2000 chars
  apply_url: string,
  salary_text: string | null,
  posted_at_source: string | null,
  source_id: number, // 1=Wuzzuf, 2=RemoteOK, 3=Remotive
  region_id: number, // 1=Egypt, 2=Worldwide
  external_id: string
}
```

#### D. Merge & Deduplication
- Merge jobs from all sources
- Remove duplicates by `apply_url`
- Prepare comma-separated URL list for database lookup

#### E. Database Deduplication Check
- Query Supabase to find existing jobs: `GET /rest/v1/jobs?select=apply_url&apply_url=in.(...)`
- Filter out jobs already in database
- Prevent duplicate entries

#### F. AI Processing (Grok API)
- **Input**: User preferences + job listings
- **Process**: 
  - Filter out jobs that don't match field/skills
  - Score each job on relevance (0-100)
  - Generate match summary
- **Output**: Filtered and scored job list

#### G. Database Storage
- Bulk insert new jobs into Supabase `jobs` table
- Store user preferences in `user_preferences` table
- Link jobs to user via `user_id`

#### H. Response
Return to frontend:
```json
{
  "jobs": [
    {
      "id": "uuid",
      "title": "Frontend Developer",
      "company": "Company X",
      "location": "Remote",
      "type": "full-time",
      "salary": "$60k - $80k",
      "score": 92,
      "source": "RemoteOK",
      "link": "https://...",
      "postedAt": "2026-05-01",
      "bookmarked": false
    }
  ],
  "totalFound": 45,
  "topMatches": 12
}
```

### 6. Dashboard (Protected)

**✅ Fully Implemented**

Users view and manage their job recommendations:

**Server Component** (`src/app/(protected)/dashboard/page.tsx`):
- Fetches jobs server-side via `getUserJobs()` Server Action
- Joins `user_job_matches` with `jobs` table
- Pre-renders dashboard with initial data

**Client Component** (`src/frontend/components/protected/dashboard/dashboard-client.tsx`):
- Handles client-side interactivity
- Real-time search and filtering
- Bookmark toggling (optimistic updates)
- Job refresh trigger

#### Features:
- **Header**: Search bar + Refresh button
- **Stats Cards**: 
  - Total jobs found
  - Top matches (score >= 80)
  - Bookmarked jobs
  - Sources count
- **Filters**: 
  - All sources
  - LinkedIn
  - Indeed
  - RemoteOK
  - Wuzzuf
  - Glassdoor
- **Job Cards**: Display with:
  - Title & company
  - Location & job type
  - Salary
  - Relevance score badge (color-coded)
  - Bookmark button
  - "Apply Now" link
- **Empty State**: Shown when no jobs match filters
- **Refresh CTA**: Button to trigger new job search

**Job Data Structure**:
```typescript
{
  id: string,
  title: string,
  company: string,
  location: string,
  type: "full-time" | "part-time" | "freelance" | "contract",
  salary: string,
  score: number, // 0-100
  source: "LinkedIn" | "Indeed" | "RemoteOK" | "Wuzzuf" | "Glassdoor",
  link: string,
  postedAt: string,
  bookmarked: boolean
}
```

### 7. Job Refresh

**✅ Implemented** (`src/app/api/v1/jobs/refresh/route.ts`)

Users can manually trigger a new job search from the dashboard:

**Endpoint**: `POST /api/v1/jobs/refresh`

**Flow**:
1. Verify user authentication
2. Fetch user preferences from database (including encrypted Groq API key)
3. Decrypt Groq API key
4. Trigger n8n workflow with existing preferences
5. n8n scrapes fresh jobs and updates database
6. User sees new results on next dashboard load

**Usage**:
- Dashboard "Refresh" button
- Custom hook: `use-job-refresh.ts`
- Shows loading state during refresh
- Handles errors gracefully

---

## 📁 Project Structure

```
jobak/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (public)/            # Public landing pages
│   │   │   ├── layout.tsx       # Public layout
│   │   │   └── page.tsx         # Home page
│   │   ├── (auth)/              # Auth pages (login, register, forgot-password)
│   │   │   ├── layout.tsx       # Auth layout
│   │   │   ├── login/page.tsx   # ✅ Fully implemented
│   │   │   ├── register/page.tsx # ✅ Fully implemented
│   │   │   └── forgot-password/page.tsx
│   │   ├── (protected)/         # Protected routes (auth required)
│   │   │   ├── layout.tsx       # Protected layout
│   │   │   ├── onboarding/page.tsx # ✅ Fully functional
│   │   │   └── dashboard/page.tsx  # ✅ Fully functional
│   │   ├── api/                 # API routes
│   │   │   ├── health/          # Health check endpoint
│   │   │   └── v1/
│   │   │       └── webhook/
│   │   │           └── job-search/
│   │   │               └── route.ts # ✅ Webhook handler
│   │   │       └── jobs/
│   │   │           └── refresh/
│   │   │               └── route.ts # ✅ Refresh endpoint
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Global styles
│   │   └── favicon.ico
│   ├── middleware.ts            # ✅ Auth middleware (route protection)
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── public/          # Landing page components
│   │   │   │   ├── home/        # Hero, Features, HowItWorks, CTA
│   │   │   │   │   ├── hero/    # Hero section components
│   │   │   │   │   ├── features/ # Features section
│   │   │   │   │   ├── how-it-work✅ Dashboard components
│   │   │   │   │   ├── dashboard-header.tsx
│   │   │   │   │   ├── dashboard-stats.tsx
│   │   │   │   │   ├── dashboard-client.tsx # ✅ Client wrapper
│   │   │   │   │   ├── job-card.tsx
│   │   │   │   │   ├── job-list.tsx
│   │   │   │   │   ├── job-filters.tsx
│   │   │   │   │   ├── score-badge.tsx
│   │   │   │   │   ├── empty-state.tsx
│   │   │   │   │   ├── refresh-cta.tsx
│   │   │   │   │   ├── data.ts          # Mock/constant data
│   │   │   │   │   └── index.ts
│   │   │   │   ├── onboarding/  # ✅ 7-step onboarding components
│   │   │   │   │   ├── onboarding-header.tsx
│   │   │   │   │   ├── onboarding-navigation.tsx
│   │   │   │   │   ├── step-header.tsx
│   │   │   │   │   ├── step-work-preference.tsx
│   │   │   │   │   ├── step-location.tsx
│   │   │   │   │   ├── step-field-skills.tsx
│   │   │   │   │   ├── step-job-preferences.tsx
│   │   │   │   │   ├── step-salary.tsx
│   │   │   │   │   ├── step-api-key.tsx
│   │   │   │   │   ├── data.ts          # Step titles & descriptions
│   │   │   │   │   ├── styles.ts        # Shared styles
│   │   │   │   │   └── index.ts
│   │   │   │   └── shared/
│   │   │   ├── ui/              # Reusable UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── animated-sphere.tsx
│   │   │   │   ├── gradient-orb.tsx
│   │   │   │   └── index.ts
│   │   │   └── wrappers/        # Layout wrappers
│   │   │       ├── animated-backgr✅ Custom React hooks
│   │   │   ├── index.ts
│   │   │   ├── auth/
│   │   │   ├── protected/
│   │   │   │   ├── dashboard/   # ✅ Dashboard hooks
│   │   │   │   │   ├── use-jobs.ts          # Job data & bookmarks
│   │   │   │   │   ├── use-job-filters.ts   # Search & filtering
│   │   │   │   │   ├── use-job-refresh.ts   # Refresh functionality
│   │   │   │   │   └── index.ts
│   │   │   │   └── onboarding/  # ✅ Onboarding hooks
│   │   │   │       ├── use-onboarding-form.ts    # Form state
│   │   │   │       ├── use-onboarding-step.ts    # Step navigation
│   │   │   │       ├── use-onboarding-submit.ts  # Submission logic
│   │   │   │       ├── use-skills-manager.ts     # Skills management
│   │   │   │       └── index.ts
│   │   │   ├── public/
│   │   │   └── ui/              # ✅ UI utility hooks
│   │   │       ├── use-auto-rotate.ts
│   │   │       ├── use-body-scroll-lock.ts
│   │   │       ├── use-canvas-sphere.ts
│   │   │       ├── use-cycle-index.ts
│   │   │       ├── use-intersection-visible.ts
│   │   │       index.ts
│   │   │   ├── configs/         # App configuration
│   │   │   │   ├── metadata.ts  # SEO metadata
│   │   │   │   └── navigation.ts # Navigation links
│   │   │   ├── styles/          # Style utilities
│   │   │   │   └── fonts.ts
│   │   │   └── utils/
│   │   │       └── utils.ts     # cn() for classnames
│   │   ├── providers/
│   │   │   ├── root-provider.tsx # Global providers wrapper
│   │   │   └── index.ts
│   │   └── types/
│   │       ├── on-boarding.ts   # OnboardingData types
│   supabase/                    # ✅ Supabase configuration
│   └── schema.sql               # Complete database schema
├── public/                      # Static assets
├── docs/                        # Documentation
├── .github/                     # ✅ GitHub configuration
│   └── workflows/
│       ├── ci.yml               # Build & test workflow
│       └── weekly-audit.yml     # Security audit
├── .husky/                      # ✅ Git hooks
│   ├── pre-commit
│   └── pre-push
├── .vscode/                     # ✅ VS Code configuration
│   ├── settings.json
│   ├── launch.json
│   └── mcp.json
├── Scrape Jobs & Store in Supabase (4).json  # n8n workflow export
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── .gitignore
├── AGENTS.md                    # Next.js agent rules
├── CLAUDE.md                    # Development instructions
├── PROJECT_OVERVIEW.md          # This file
├── LICENSE
│               └── groq-key.ts  # AES-256-GCM for Groq API keys
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── auth/
│   │   │   ├── protected/
│   │   │   │   ├── dashboard/   # useJobs, useJobFilters, useJobRefresh
│   │   │   │   └── onboarding/  # useOnboardingForm, useOnboardingStep
│   │   │   └── ui/              # UI utility hooks
│   │   ├── lib/
│   │   │   ├── configs/         # App configuration
│   │   │   │   ├── metadata.ts  # SEO metadata
│   │   │   │   └── navigation.ts # Navigation links
│   │   │   ├── styles/          # Style utilities
│   │   │   │   └── fonts.ts
│   │   │   └── utils/
│   │   │       └── utils.ts     # cn() for classnames
│   │   ├── providers/
│   │   │   └── root-provider.tsx # Global providers wrapper
│   │   └── types/
│   │       ├── on-boarding.ts   # OnboardingData types
│   │       └── dashboard.ts     # Job, Source types
│   └── backend/                 # Backend utilities (to be implemented)
├── public/                      # Static assets
├── docs/                        # Documentation
├── Scrape Jobs & Store in Supabase (4).json  # n8n workflow export
├── package.json
├── pnpm-workspace.yaml
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── AGENTS.md                    # Next.js agent rules
├── CLAUDE.md                    # Development instructions
└── README.md
```

---

## 🎨 UI/UX Design Patterns

### Design System
- **Colors**: CSS custom properties (`--bg-canvas`, etc.)
- **Typography**: Custom fonts via `fonts.ts`
- **Components**: Radix UI primitives for accessibility
- **Animations**: 
  - Animated spheres/orbs for visual interest
  - Diagonal patterns for backgrounds
  - Intersection observers for scroll effects
  - Auto-rotating elements

### Component Architecture
- **Atomic Design**: UI → Components → Pages
- **Feature-Based**: Components organized by feature (auth, dashboard, onboarding)
- **Reusability**: Shared components in `ui/` and `shared/`
- **Custom Hooks**: Business logic separated from presentation

### Styling Approach
- **Utility-First**: TailwindCSS 4 for rapid development
- **Type-Safe**: CVA (Class Variance Authority) for component variants
- **Responsive**: Mobile-first design
- **Dark Mode Ready**: CSS custom properties support

---

## 🛠️ Implementation Roadmap

### Phase 1: Foundation (✅ Completed)
- [x] Next.js 16 project setup with App Router
- [x] TailwindCSS 4 configuration
- [x] TypeScript configuration
- [x] Basic project structure
- [x] Landing page components (Hero, Features, How It Works, CTA)
- [x] Auth page layouts (Login, Register, Forgot Password)
- [x] Onboarding page structure (7 steps)
- [x] Dashboard page structure
- [x] Component library (UI primitives)
- [x] Custom hooks structure
- [x] Type definitions

### Phase 2: Backend Integration (✅ Completed)
- [x] Supabase project setup
  - [x] Database schema design (`supabase/schema.sql`)
  - [x] Tables: sources, regions, jobs, user_preferences, user_job_matches
  - [x] Row-level security policies (RLS enabled on all tables)
  - [x] Database functions and triggers (updated_at trigger)
  - [x] Indexes for performance optimization
- [x] Authentication implementation
  - [x] Supabase Auth integration (@supabase/ssr, @supabase/supabase-js)
  - [x] Server Actions for auth (`src/backend/actions/auth.ts`)
  - [x] Session management with cookies
  - [x] Protected route middleware (`src/middleware.ts`)
  - [x] Three-tier Supabase client architecture:
    - Browser client (`src/backend/lib/supabase/client.ts`)
    - Server client (`src/backend/lib/supabase/server.ts`)
    - Service client (`src/backend/lib/supabase/service.ts`)
- [x] Groq API Key Security
  - [x] AES-256-GCM encryption implementation (`src/backend/lib/crypto/groq-key.ts`)
  - [x] Encrypted storage in database
  - [x] Secure decrypt for n8n workflow triggers
- [x] n8n workflow
  - [x] Workflow JSON export (`Scrape Jobs & Store in Supabase (4).json`)
  - [x] Webhook integration configured
  - [x] Ready for deployment
- [x] API endpoints
  - [x] `/api/v1/webhook/job-search` - Onboarding submission & n8n trigger
  - [x] `/api/v1/jobs/refresh` - Refresh job search from dashboard
  - [x] Input validation and error handling
  - [x] Authentication checks
- [x] Server Actions
  - [x] Auth actions (signUp, signIn, signOut, getSession, getUser)
  - [x] Job actions (getUserJobs, toggleBookmarkAction)

### Phase 3: Core Features (✅ Completed)
- [x] Onboarding workflow completion
  - [x] 7-step form with validation
  - [x] State management via custom hooks
  - [x] API integration with webhook
  - [x] Onboarding completion flag in database
  - [x] Success/error handling with user feedback
  - [x] Custom hooks:
    - `use-onboarding-form.ts` - Form state management
    - `use-onboarding-step.ts` - Step navigation and progress
    - `use-onboarding-submit.ts` - Submission logic
    - `use-skills-manager.ts` - Skills input management
- [x] Dashboard functionality
  - [x] Fetch jobs from Supabase via Server Actions
  - [x] Real-time client-side search/filtering
  - [x] Bookmark functionality (persisted to database)
  - [x] Refresh job search (triggers n8n workflow)
  - [x] Job scoring and sorting (0-100 relevance)
  - [x] Custom hooks:
    - `use-jobs.ts` - Job data and bookmark logic
    - `use-job-filters.ts` - Search and filter state
    - `use-job-refresh.ts` - Refresh job search
  - [x] Dashboard components:
    - `dashboard-header.tsx` - Search bar and refresh button
    - `dashboard-stats.tsx` - Statistics cards
    - `job-filters.tsx` - Source filter tabs
    - `job-list.tsx` - Job listing display
    - `job-card.tsx` - Individual job card
    - `score-badge.tsx` - Relevance score display
    - `empty-state.tsx` - No results state
    - `refresh-cta.tsx` - Refresh call-to-action
    - `dashboard-client.tsx` - Client wrapper component
- [ ] Job detail page (📋 Planned)
  - [ ] Full job description view
  - [ ] Company information
  - [ ] Application tracking
  - [ ] Similar jobs recommendations

### Phase 4: AI Enhancement (� In Progress)
- [x] Grok API integration
  - [x] Secure API key storage (AES-256-GCM encrypted)
  - [x] User-specific API keys stored in database
  - [x] API key passed to n8n workflow for AI processing
  - [ ] Job relevance scoring algorithm (implemented in n8n)
  - [ ] Skills matching logic (implemented in n8n)
  - [ ] Location-based filtering (implemented in n8n)
  - [ ] Salary range matching (implemented in n8n)
- [ ] OpenAI fallback
  - [ ] Alternative AI provider
  - [ ] Same scoring interface
  - [ ] Cost optimization
- [ ] Job description summarization
- [ ] Cover letter generation (optional)
- [ ] Resume optimization suggestions (optional)

### Phase 5: User Experience (📋 Planned)
- [ ] Email notifications
  - [ ] New job matches
  - [ ] Daily/weekly digest
  - [ ] Application reminders
- [ ] User profile management
  - [ ] Edit preferences
  - [ ] Update skills
  - [ ] Change API key
- [ ] Application tracking
  - [ ] Applied jobs history
  - [ ] Application status
  - [ ] Interview scheduling
- [ ] Analytics dashboard
  - [ ] Job search statistics
  - [ ] Match quality trends
  - [ ] Application success rate
x] CI/CD pipeline
  - [x] GitHub Actions workflow (`.github/workflows/ci.yml`)
  - [x] Build and test automation
  - [x] Runs on staging and main branches
  - [x] Concurrent workflow management
  - [ ] Weekly security audit (`.github/workflows/weekly-audit.yml`)
- [x] Development tooling
  - [x] Husky git hooks (`.husky/pre-commit`, `.husky/pre-push`)
  - [x] VS Code configuration (`.vscode/settings.json`, `.vscode/launch.json`)
  - [x] MCP configuration (`.vscode/mcp.json`)
- [
### Phase 6: Scaling & Optimization (📋 Future)
- [ ] Performance optimization
  - [ ] Server-side caching
  - [ ] Database query optimization
  - [ ] Image optimization
  - [ ] Code splitting
- [ ] SEO optimization
  - [ ] Dynamic metadata
  - [ ] Sitemap generation
  - [ ] Structured data
  - [ ] Open Graph tags
- [ ] Multi-language support
- [ ] Additional job sources
  - [ ] LinkedIn API (if available)
  - [ ] Indeed API
  - [ ] Glassdoor scraping
  - [ ] Regional job boards
- [ ] Mobile app (React Native)

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.9.0 (optional)

# Encryption (generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))")
ENCRYPTION_SECRET=your_64_char_hex_string

# App (optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate ENCRYPTION_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
1. **Clone the repository**:
```bash
git clone https://github.com/hamdyyemad/jobak.git
cd jobak
```

2. **Install dependencies**:
```bash
pnpm install
```

3. **Environment setup**:
Create `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# n8n
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_WEBHOOK_SECRET=your_webhook_secret

# AI APIs
GROK_API_KEY=your_grok_api_key
OPENAI_API_KEY=your_openai_api_key (optional fallback)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Run development server**:
```bash
pnpm dev
```

5. **Open bra Supabase project** at https://supabase.com

2. **Run the database schema**:
   - Open the Supabase SQL Editor
   - Copy and paste the entire contents of `supabase/schema.sql`
   - Execute the SQL

   The schema includes:
   - **sources** table with pre-populated data (Wuzzuf, RemoteOK, Remotive)
   - **regions** table with pre-populated data (Egypt, Worldwide)
   - **jobs** table with indexes for performance
   - **user_preferences** table with encrypted Groq API key storage
   - **user_job_matches** table for personalized results
   - **Row-Level Security (RLS)** policies on all tables
   - **Triggers** for automatic `updated_at` timestamps

3. **Get your API keys**:
   - Go to Settings → API
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon/public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

4. **Configure authentication** (optional):
   - Go to Authentication → Providers
   - Enable Email provider (default)
   - Optionally enable OAuth providers (Google, GitHub, etc.)ATE INDEX idx_jobs_apply_url ON jobs(apply_url);
CREATE INDEX idx_jobs_source_id ON jobs(source_id);
CREATE INDEX idx_jobs_scraped_at ON jobs(scraped_at DESC);
CREATE INDEX idx_user_job_matches_user_id ON user_job_matches(user_id);
CREATE INDEX idx_user_job_matches_score ON user_job_matches(score DESC);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

2. **Set up Row-Level Security (RLS)**:
Enable RLS on all tables and create policies:
```sql
-- Example: User can only read their own matches
ALTER TABLE user_job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches"
  ON user_job_matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own matches"
  ON user_job_matches FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 🔐 Security Considerations

### ✅ Implemented Security Features

1. **API Keys**:
   - ✅ Grok API keys encrypted with AES-256-GCM before database storage
   - ✅ 32-byte encryption secret required in environment variables
   - ✅ Keys never exposed in client-side code
   - ✅ Decrypted server-side only when triggering workflows

2. **Authentication**:
   - ✅ Supabase Auth with SSR cookie management
   - ✅ Protected route middleware (`src/middleware.ts`)
   - ✅ HTTP-only cookies for session tokens
   - ✅ Server Actions for secure auth operations
   - ✅ Session refresh on server-side requests

3. **Database Security**:
   - ✅ Row-Level Security (RLS) enabled on all tables
   - ✅ Users can only access their own data
   - ✅ Service role client used only server-side
   - ✅ Prepared statements (via Supabase client) prevent SQL injection

4. **API Security**:
   - ✅ Authentication checks on all protected endpoints
   - ✅ Input validation and sanitization
   - ✅ Error messages don't leak sensitive information
   - ✅ n8n webhook secret (optional) for verification

### 📋 Planned Security Enhancements

5. **Rate Limiting**:
   - [ ] Limit webhook triggers per user (e.g., 1 per hour)
   - [ ] Prevent abuse of scraping workflows
   - [ ] Implement API quotas per user tier

6. **Data Privacy**:
   - [ ] GDPR compliance documentation
   - [ ] Data export functionality
   - [ ] Account deletion with data cleanup
   - [ ] Privacy policy and terms of service

7. **Monitoring & Logging**:
   - [ ] Failed login attempt tracking
   - [ ] Suspicious activity alerts
   - [ ] Audit logs for sensitive operations

8. **Web Scraping Ethics**:
   - ⚠️ Respect robots.txt files
   - ⚠️ Implement polite scraping (delays, user agents)
   - ⚠️ Cache results to reduce load
   - ⚠️ Consider official APIs where available

---

## 📊 Success Metrics

### User Engagement
- Sign-up conversion rate
- Onboarding completion rate
- Daily/monthly active users
- Average session duration

### Job Matching Quality
- Average match score
- User feedback on recommendations
- Click-through rate on job listings
- Application success rate

### System Performance
- Scraping success rate per source
- Average workflow execution time
- Database query performance
- API response times

---

## 🤝 Contributing

This is currently a personal project by **Hamdy Emad**. 

If you'd like to contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 📧 Contact

**Author**: Hamdy Emad  
**Email**: hamdy.emad@aol.com  
**GitHub**: [@hamdyyemad](https://github.com/hamdyyemad)

---

## 🎉 Acknowledgments

- **n8n** for workflow automation capabilities
- **Supabase** for backend infrastructure
- **Vercel/Next.js** team for the amazing framework
- **RemoteOK, Remotive, Wuzzuf** for job data sources
- **Grok API** for AI-powered matching

---

## 📚 Additional Resources

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [n8n Documentation](https://docs.n8n.io/)
- [Supabase Guides](https://supabase.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Grok API Docs](https://docs.x.ai/)

---

## 📊 Current Project Status

### ✅ Fully Implemented (Ready for Testing)

1. **Frontend**:
   - ✅ Landing page with hero, features, how-it-works, CTA sections
   - ✅ Login and registration pages with validation
   - ✅ 7-step onboarding flow with all components
   - ✅ Dashboard with job listing, filtering, search, bookmarking
   - ✅ Responsive design and animations
   - ✅ Custom hooks for all major features

2. **Backend**:
   - ✅ Supabase database schema with all tables
   - ✅ Row-Level Security policies
   - ✅ Authentication system (sign up, sign in, sign out)
   - ✅ Route protection middleware
   - ✅ Server Actions for auth and jobs
   - ✅ Three-tier Supabase client architecture

3. **API Layer**:
   - ✅ `/api/v1/webhook/job-search` - Onboarding submission & n8n trigger
   - ✅ `/api/v1/jobs/refresh` - Manual job search refresh
   - ✅ Input validation and error handling
   - ✅ Authentication checks

4. **Security**:
   - ✅ AES-256-GCM encryption for Groq API keys
   - ✅ Encrypted storage in database
   - ✅ Server-side only decryption
   - ✅ Protected routes with middleware

5. **DevOps**:
   - ✅ GitHub Actions CI/CD workflow
   - ✅ Husky pre-commit and pre-push hooks
   - ✅ VS Code configuration and debugging setup

### 🚧 In Progress (Integration & Testing)

1. **n8n Workflow**:
   - ⚠️ Workflow JSON exported and ready
   - ⚠️ Needs deployment to n8n instance
   - ⚠️ Needs configuration with Groq API and Supabase credentials
   - ⚠️ Needs testing of all scraping nodes
   - ⚠️ AI scoring logic to be implemented

2. **Job Scraping**:
   - ⚠️ Wuzzuf scraper (HTML parsing)
   - ⚠️ RemoteOK scraper (API-based)
   - ⚠️ Remotive scraper (API-based)
   - ⚠️ Data normalization and deduplication

3. **End-to-End Testing**:
   - ⚠️ User sign-up → onboarding → job results flow
   - ⚠️ Dashboard refresh functionality
   - ⚠️ Bookmark persistence
   - ⚠️ Error handling and edge cases

### 📋 Planned (Future Enhancements)

1. **Features**:
   - Job detail pages
   - Application tracking
   - Email notifications
   - Profile editing
   - Analytics dashboard

2. **AI Enhancements**:
   - Job description summarization
   - Cover letter generation
   - Resume optimization

3. **Optimization**:
   - Performance improvements
   - SEO optimization
   - Multi-language support
   - Additional job sources

### 🎯 Next Steps

1. **Deploy n8n Workflow**:
   - Import `Scrape Jobs & Store in Supabase (4).json` to n8n
   - Configure Groq API key
   - Configure Supabase URL and service role key
   - Test webhook endpoint

2. **Test Complete Flow**:
   - Create test user account
   - Complete onboarding with all 7 steps
   - Verify webhook triggers n8n
   - Verify jobs appear in database
   - Verify jobs display in dashboard

3. **Implement AI Scoring**:
   - Add Groq API integration to n8n workflow
   - Implement relevance scoring (0-100)
   - Test job filtering and ranking

4. **Production Deployment**:
   - Deploy to Vercel/production environment
   - Configure environment variables
   - Set up monitoring and error tracking
   - Add rate limiting and security headers

---

*Last Updated: May 2, 2026*
