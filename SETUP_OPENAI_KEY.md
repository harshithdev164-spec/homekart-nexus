# Quick Setup: OpenAI API Key

## Your API Key
```
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
```

## Setup Steps

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Login to your account
   - Select your project: `qtugvzrvcuderfrebfxj`

2. **Navigate to Secrets**
   - Click on **Project Settings** (gear icon in sidebar)
   - Go to **Edge Functions** section
   - Click on **Secrets** tab

3. **Add the Secret**
   - Click **Add Secret** button
   - **Name**: `OPENAI_API_KEY` (exactly as shown, case-sensitive)
   - **Value**: `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`
   - Click **Save**

4. **Verify**
   - The secret should appear in the list
   - Make sure the name is exactly `OPENAI_API_KEY`

### Option 2: Supabase CLI (If installed)

```bash
supabase secrets set OPENAI_API_KEY=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
```

## Testing the Setup

### Method 1: Use the Test Page

1. Start your development server: `npm run dev`
2. Navigate to: `http://localhost:3000/ai-test`
3. Enter your API key in the test field
4. Click "Test Key" to verify it works
5. Load a sample lead or enter a lead ID
6. Test the AI features

### Method 2: Test in the App

1. Go to the **Leads** page
2. Open any lead detail modal
3. Click on the **AI Insights** tab
4. Try generating:
   - Lead Score
   - Lead Insights
   - Property Matches

## What AI Features Are Available?

1. **AI Lead Scoring** - Scores leads from 0-100 based on quality
2. **AI Lead Insights** - Provides strategic recommendations
3. **AI Property Matching** - Matches properties to leads using AI
4. **AI Message Generation** - Generates personalized messages

## Troubleshooting

### "OPENAI_API_KEY is not set" Error

- Make sure you added the secret in Supabase Dashboard
- Verify the secret name is exactly `OPENAI_API_KEY` (case-sensitive)
- If using local development, restart Supabase: `supabase stop && supabase start`
- If using production, redeploy your edge functions

### "API key is invalid" Error

- Verify the API key is correct
- Check if the key has expired or been revoked
- Make sure you're using the correct key format (starts with `sk-`)

### "Rate limit exceeded" Error

- Wait a few minutes before retrying
- Check your OpenAI account usage at https://platform.openai.com/usage
- Consider upgrading your OpenAI plan if needed

## Next Steps

After setting up the API key:

1. ✅ Test the API key using the test page (`/ai-test`)
2. ✅ Create some leads with preferences (budget, location, property type)
3. ✅ Add some properties to your database
4. ✅ Test AI property matching for leads
5. ✅ Test AI lead scoring and insights

## Security Note

⚠️ **Important**: Never commit API keys to git. Always use Supabase secrets for production.

