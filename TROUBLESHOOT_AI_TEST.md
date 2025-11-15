# Troubleshooting AI Test Page

## If you see "Something went wrong"

### Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Look for any red error messages
4. Copy the error message

### Step 2: Common Issues and Fixes

#### Issue 1: OrganizationProvider Error

**Error**: "Cannot read property of undefined" or organization-related errors

**Fix**: 
- The page requires you to be logged in
- Make sure you're authenticated
- If you don't have an organization, the page should still work

#### Issue 2: Missing Dependencies

**Error**: "Cannot find module" or import errors

**Fix**:
```bash
npm install
```

#### Issue 3: Supabase Connection Error

**Error**: Supabase connection issues

**Fix**:
- Check your Supabase URL and keys in `.env` file
- Make sure Supabase is running (if local)

### Step 3: Quick Test

1. **Try accessing a simpler page first:**
   - http://localhost:8080/dashboard
   - http://localhost:8080/leads

2. **If those work, the issue is specific to AI Test page**

3. **Check if you're logged in:**
   - Go to http://localhost:8080/auth
   - Login first
   - Then try http://localhost:8080/ai-test

### Step 4: Manual Component Test

If the page still doesn't work, try this:

1. Open browser console (F12)
2. Navigate to http://localhost:8080/ai-test
3. Check for specific error messages
4. Share the error message for further debugging

### Step 5: Alternative - Test AI Features Directly

Instead of using the test page, you can test AI features directly:

1. Go to **Leads** page
2. Open any lead
3. Click on **AI Insights** tab
4. Try generating insights

This will help identify if the issue is with:
- The test page component
- The AI functions themselves
- The API key setup

## Still Having Issues?

1. **Check the terminal** where `npm run dev` is running
2. **Look for build errors** or warnings
3. **Try clearing browser cache** (Ctrl+Shift+Delete)
4. **Try a different browser** or incognito mode
5. **Restart the dev server:**
   - Stop: Ctrl+C
   - Start: `npm run dev`

## Expected Behavior

When the page loads correctly, you should see:
- "AI Features Test Page" heading
- "Test OpenAI API Key" section
- "Test Configuration" section
- "Test AI Lead Insights" section
- "Test AI Property Matcher" section
- "Setup Instructions" section

If you see "Something went wrong", check the browser console for the specific error.

