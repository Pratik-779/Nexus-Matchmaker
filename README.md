# Nexus-Matchmaker

A full-stack, two-sided marketplace that matches **content creators** with specialised **freelancers**. A creator describes what they need in plain English, the backend scores every freelancer and returns a ranked shortlist with a match percentage. From there the relationship continues inside the app: apply for a job, hire, chat live, and manage work on a shared Kanban board.

The project is built as a Data Structures & Algorithms demonstration — hash maps for identity, priority ordering for rankings, a bipartite graph for relationships, a linked-list model for task movement, TimSort for feeds, and WebSockets for real-time updates.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [How to use it](#how-to-use-it)
- [API reference](#api-reference)
- [Real-time events](#real-time-events)
- [Data structures used](#data-structures-used)
- [Testing](#testing)
- [Optional MongoDB + Gemini variant](#optional-mongodb--gemini-variant)
- [Known limitations](#known-limitations)
- [Future scope](#future-scope)

---

## Features

- **Smart match search** — type a plain-English need (e.g. *"I need a video editor"*) and get the top 20 freelancers ranked by a transparent score. Irrelevant prompts trigger a *No Match Found* state with suggestions.
- **Two role-specific dashboards** — separate workspaces for creators and freelancers.
- **Job posts** — creators post hirings with budget, description and required skills; freelancers see a dynamic **% Match** on every open job.
- **Applications with review** — freelancers apply to jobs; creators can **Hire** or **Reject** each applicant. Rejections are persisted and the freelancer is notified live.
- **Hiring state machine** — a hire offer is *pending* until the freelancer accepts; accepting activates the collaboration, sets the job to `in-progress` and assigns the freelancer. Declining, leaving and unhiring are all handled.
- **Live chat** — Socket.io rooms deliver messages instantly, with a REST fallback and a canonical chat ID so a creator/freelancer pair can never create duplicate threads.
- **Shared Kanban board** — tasks move between `todo`, `inprogress` and `done` and sync across browsers in real time.
- **Live notifications** — new applications, hire offers, accept/decline, unhire, new jobs, new users, new messages and rejections push to the right room without polling or page reloads.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (dark theme), vanilla JavaScript ES6+ |
| Backend | Node.js + Express.js, single process on port **5000** |
| Real time | Socket.io (WebSockets) |
| Data | In-memory JavaScript `Map` objects (hash tables) |
| AI / NLP | Deterministic local token scoring (default); optional Google Gemini intent extraction (MongoDB variant) |
| Persistence | None in default mode; optional MongoDB + Mongoose |

The backend serves the static website itself, so there is no separate frontend dev server and no build step.

---

## Project structure

```
.
├── index.html                    # Landing page, health badge, login / signup
├── creator.html                  # Creator discovery page (smart match search)
├── creator-dashboard.html        # Creator workspace (jobs, applications, hires, tasks)
├── freelancer.html               # Standalone freelancer page (legacy sorting demo)
├── freelancer-dashboard.html     # Freelancer workspace (gigs, offers, job feed, tasks)
├── chat.html                     # Shared inbox and live chat
├── dsa-concepts.html             # Interactive DSA teaching page
├── css/
│   └── style.css                 # Shared dark theme
├── js/
│   ├── creator.js                # Smart match UI
│   ├── creator-dashboard.js      # Creator dashboard logic
│   ├── freelancer.js             # Legacy freelancer page logic
│   └── freelancer-dashboard.js   # Freelancer dashboard logic
├── server/
│   ├── server-lightweight.js     # DEFAULT backend (in-memory, all features)
│   ├── server.js                 # Optional MongoDB + Gemini backend
│   ├── server-inmemory.js        # Legacy in-memory variant
│   ├── seed.js                   # MongoDB seeder
│   ├── models/                   # Mongoose schemas (optional variant)
│   ├── routes/                   # Express routers (optional variant)
│   └── package.json              # Dependencies and scripts
├── test-features.js              # Main API smoke test (15 checks)
├── test-reject.js                # Rejection-flow smoke test (10 checks)
└── README.md
```

---

## Quick start

Requirements: **Node.js 18+** and npm.

```bash
cd server
npm install
npm start                         # runs node server-lightweight.js
```

Then open **http://localhost:5000**.

- Health check: <http://localhost:5000/api/health>
- The website and the API share the same port.
- On startup the server seeds **50 freelancers, 51 creators and 12 open jobs**. It prints the counts to the console.
- **All data is in memory and resets on every server restart.**

For auto-reload during development: `npm run dev` (uses nodemon).

If port 5000 is already in use, stop the existing process first:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen |
  Select-Object -ExpandProperty OwningProcess |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

---

## Demo accounts

Every seeded account uses the password **`password`**. Login also requires selecting the correct role.

| Role | Username | Password | Notes |
|---|---|---|---|
| Creator | `admin` | `password` | Demo admin (`creator_1`), owns no job posts |
| Creator | `techguru` | `password` | Owns `job_1` — best account for testing applications and rejection |
| Freelancer | `pratik` | `password` | Video editor (`freelancer_1`) |

Other seeded usernames include `sarahvlogs`, `gamingpro` and `podcastpro` (creators) and `sarah_editor`, `mike_thumbnails`, `noah_podcast`, `luna_gaming` (freelancers). Seeded emails follow `<username>@nexus.dev`.

New signups require a **`@gmail.com`** email address and get ID `101` or higher.

---

## How to use it

### Creator flow

1. Log in as a creator (use `techguru` to see applications on the seeded job).
2. From the dashboard, open the **AI Smart Match** page (`creator.html`) and search e.g. *"I need a video editor"*, *"thumbnail designer"*, *"podcast editing"*.
3. Post a job from the dashboard with a title, description, budget and required skills.
4. Open **Applications to Your Jobs**. Each applicant has:
   - **Hire** — sends a pending hire offer the freelancer must accept.
   - **✕ Reject** — rejects the application. The card turns red, the freelancer is notified live, and re-applying is blocked.
   - **💬 Message** — opens the shared chat thread.

### Freelancer flow

1. Log in as a freelancer (e.g. `pratik`).
2. Browse the **open hirings** feed; each job shows a server-computed **% Match**.
3. Use the sort dropdown for **Best Match** or **Highest Budget**.
4. Toggle **Available for Hire** to update your profile instantly.
5. Click **Apply** on a job — a conversation is created immediately.
6. If the creator rejects you, the badge changes to **✕ Not accepted** and a toast appears. You can still message the creator.

### Hiring and collaboration

1. Creator clicks **Hire** → collaboration becomes `pending`, freelancer gets a **Hire Offer** notification.
2. Freelancer **accepts** → collaboration becomes `active`, linked job becomes `in-progress` with an assigned freelancer, conversation becomes `hired`, both sides receive `hireAccepted`.
3. Declining, leaving or unhiring reopens the job and emits the matching live event.

### Chat and Kanban

- `chat.html` supports `?chat=<chatId>` (open an existing thread) and `?with=<userId>` (create or find one).
- Open a collaboration's Kanban board in two browser windows and drag a task from *To Do* to *In Progress* — the other window updates instantly via `taskUpdate`.

---

## API reference

Base URL: `http://localhost:5000`

### Auth & users

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login by username, password and user type |
| POST | `/api/auth/signup` | Register a creator or freelancer (Gmail only) |
| GET | `/api/auth/me/:id` | Get a public user profile |
| GET | `/api/creators` | List creators (filter: `search`, `limit`) |
| GET | `/api/freelancers` | List freelancers (filters: `role`, `available`, `search`, `limit`) |
| GET | `/api/users/:id` | Get a user by ID |
| PATCH | `/api/users/:id/availability` | Toggle `isAvailable` |
| PATCH | `/api/users/:id/profile` | Update profile fields |

### Discovery & jobs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai-match/search` | Rank freelancers for a prompt (top 20) |
| GET | `/api/jobs` | List jobs (filters: `status`, `creatorId`, `freelancerId`, `limit`) |
| GET | `/api/jobs/:id` | Get one job |
| POST | `/api/jobs` | Create a job posting |
| PATCH | `/api/jobs/:id/status` | Update job status |
| POST | `/api/jobs/:id/apply` | Apply to a job (opens a conversation) |
| GET | `/api/applications/creator/:creatorId` | Applications to a creator's jobs |
| GET | `/api/applications/freelancer/:freelancerId` | Applications sent by a freelancer |
| PATCH | `/api/applications/:jobId/:freelancerId/reject` | Creator rejects an applicant |

### Collaborations, chat & health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/collaborations/creator/:creatorId` | Creator's collaborations |
| GET | `/api/collaborations/freelancer/:freelancerId` | Freelancer's collaborations |
| GET | `/api/collaborations/pending/freelancer/:freelancerId` | Pending hire offers |
| POST | `/api/collaborations/hire` | Create a pending hire offer |
| PATCH | `/api/collaborations/:collabId/respond` | Freelancer accepts or declines |
| PATCH | `/api/collaborations/:collabId` | Save Kanban tasks |
| DELETE | `/api/collaborations/:collabId` | Creator unhires a freelancer |
| GET | `/api/conversations/:userId` | List a user's conversations |
| POST | `/api/conversations` | Create or find a conversation |
| GET | `/api/messages/:chatId` | Load message history |
| POST | `/api/messages/:chatId` | Send a message (REST fallback) |
| GET | `/api/health` | Server status and record counts |

---

## Real-time events

Rooms: `creator_<id>`, `freelancer_<id>`, `chat_<chatId>`.

**Client → server**

`joinCreatorRoom`, `joinFreelancerRoom`, `joinChatRoom`, `sendMessage`, `taskMoved`

**Server → client**

| Event | Trigger |
|---|---|
| `newApplication` | Freelancer applies to a job |
| `applicationRejected` | Creator rejects an application |
| `newHireOffer` | Creator sends a hire offer |
| `hireAccepted` / `hireDeclined` / `hireLeft` | Freelancer responds or leaves |
| `freelancerUnhired` | Creator removes a freelancer |
| `newJob` / `newUser` | New posting or registration |
| `newMessage` / `conversationUpdated` | Chat activity |
| `taskUpdate` | Kanban task moved |

The frontend responds to events by re-fetching the affected data, which keeps every open tab consistent.

---

## Data structures used

| Concept | Where | What it does | Complexity |
|---|---|---|---|
| Hash table (`Map`) | `db` in the server | Stores users, jobs, collaborations, conversations and messages by ID | O(1) average get/set, O(n) space |
| Set | Stop words, chat message dedup | Membership checks | O(1) average |
| Tokenising + string matching | Match scoring | Lowercase, strip punctuation, remove stop words, bidirectional `includes()` | O(n·k·m) across candidates |
| Priority ordering | Match search and job feed | Score all candidates, sort descending, take top 20 | O(n log n) |
| TimSort | Dashboards | Native `Array.sort()` by match score or budget | O(n log n), O(n) on nearly sorted data |
| Bipartite graph (conceptual) | Users + jobs/collaborations | Creators and freelancers are disjoint sets; relationships are edges stored as IDs | — |
| Linked list (conceptual) | Kanban columns | `splice` + `push` moves a task between columns | O(1) move after O(k) locate |
| Canonical hashing | `getChatId()` | Sort both IDs and join with `__` to prevent duplicate threads | O(1) |

> **Note:** "max-heap" is the conceptual priority model; the implementation uses a descending sort. There is no binary heap or adjacency list in the code.

### Match scoring

- **Freelancer search:** base 45; role token +24; skill +12; bio +5; zero hits +5; rating bonus up to +10; available +10; clamped to 40–99; top 20 returned. A prompt with no content-creation keyword, or a top score below 58, shows *No Match Found*.
- **Job feed:** base 40; per required skill — role +22, skill +16, bio +6; rating up to +10; available +10; clamped to 35–99. The UI splits results at 70% into *Best Matches* and *Other Opportunities*.

---

## Testing

With the server running:

```bash
node test-features.js     # main smoke test — 15 checks
node test-reject.js       # rejection flow — 10 checks
```

`test-features.js` exercises search, directories, availability, profile updates, applying, chat messages, job creation and health. `test-reject.js` verifies application visibility, ownership checks (403 for the wrong creator), persistence of the rejection, the freelancer feed status and the re-apply block.

Measured results on a typical run: 50 freelancers / 51 creators / 12 seeded jobs, 20 ranked matches per prompt, top score 99%, cold search ~96 ms and warm searches 5–6 ms.

---

## Optional MongoDB + Gemini variant

A second backend exists at `server/server.js`. It uses Mongoose models in `server/models/`, routers in `server/routes/`, and the only real **Google Gemini** integration in the repo (`@google/generative-ai`, model `gemini-pro`) to extract role, skills and keywords from a prompt, with a keyword fallback when no API key is set.

```bash
cd server
npm run start:mongodb     # requires MongoDB and a .env file
npm run seed              # seed the MongoDB database
```

Environment variables (create `server/.env`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nexus-matchmaker
GEMINI_API_KEY=your-key-here
```

This variant serves static files from a `client/` folder that is not included in this checkout, so it is not the one used for the default demo. The default `npm start` runs the in-memory `server-lightweight.js`, whose "AI" matching is deterministic local token scoring — no external API required.

---

## Known limitations

- In-memory data resets on every server restart.
- Passwords are stored in plain text and the token is a placeholder; API routes have no authentication middleware.
- Every search scans all freelancers; substring matching is naive (e.g. "editor" also matches "editorial").
- Scores clamp at 99, so strong candidates tie.
- Collaboration records store user snapshots, which can become stale.
- Kanban tasks are identified by title, so duplicate titles collide.
- Socket.io is single-process; horizontal scaling would need a Redis adapter.
- The discovery page's Hire and Kanban controls are placeholders; the dashboards use the real APIs.

---

## Future scope

- Persist data in MongoDB/PostgreSQL with indexes.
- Replace full scans with an inverted index or vector embeddings + ANN search.
- Add bcrypt password hashing and JWT authentication middleware.
- Give tasks unique IDs and add pagination to all list endpoints.
- Add ratings, reviews, payments and a Redis adapter for multi-instance real-time events.
