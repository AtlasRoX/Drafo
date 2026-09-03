# Drafo 📐✨

> **Next-Generation Local-First System Architecture & Diagramming Studio**  
> *Built with Next.js 16 (Turbopack), React 19, TypeScript, Embedded PostgreSQL 16 (PGlite), Yjs CRDT, Serverless P2P WebRTC, and WebCrypto AES-256-GCM.*

---

## 🌟 Overview

**Drafo** is an ultra-modern, local-first architectural diagramming and visual system-modeling application. Crafted with Figma-level interaction fidelity, it combines an infinite zoomable canvas, intelligent orthogonal routing, step-by-step execution simulation, real-time multiplayer collaboration, and embedded client-side database storage.

Drafo operates **completely without central diagram servers**:
- **Local Storage**: Powered by **PGlite** (PostgreSQL 16 running inside WebAssembly with persistent IndexedDB backing).
- **Multiplayer Collaboration**: Powered by **Yjs CRDT** over a direct **Serverless WebRTC Mesh** and zero-latency `BroadcastChannel`.
- **Security & Privacy**: Powered by **WebCrypto AES-256-GCM** with PBKDF2 key derivation for encrypted file vaults and encrypted signaling.

---

## 🚀 Key Features

### 🐘 1. Embedded PostgreSQL 16 Local-First Engine (`@electric-sql/pglite`)
- **True PostgreSQL in WebAssembly**: Zero cloud database requirement. Runs a full PostgreSQL 16 engine directly in the browser.
- **IndexedDB Persistence**: Persists all diagram tables, relations, and history snapshots to `idb://drafo-pglite-v1` (eliminating the ~5MB `localStorage` limit).
- **Normalized Relational Architecture**:
  - `projects`: Master project records, metadata, canvas settings, and tags.
  - `nodes`: Component entities, coordinates, custom data frames, and lock states.
  - `edges`: Signal paths, route types, arrowheads, latency badges, and animation flags.
  - `sections`: Architectural swimlanes and visual tiers.
  - `project_history`: Audit trails and full undo/redo transaction snapshots.
- **Transactional Integrity**: Full ACID compliance with foreign key cascading (`ON DELETE CASCADE`).
- **Live Database Diagnostics**: Real-time status indicator in the dashboard header displaying live row counts (`{N} proj • {N} nodes • {N} edges`).
- **PostgreSQL .SQL Dump Export**: 1-click export of complete PostgreSQL DDL and DML scripts.

---

### 🌐 2. Real-Time P2P Collaboration & CRDT (`yjs` + `y-webrtc`)
- **Conflict-Free Convergence**: In-memory visual canvas synchronization at 120 FPS using Yjs CRDT (`Y.Doc`, `Y.Map<FlowNode>`, `Y.Map<FlowEdge>`).
- **Instant Multi-Tab Sync**: Zero-latency tab synchronization via browser `BroadcastChannel`. Edits in Tab 1 appear instantaneously in Tab 2 with 0ms network latency.
- **Serverless P2P WebRTC Mesh**: Connects peers directly over WebRTC DataChannels. No central diagram servers see or store your diagrams.
- **1-Click Shareable Room Links**: Generates instant room URLs (`http://localhost:3000/#room=...`). When teammates open the link, Drafo automatically opens the canvas editor and joins the live session.
- **Live Multiplayer Cursors**: Real-time cursor positions with custom user name badges and an 8-color Figma cursor palette.
- **Debounced PGlite Persistence**: High-frequency collaborative updates converge in-memory and automatically commit transactionally to PostgreSQL on disk.

---

### 🔐 3. Authenticated AES-256-GCM Cryptographic Vault (`WebCrypto`)
- **Military-Grade Client-Side Encryption**: Uses the browser's native `window.crypto.subtle` API.
- **PBKDF2 Key Derivation**: 100,000 rounds of SHA-256 with a 16-byte cryptographically secure random salt.
- **Encrypted Diagram Archives (`.drafo.enc`)**: Export password-locked diagrams that cannot be inspected or modified without the secret passphrase.
- **Encrypted WebRTC Signaling**: Optional room passwords encrypt all WebRTC signaling and data channel traffic end-to-end.

---

### 🎨 4. Infinite Canvas & Adaptive Grid (LOD)
- **Figma-Grade Adaptive Dots**: Dots dynamically adjust step multipliers ($1\times, 2\times, 4\times, 8\times, 16\times$) as you zoom in and out.
- **Zero Moiré Distortion**: Visible screen dots always maintain a comfortable 18px–44px spacing from 5% to 500% zoom.
- **Theme-Aware Alpha**: Soft, elegant dot and line alpha (`rgba(15, 23, 42, 0.18)` in Light mode, `rgba(255, 255, 255, 0.22)` in Dark mode).
- **Snapping Engine**: Snap-to-grid alignment preserving your configured world grid spacing (e.g. 20px).

---

### ⚡ 5. Intelligent Routing & Edge Engine
- **Orthogonal & Bezier Routing**: Automated obstacle avoidance and 90-degree port projection clearance for all 16 port permutations (Top, Right, Bottom, Left).
- **Custom Arrowheads**: Supports `arrow`, `open`, `circle`, and `none`.
- **Bidirectional Edges**: Dual arrowheads for two-way protocols (e.g. WebSockets, bidirectional gRPC).
- **Animated Signal Flow**: Visual packet particles traveling along signal paths.
- **Latency & Protocol Badges**: Render performance metrics (e.g. `⚡ 15ms`) and labels directly on connector paths.

---

