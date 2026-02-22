import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

Then redeploy on Vercel.

---

## Fix 2 — Railway Postgres Schema

The **Database tab** with query editor isn't always visible. Easiest alternative:

1. In Railway click **Postgres** → **Variables** tab
2. Copy the `DATABASE_URL` value — it looks like:
```
postgresql://postgres:xxxx@monorail.proxy.rlwy.net:PORT/railway
