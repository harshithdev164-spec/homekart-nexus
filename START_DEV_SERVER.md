# Starting the Development Server

## Quick Start

1. **Open a terminal in the project directory**

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Wait for the server to start** - You should see output like:
   ```
   VITE v5.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

4. **Open your browser** and go to:
   - **Main app**: http://localhost:5173
   - **AI Test page**: http://localhost:5173/ai-test

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:

1. **Find what's using the port:**
   ```powershell
   netstat -ano | findstr :5173
   ```

2. **Kill the process** (replace PID with the actual process ID):
   ```powershell
   taskkill /PID <PID> /F
   ```

3. **Or use a different port:**
   ```bash
   npm run dev -- --port 3000
   ```

### Server Not Starting

1. **Check if Node.js is installed:**
   ```bash
   node --version
   npm --version
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Clear cache and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Cannot Access Localhost

1. **Check if the server is actually running:**
   - Look for the Vite output in the terminal
   - Check for any error messages

2. **Try accessing via 127.0.0.1 instead:**
   - http://127.0.0.1:5173

3. **Check firewall settings:**
   - Make sure Windows Firewall isn't blocking the port

## Common Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install dependencies
npm install
```

## Default Ports

- **Vite Dev Server**: http://localhost:5173
- **Supabase Studio**: http://localhost:54323
- **Supabase API**: http://localhost:54321

## Next Steps After Server Starts

1. ✅ Open http://localhost:5173
2. ✅ Navigate to http://localhost:5173/ai-test
3. ✅ Test the OpenAI API key
4. ✅ Test AI features

