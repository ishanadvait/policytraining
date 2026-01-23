# Simple Admin Invitation System - Setup Guide

## Much Simpler Approach! 🎉

No n8n, no webhooks, no complicated workflows. Just Supabase Edge Functions.

---

## What You Need

1. ✅ Supabase project (you already have this)
2. ✅ Supabase CLI (install once)
3. ✅ 3 commands to deploy

That's it!

---

## Step 1: Install Supabase CLI

Open terminal and run:

```bash
npm install -g supabase
```

Or if you prefer other methods: https://supabase.com/docs/guides/cli/getting-started

---

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

---

## Step 3: Link Your Project

```bash
cd C:\Users\pc\Desktop\IshanPolicyTraining
supabase link --project-ref xrxsqivbytniuovblwqs
```

When prompted for the database password, enter your Supabase database password.

---

## Step 4: Deploy the Edge Function

```bash
supabase functions deploy invite-user
```

That's it! The function is now live.

---

## Step 5: Setup Database

Run the SQL script in Supabase Dashboard:

1. Go to Supabase Dashboard > SQL Editor
2. Open `.shared/supabase-invitations-setup.sql`
3. Copy and paste the entire script
4. Click "Run"

---

## Step 6: Set Admin User

1. Go to Supabase Dashboard > Authentication > Users
2. Find `gautam.advait@ishantechnologies.com`
3. Click three dots > Edit User
4. In "User Metadata" section, add:
```json
{
  "is_admin": true
}
```
5. Save

---

## Step 7: Configure Email Templates (Optional)

By default, Supabase sends a plain email. To customize:

1. Go to Supabase Dashboard > Authentication > Email Templates
2. Find "Invite user" template
3. Customize the email HTML/text
4. Save

---

## Step 8: Deploy Your App

```bash
git add .
git commit -m "Add simple admin invitation system"
git push
```

Vercel will auto-deploy.

---

## Test It!

1. Go to your app: `https://your-app.vercel.app`
2. Login as `gautam.advait@ishantechnologies.com`
3. Should redirect to `/admin`
4. Fill in invitation form:
   - Display Name: Test User
   - Email: test@ishantechnologies.com
   - Phone: +91-1234567890
5. Click "Send Invitation"
6. Check the email inbox
7. Click "Set Password" link
8. Set password
9. Should auto-login to training hub

---

## That's It!

No n8n setup needed. No webhooks. No complicated workflows.

---

## How It Works

```
Admin Portal → Supabase Edge Function → Creates User → Sends Email
```

**Simple!**

The Edge Function:
- ✅ Runs on Supabase servers (secure)
- ✅ Has access to service role key (server-side)
- ✅ Sends email automatically via Supabase
- ✅ Free (included with Supabase)
- ✅ No external services needed

---

## Troubleshooting

### Function deployment fails
```bash
# Make sure you're logged in
supabase login

# Make sure project is linked
supabase link --project-ref xrxsqivbytniuovblwqs

# Try deploying again
supabase functions deploy invite-user
```

### Email not received
- Check spam folder
- Go to Supabase Dashboard > Authentication > Email Templates
- Verify SMTP settings (or use default Supabase email)

### "Not authorized" error
- Make sure user metadata has `"is_admin": true`
- User needs to log out and log back in

---

## Compare to Previous Solution

**Before (n8n)**:
- ❌ Setup n8n account
- ❌ Create 9-node workflow
- ❌ Configure webhooks
- ❌ Setup SMTP/Gmail
- ❌ Manage secrets
- ❌ Handle errors with IF nodes
- ❌ Test each node
- ❌ External service dependency

**Now (Edge Function)**:
- ✅ Install CLI
- ✅ Run 3 commands
- ✅ Done!

**10x simpler!**

---

## Files Overview

**Created**:
- `supabase/functions/invite-user/index.ts` - Edge Function (handles invites)
- `admin/index.html` - Admin portal UI
- `admin/admin.css` - Styling
- `admin/admin.js` - Frontend logic (updated to use Edge Function)

**Modified**:
- `TrainingPrograms/auth.js` - Added admin check
- `index.html` - Admin redirect
- `set-password.html` - Auto-login
- `vercel.json` - Admin route

---

## Next Steps

Once deployed:
1. ✅ Test invitation flow
2. ✅ Send real invitations
3. ✅ Users can set passwords and access training

---

## Cost

Everything is FREE:
- ✅ Supabase Edge Functions (500K invocations/month free)
- ✅ Supabase Auth (50,000 MAU free)
- ✅ Supabase Database (500MB free)
- ✅ Email sending (basic SMTP included)

You're well within free tier limits!

---

## Summary

**Old approach**: Complex n8n workflow
**New approach**: Simple Supabase Edge Function

**Commands to run**:
```bash
npm install -g supabase
supabase login
cd C:\Users\pc\Desktop\IshanPolicyTraining
supabase link --project-ref xrxsqivbytniuovblwqs
supabase functions deploy invite-user
```

**Then**: Setup database + admin user + deploy to Vercel

**Done!** 🎉

Much simpler, right?
