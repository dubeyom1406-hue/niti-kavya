# Deployment & Setup Guide

## 1. Push to GitHub
Since I've already committed all changes locally, you just need to push them to your repository.
Run these commands in your terminal:

```bash
git push -u origin main
```
*(If it asks for username/password, use your GitHub username and a Personal Access Token as the password)*.

## 2. Deploy to Vercel
You have the Vercel CLI installed. To deploy, simply run:

```bash
vercel
```
Follow the prompts (login if needed, select defaults).
For production deployment:
```bash
vercel --prod
```

## 3. Run Backend (For OTP)
The OTP feature requires the backend server to be running.
In a separate terminal window, keep this running:
```bash
node server.js
```
*(Note: Vercel supports serverless functions, so you might need to migrate `server.js` to `/api` folder if you want it hosted on Vercel properly. Currently, `server.js` is a standalone Node server).*

## Recent Fixes
- **Mobile Scrolling**: Fixed the stuck scrolling issue by removing `100vh` constraints. Now scrolls naturally.
- **Mobile Header**: Search bar and User Profile are now visible and properly styled on mobile.
- **OTP System**: Fixed email sending error by updating the sender email.
- **Premium UI**: Added dark mode modals for verification and alerts.
