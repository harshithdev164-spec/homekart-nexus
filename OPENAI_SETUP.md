# OpenAI API Key Setup Guide

## Setting Up OpenAI API Key in Supabase

### For Local Development:

1. **Set the secret in Supabase CLI:**
   ```bash
   supabase secrets set OPENAI_API_KEY=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
   ```

2. **Verify the secret is set:**
   ```bash
   supabase secrets list
   ```

### For Production (Vercel/Supabase Cloud):

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `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`

## Testing the API Key

After setting up the key, you can test it using the test script or directly in the app.

## Available AI Features

1. **AI Lead Insights** (`ai-lead-insights` function)
   - Lead scoring
   - Lead insights and recommendations
   - Message generation

2. **AI Property Matcher** (`ai-property-matcher` function)
   - Property matching based on lead preferences
   - Match scoring and reasoning
   - Property recommendations

## Testing in the App

1. Go to the Leads page
2. Open a lead detail modal
3. Click on "AI Insights" tab
4. Try generating lead score or insights
5. Try property matching for a lead

