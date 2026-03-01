# 🚀 Quick Start Guide

## Starting the Application

### Start Both Frontend & Backend Together (Recommended)

```bash
npm run dev
```

This will start both the backend server and frontend development server concurrently.

---

## Individual Commands

### Start Backend Only

```bash
npm run dev:backend
```

Runs the backend server with nodemon (auto-restart on changes)

### Start Frontend Only

```bash
npm run dev:frontend
```

Runs the React frontend development server

---

## Production Commands

### Start Both in Production Mode

```bash
npm start
```

### Start Backend Production

```bash
npm run start:backend
```

### Start Frontend Production

```bash
npm run start:frontend
```

---

## Installation

### Install All Dependencies (Root + Backend + Frontend)

```bash
npm run install:all
```

---

## Default Ports

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000 (check backend/.env for actual port)

---

## Troubleshooting

If you encounter any issues:

1. Make sure all dependencies are installed:
   ```bash
   npm run install:all
   ```

2. Check if ports are already in use
3. Verify your `.env` files in both frontend and backend directories
