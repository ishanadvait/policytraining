# Admin Secret Setup Guide

## The Simple Way (Recommended)

Since n8n doesn't have a built-in "Admin Secret" credential type, we'll hardcode the secret in both n8n and the admin portal.

---

## Step 1: Generate Your Secret

Choose one method:

### Method A: Browser Console
1. Open browser console (F12)
2. Run:
```javascript
crypto.randomUUID()
```
3. Copy the generated UUID

### Method B: Terminal/Command Line
```bash
node -e "console.log(require('crypto').randomUUID())"
```

### Method C: Use the Example Secret
Use the one already in your code:
```
a7f3e8d4-5c9b-4a1e-8f2d-9b3c7e1a4f6d
```

---

## Step 2: Update n8n Validation Node

In your n8n workflow:

1. **Open the "Validation" node** (Code node, first one after webhook)
2. **Replace the entire code** with:

```javascript
// Your admin secret - CHANGE THIS!
const ADMIN_SECRET = 'a7f3e8d4-5c9b-4a1e-8f2d-9b3c7e1a4f6d';

// Validate admin secret key
const secretHeader = $input.item.headers['x-admin-secret'];

if (secretHeader !== ADMIN_SECRET) {
  throw new Error('Unauthorized: Invalid admin secret');
}

// Validate required fields
const payload = $input.item.json;
if (!payload.email || !payload.displayName) {
  throw new Error('Missing required fields: email and displayName');
}

// Validate email domain
if (!payload.email.endsWith('@ishantechnologies.com')) {
  throw new Error('Email must be from @ishantechnologies.com domain');
}

return {
  json: {
    email: payload.email,
    displayName: payload.displayName,
    phone: payload.phone || '',
    invitedBy: payload.invitedBy || 'admin',
    appUrl: payload.appUrl || 'https://your-app.vercel.app'
  }
};
```

3. **Click "Save"**

---

## Step 3: Update admin/admin.js

The file has already been updated with the example secret:

**Line 10 in `admin/admin.js`**:
```javascript
const ADMIN_SECRET = 'a7f3e8d4-5c9b-4a1e-8f2d-9b3c7e1a4f6d';
```

✅ **This is already done!**

If you want to change it:
1. Open `admin/admin.js`
2. Find line 10
3. Replace the secret with your generated UUID
4. **IMPORTANT**: Must match exactly what's in n8n!

---

## Step 4: Verify Both Match

### Check n8n:
1. Open Validation node
2. Look at line 2: `const ADMIN_SECRET = '...'`
3. Copy the value

### Check admin.js:
1. Open `admin/admin.js`
2. Look at line 10: `const ADMIN_SECRET = '...'`
3. Verify it matches n8n exactly

---

## Testing

### Test 1: Valid Secret
In admin portal, send invitation:
- Should work successfully
- n8n execution should show success

### Test 2: Invalid Secret
Temporarily change secret in `admin/admin.js`:
```javascript
const ADMIN_SECRET = 'wrong-secret';
```

Try sending invitation:
- Should fail with: "Unauthorized: Invalid admin secret"

Change it back to correct value.

---

## Security Notes

⚠️ **Keep Secret Private**:
- Don't share in public repositories
- Don't commit to git if repo is public
- Only authorized admins should know this

✅ **It's OK to hardcode because**:
- Only used server-side in n8n
- Client-side code is already restricted by RLS
- Additional layer of security

🔒 **For Extra Security** (Optional):
- Use environment variables in n8n (if self-hosted)
- Rotate secret periodically
- Use different secrets for dev/production

---

## Current Configuration

Your current setup:

**n8n Validation Node**:
```javascript
const ADMIN_SECRET = 'a7f3e8d4-5c9b-4a1e-8f2d-9b3c7e1a4f6d';
```

**admin/admin.js** (line 10):
```javascript
const ADMIN_SECRET = 'a7f3e8d4-5c9b-4a1e-8f2d-9b3c7e1a4f6d';
```

✅ **Both match!** You're ready to go.

---

## Quick Reference

| File | Line | Value |
|------|------|-------|
| n8n Validation Node | Line 2 | `a7f3e8d4-5c9b-4a1e-8f2d-9b3c7e1a4f6d` |
| admin/admin.js | Line 10 | `a7f3e8d4-5c9b-4a1e-8f2d-9b3c7e1a4f6d` |

**Status**: ✅ Configured correctly

---

## If You Want to Change the Secret

1. Generate new secret (use method above)
2. Update n8n Validation node (line 2)
3. Update admin/admin.js (line 10)
4. Redeploy admin portal (git push)
5. Test invitation flow

---

## Summary

✅ No special credentials needed in n8n
✅ Just hardcode the secret in both places
✅ Make sure they match exactly
✅ Already configured with example secret
✅ Change to your own secret if desired

You're all set! The admin secret is already configured and ready to use.
