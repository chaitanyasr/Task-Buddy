# DayFlow — Task Buddy

A React Native (Expo) daily task manager with calendar, task tracking, and automated email reports via EmailJS.

## Features
- 📅 Monthly calendar with event management
- ✅ Task manager with priority levels (High / Medium / Low)
- 📊 Daily progress tracking
- 📤 Automated daily email summary via EmailJS
- 🔄 Auto carry-over of pending tasks to tomorrow
- 💾 Settings persisted via AsyncStorage

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start the app
```bash
npx expo start
```
Scan the QR code with **Expo Go** on your phone.

### 3. Configure EmailJS
1. Sign up at [emailjs.com](https://emailjs.com)
2. Create an Email Service and connect your Gmail
3. Create a Template with these variables:
   - `{{to_email}}` — recipient email
   - `{{subject}}` — email subject
   - `{{message}}` — email body
4. In the app, go to **Settings** tab and fill in:
   - **Public Key** — from EmailJS Account page
   - **Service ID** — e.g. `service_xxxxxxx`
   - **Template ID** — e.g. `template_xxxxxxx`
   - **Your Email** — where you want reports sent

## Tech Stack
- React Native + Expo
- AsyncStorage for local persistence
- EmailJS for email delivery

## Author
Chaitanya Srinivas
