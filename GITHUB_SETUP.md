# 🚀 GitHub Setup Instructions — Sanctum Keeper TVA

## Step 1: Create the GitHub Repository

1. Open your browser and go to: **https://github.com/new**
2. Fill in:
   - **Repository name:** `sanctum-keeper-tva`
   - **Description:** `⏳ TVA-themed deterministic file organizer desktop app — Hackathon project (Electron + Node.js + Loki/TVA theme)`
   - **Visibility:** Public *(so judges can see it)*
   - **DO NOT** check "Initialize this repository" (we already have local commits)
3. Click **Create repository**
4. GitHub will show you the push commands — copy your repo URL (looks like `https://github.com/YOUR_USERNAME/sanctum-keeper-tva.git`)

---

## Step 2: Push Your Local Repo

Open PowerShell in your project folder and run:

```powershell
cd "C:\Users\Rohan Singh\Desktop\Adam_Project\sanctum-keeper-tva"

# Add GitHub as remote origin (replace YOUR_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/sanctum-keeper-tva.git

# Push both commits to GitHub
git push -u origin master
```

> GitHub will ask for your username and password/token. If using password auth, generate a **Personal Access Token** at https://github.com/settings/tokens → "Generate new token (classic)" → check `repo` scope.

---

## Step 3: Verify on GitHub

After pushing, your repo should show:
- ✅ `README.md` — renders as the homepage with full feature table
- ✅ `CHANGELOG.md` — version history
- ✅ `DEVELOPMENT.md` — developer setup guide
- ✅ `docs/ARCHITECTURE.md` — system architecture
- ✅ `docs/DEMO_SCRIPT.md` — hackathon demo walkthrough
- ✅ `src/` — all source code

---

## Commit History on GitHub

```
9fc7b5d  docs: add full documentation suite (README, CHANGELOG, DEVELOPMENT, ARCHITECTURE, DEMO_SCRIPT)
17f4354  feat: initialize sanctum-keeper-tva — all 5 core features (B1-B5) complete with TVA/Loki theme
```