### 🧩 6. Rich Architecture Component Library (55+ Presets)
- **Compute & Cloud**: Microservices, Serverless Lambdas, Kubernetes Pods, Docker Containers, Background Workers.
- **Storage & Databases**: Relational SQL (Postgres/MySQL), NoSQL Document DBs, In-Memory Caches (Redis), Message Queues (Kafka/RabbitMQ), Object Storage (S3).
- **Networking & Security**: API Gateways, Load Balancers, Firewalls, Auth/IAM Providers, DNS/CDNs.
- **Interactive Device Mockups**:
  - **Browser Frame**: URL bar and rendered web layout.
  - **Terminal CLI**: Simulated bash shell with prompt.
  - **Mobile Frame**: Smartphone status bar and app layout.
- **Architectural Swimlanes & Sections**: Horizontal tier dividers and region containers.

---

### ▶️ 7. Flow Simulation & Step-by-Step Playback
- **Trace Execution**: Step through architecture pathways from client request to database response.
- **Visual Token Animation**: Watch active steps glow and signal particles flow along connecting edges in sequence.
- **Ordered Step Sorting**: Automatically organizes and numbers simulation steps.

---

### 📸 8. Visual Export & Snippet Studio
- **Zero Node Clipping**: Calculates 48px boundary safety margins and measures effective node label heights.
- **Responsive Fit-To-View Scaling**: Automatically scales preview cards to fit the viewport with zero scrollbars.
- **High-DPI Retina PNG Export**: 1x Standard, 2x HD, and 4x Ultra resolutions.
- **Clean SVG Export**: Standalone scalable vector graphics with embedded `<defs>` markers.
- **Mermaid.js Markdown Generator**: 1-click generation of Mermaid flowchart syntax for GitHub, Notion, and Obsidian.
- **Curated Background Themes**: Transparent, Clean White, Dark Slate, Vercel Midnight, Sunset Glow, Cosmic Nebula, Oceanic Teal, and custom color picker.

---

### 🤖 9. AI Flow Synthesizer
- **Natural Language Architecture Generation**: Describe an infrastructure flow in English or Bengali (`en` / `bn`).
- **Instant Flow Graph**: Automatically creates nodes, configures port orientations, sets edge styles, and assigns section swimlanes.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space + Drag` | Pan canvas |
| `Ctrl + Scroll` | Zoom in / Zoom out |
| `Ctrl + F` | Quick Search & Jump to Node |
| `Alt + S` | Spawn Service / Microservice Node |
| `Alt + D` | Spawn Database 3D Node |
| `Alt + T` | Spawn Terminal CLI Node |
| `Alt + N` | Spawn Generic Note Node |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Redo |
| `Ctrl + C` / `Ctrl + V` | Copy / Paste Selected Node |
| `Ctrl + D` | Duplicate Selected |
| `Ctrl + A` | Select All Nodes |
| `Ctrl + G` | Group Selected into Container |
| `Ctrl + Shift + G` | Ungroup Selected Container |
| `Delete` / `Backspace` | Delete Selected |
| `]` | Bring Forward / To Front |
| `[` | Send Backward / To Back |
| `Ctrl + L` | Lock / Unlock Node |

---

## 🛠️ Project Structure

```
a:/Pf;lpww/
├── src/
│   ├── app/                      # Next.js App Router root layout and page
│   ├── assets/                   # SVG Icons and Drafo Brand Logos
│   ├── components/
│   │   ├── Agentation/           # Real-time feedback and diagnostic tools
│   │   ├── Canvas/               # FlowCanvas, FlowNode, FlowEdge, MultiplayerCursors
│   │   ├── Dashboard/            # ProjectDashboard, PGlite DB status badge
│   │   ├── Inspector/            # PropertyInspector, Node & Edge styles
│   │   ├── Modals/               # CollaborationModal, ExportShareModal, AIFlowModal...
│   │   ├── Navbar/               # Studio Navbar, Collab trigger, Export dropdown
│   │   ├── Sidebar/              # ComponentPalette (General & Architecture tabs)
│   │   └── Simulation/           # FlowPlayer execution simulation toolbar
│   ├── crdt/
│   │   └── yjsProvider.ts        # Yjs CRDT engine, WebRTC mesh & BroadcastChannel
│   ├── data/
│   │   ├── architectureComponents.tsx  # 55+ Presets (Compute, DB, Network, UI)
│   │   ├── colorPalettes.ts            # Curated visual color palettes
│   │   └── templates.ts                # Production architecture templates
│   ├── db/
│   │   └── pgliteStore.ts        # PGlite PostgreSQL 16 WASM store & SQL dump
│   ├── types/
│   │   └── flow.ts               # Core TypeScript definitions (FlowNode, FlowEdge...)
│   └── utils/
│       ├── aiGenerator.ts        # Prompt-to-architecture synthesis engine
│       ├── cryptoVault.ts        # WebCrypto AES-256-GCM + PBKDF2 encryption
│       ├── exportUtils.ts        # High-res PNG/SVG and Mermaid markdown
│       └── routing.ts            # 16-port orthogonal routing algorithm
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

---

## 🏁 Getting Started

### Prerequisites
- **Node.js**: v18.18+ or v20+ recommended
- **pnpm**: v9+ (or `npm` / `yarn`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/drafo.git
   cd drafo
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start the development server**:
   ```bash
   pnpm dev
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🧪 Production Build & Type Checking

To verify TypeScript contracts and generate an optimized Turbopack production bundle:

```bash
# Type check without emitting
node ./node_modules/typescript/bin/tsc --noEmit

# Production build with Turbopack
node ./node_modules/next/dist/bin/next build

# Start production server
node ./node_modules/next/dist/bin/next start
```

---

## 📜 License

Private & Proprietary. All rights reserved.
