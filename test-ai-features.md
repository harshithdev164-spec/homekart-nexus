# Testing AI Features Guide

## Prerequisites

1. OpenAI API key is set in Supabase secrets
2. You have at least one lead in the system
3. You have at least one property in the system

## Test Scenarios

### 1. Test AI Lead Scoring

**Location**: Leads page → Open any lead → AI Insights tab

**Steps**:
1. Navigate to `/leads`
2. Click on any lead to open the detail modal
3. Go to the "AI Insights" tab
4. Click "Generate Lead Score"
5. Verify:
   - Score is generated (0-100)
   - Priority is assigned (high/medium/low)
   - Reasoning is provided
   - Recommendations are shown

**Expected Result**: 
- Lead score between 0-100
- Clear priority level
- Detailed reasoning
- Actionable recommendations

### 2. Test AI Lead Insights

**Location**: Same as above

**Steps**:
1. In the AI Insights tab
2. Click "Generate Insights"
3. Verify:
   - Strategic insights are provided
   - Next action is suggested
   - Timeline is recommended

**Expected Result**:
- Multiple insights about the lead
- Clear next action steps
- Timeline for follow-up

### 3. Test AI Property Matching

**Location**: Leads page → Open any lead → AI Property Matcher tab

**Steps**:
1. Navigate to `/leads`
2. Click on a lead with preferences (budget, location, property type)
3. Go to "AI Property Matcher" tab
4. Click "Find AI-Matched Properties"
5. Verify:
   - Properties are matched and scored
   - Match scores are shown (0-100%)
   - Reasoning for each match is provided
   - Highlights and concerns are listed

**Expected Result**:
- Top 5-10 matching properties
- Match scores sorted by relevance
- Detailed reasoning for each match
- Key highlights and potential concerns

### 4. Test AI Message Generation

**Location**: Leads page → Open any lead → AI Insights tab

**Steps**:
1. In the AI Insights tab
2. Click on message type (e.g., "Follow-up Email", "Initial Contact")
3. Verify:
   - Subject line is generated
   - Message body is created
   - Tone is appropriate

**Expected Result**:
- Professional message content
- Appropriate tone for the context
- Ready-to-use email/message

## Troubleshooting

### API Key Not Working

**Error**: "OPENAI_API_KEY is not set"

**Solution**:
1. Verify the secret is set: `supabase secrets list`
2. Restart Supabase: `supabase stop && supabase start`
3. Check the secret name matches exactly: `OPENAI_API_KEY`

### No Properties Found

**Error**: "No available properties found"

**Solution**:
1. Ensure you have properties in the database
2. Check that properties have status = 'available'
3. Verify the lead has preferences set (budget, location, etc.)

### API Rate Limits

**Error**: Rate limit exceeded

**Solution**:
1. Wait a few minutes before retrying
2. Check your OpenAI account usage
3. Consider upgrading your OpenAI plan

## API Key Verification

To verify your API key is working, you can test it directly:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer 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"
```

If successful, you'll get a list of available models.

