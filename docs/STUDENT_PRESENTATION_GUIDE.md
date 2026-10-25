# 🎓 STUDENT HACKATHON PRESENTATION & VIVA GUIDE
## The Sanctum Keeper — TVA Edition (Loki Theme)

Hey! If you are presenting this project to the judges or your professors, this guide has everything you need. It is written in simple, clear language with zero confusing jargon, so you can speak with 100% confidence even if you are just starting out with Electron and Node.js.

---

## ⚡ 1. The 60-Second Elevator Pitch (Memorize This!)

> *"Good morning/afternoon judges! Our project is **The Sanctum Keeper: TVA Edition**, themed around the Marvel Multiverse and the Loki TVA series.*
>
> *The problem we are solving is file chaos in watched folders. Most modern apps try to use AI or probabilistic guessing to sort files. But as Wong in Doctor Strange said, he doesn't want chaotic spells that guess — he wants enchantments he writes himself that work the exact same way every single time.*
>
> *Our app is a **100% deterministic desktop application** built with Electron and Node.js. You define the rules visually — based on filename, extension, file size, or age — and the app enforces them instantly without guesswork. It includes safety wards to protect system files, a dry-run simulator so you can preview changes before touching a single byte, a Time Stone rewind ledger to undo any action, and a Dormammu loop breaker to prevent infinite bouncing between folders.*
>
> *Let us show you how it works!"*

---

## 🔍 2. How Our Approach is Different (Why This Wins Hackathons)

Judges love when you clearly explain **why** your solution is unique:

| Other Tools | The Sanctum Keeper | Why Ours is Better |
| :--- | :--- | :--- |
| Use AI/LLM to guess folder destinations | Strict rule engine (First Spell Wins) | **100% predictable.** Zero AI hallucination, zero accidental deletes of important tax/invoice files. |
| Blindly execute moves immediately | **Eye of Simulation (B4)** | Wong can preview the fate of every file *before* a single file moves on disk. |
| Permanent actions / difficult undo | **Sacred Ledger & Time Stone (B5)** | Every action is logged with atomic writes and can be reversed individually or in bulk. |
| Susceptible to infinite file bounce loops | **Dormammu Loop Detector (A2)** | If Rule A and Rule B keep moving files back and forth, the app catches it in 10s and halts the loop. |
| Generic, boring productivity UI | **Full TVA/Loki CRT 1970s Aesthetic** | Amber phosphor glow, Miss Minutes live clock, retro push buttons, scanlines, and animated timeline branches. |

---

## 💻 3. Technical Architecture Explained Simply (For Tech Judges)

If a judge asks: *"How does Electron work and how did you structure the code?"*

Answer like this:
1. **Two Processes (The Core of Electron):**
   - **Main Process (`src/main/`):** Runs on **Node.js**. This is the background brain. It has access to the computer's file system (`fs`), watches folders (`chokidar`), and talks to native OS dialogs.
   - **Renderer Process (`src/renderer/`):** Runs like a webpage (HTML, CSS, JS). This is what the user sees and clicks on (the TVA terminal).
2. **The Secure Bridge (`src/main/preload.js`):**
   - For security, the renderer cannot directly touch the file system (we turned off `nodeIntegration` and enabled `contextIsolation`).
   - Instead, we created a safe communication bridge called `window.tvaAPI` using Electron's `contextBridge`.
   - When the user clicks "Open Doorway", the renderer sends an IPC message (`ipcRenderer.invoke('doorway:select')`), the main process opens the folder picker dialog, and sends the result back.
3. **Storage & Persistence:**
   - We don't need heavy database servers like MongoDB or MySQL for this desktop tool.
   - Everything is stored cleanly in JSON files inside the app's `userData` folder (`doorways.json`, `rules.json`, `sacred_ledger.json`).
   - For the ledger, we used an **Atomic Write Pattern** (writing to a `.tmp` file and renaming it) so even if the power gets cut or the computer crashes mid-write, the file is never corrupted.

---

## 🛡️ 4. The 5 Core Features (B1 to B5) Walkthrough

### B1: The Keeper Needs Doors to Watch (`src/main/watcher.js`)
- **What it does:** Allows monitoring up to 3 folders at once.
- **Student explanation for judges:** *"We use the `chokidar` library to listen for new files landing in the directory. We set `depth: 0` so it only looks at the top surface and doesn't get slowed down by thousands of subfolders. We also built security guards: the app refuses to let you watch `C:\` or `C:\Windows` so system files are never touched, and it automatically ignores incomplete downloads like `.crdownload` or `.tmp`."*

