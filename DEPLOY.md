# TaskMaster: install, push to Git, deploy to Vercel

## 1. Install packages (once)
```bash
cd TaskMaster
npm install
npx expo start --web        # test locally at http://localhost:8081
```

## 2. Push to GitHub
Create an empty repo on github.com first (no README), then:
```bash
git init
git add .
git commit -m "TaskMaster: home screen, inbox fix, themes"
git branch -M main
git remote add origin https://github.com/<your-username>/taskmaster.git
git push -u origin main
```
Later updates:
```bash
git add .
git commit -m "describe your change"
git push
```

## 3a. Deploy to Vercel from the command line
```bash
npm install -g vercel
vercel login
vercel            # first deploy (preview). Accept the defaults, vercel.json is already set up
vercel --prod     # production deploy
```

## 3b. Or deploy from GitHub (auto-deploys on every push)
1. Go to vercel.com/new and import the GitHub repo.
2. Framework preset: Other. Build command, output directory and rewrites are read from `vercel.json`.
3. Click Deploy.

Note: tasks and settings are stored in the browser (local storage), so each browser/device has its own data.