### B2: Enchantments Anyone Can Write (`src/renderer/js/rules-ui.js`)
- **What it does:** A visual modal where you create rules without writing any code.
- **Student explanation for judges:** *"Wong is a librarian, not a developer. So we built a form where anyone can pick conditions like 'File Name contains invoice' and 'Size greater than 1MB', choose an action (Move, Copy, Rename, or Trash), and save it. The engine does the rest."*

### B3: First Spell Wins (`src/main/engine.js`)
- **What it does:** Evaluates rules in top-to-bottom priority order.
- **Student explanation for judges:** *"If a file matches both Rule #1 and Rule #2, which one should happen? In our engine, Rule #1 wins and we immediately break the loop. This guarantees that the exact same file always gets the exact same result. Users can click the Up and Down arrows to change the priority anytime."*

### B4: Look Before You Leap (`src/renderer/js/preview-ui.js`)
- **What it does:** Dry-run simulation before executing.
- **Student explanation for judges:** *"Before Wong casts a spell, he wants to check what will happen. In the Eye of Simulation tab, we run our evaluation matrix on the existing files in the folder, but we DON'T call `fs.rename` or `trash`. We just return a table showing what WOULD happen. That way, if a rule has a typo, you catch it with your eyes rather than losing files."*

### B5: Turn Back Time (`src/main/ledger.js` & `ledger-ui.js`)
- **What it does:** Transaction audit log with 1-click single or batch undo.
- **Student explanation for judges:** *"Every single file operation creates an immutable record with a unique UUID, timestamp, source path, destination path, and batch ID. If Wong accidentally moves a file, he just clicks 'Rewind' and the app moves the file back to its original location. He can also rewind an entire sweep in one click."*

---

## 🔮 5. Common Judge Questions & How to Answer Them

### Q1: *"Why did you choose Electron instead of Python or React Native?"*
**Answer:**
> *"Electron allowed us to build a cross-platform desktop app using standard web technologies (HTML/CSS/JS) while giving us direct access to Node.js APIs for high-performance file system operations like `fs.promises` and native file dialogs. It also allowed us to craft this custom 1970s TVA retro aesthetic using CSS animations that would be very tedious to build in native GUI toolkits."*

### Q2: *"What happens if two rules conflict?"*
**Answer:**
> *"That's handled by our B3 feature: 'First Spell Wins'. The rules array is ordered by index. The engine iterates from index 0 downwards. As soon as the first rule evaluates to `true`, it claims the file, triggers the action, and halts further evaluation for that file. There is never an ambiguous conflict."*

### Q3: *"How do you prevent an infinite loop if two folders watch each other?"*
**Answer:**
> *"We implemented the Dormammu Loop Detector in `engine.js`. We keep an in-memory sliding window of recent file movements. If the same filename is moved more than 2 times within 10 seconds, the engine detects the temporal loop, throws an alert, locks the file, and pops up a TVA alert on screen without crashing the app."*

### Q4: *"What if a file being downloaded by Chrome is half-written?"*
**Answer:**
> *"Two defenses: First, our watcher regex ignores `.crdownload`, `.part`, and `.tmp` files. Second, we use Chokidar's `awaitWriteFinish` option with a 500ms stability threshold plus an extra buffer before triggering, ensuring the operating system has finished writing the file before our rule engine touches it."*

---

## 🎬 6. Quick Demo Checklist During Your Presentation

1. [ ] **Step 1:** Open the app — let them look at the glowing TVA theme and the Miss Minutes clock for 5 seconds.
2. [ ] **Step 2:** Click **Open New Doorway**, try to select `C:\Windows`, show the error message.
3. [ ] **Step 3:** Select a test folder (`TVA_Dropzone`).
4. [ ] **Step 4:** Go to **Temporal Loom**, show an existing rule or quickly create one: `Extension equals pdf -> Move to Invoices`.
5. [ ] **Step 5:** Go to **Eye of Simulation**, select the folder, click **Simulate Timeline**. Show the table showing the predicted destination without moving the file.
6. [ ] **Step 6:** Click **Branch Doorways -> Execute Sweep**, show the files moving.
7. [ ] **Step 7:** Go to **Sacred Chronicles**, click **Rewind** on the file, and show it reappearing in the original folder.

*"For All Time. Always."*
