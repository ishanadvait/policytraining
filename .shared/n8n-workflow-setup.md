# n8n Workflow Setup Guide

## Overview
This n8n workflow handles user invitation by:
1. Validating admin requests
2. Creating Supabase users via Admin API
3. Generating invite tokens
4. Sending branded invitation emails

## Prerequisites
- n8n instance (cloud or self-hosted)
- SMTP/Gmail credentials for sending emails
- Supabase service role key (from Supabase Dashboard > Settings > API)

---

## Step-by-Step Setup

### 1. Create New Workflow
1. Login to your n8n instance
2. Click "Create New Workflow"
3. Name it: "User Invitation Workflow"

### 2. Add Webhook Trigger Node
- **Node Type**: Webhook
- **Settings**:
  - HTTP Method: `POST`
  - Path: `/webhook/invite-user`
  - Response Mode: "When Last Node Finishes"
  - Response Code: `200`
- **Save the webhook URL** (e.g., `https://your-n8n.app.n8n.cloud/webhook/invite-user`)

### 3. Add Validation Node (Code Node)
- **Node Type**: Code
- **Name**: "Validation"
- **JavaScript Code**:

```javascript
// Validate admin secret key
const secretHeader = $input.item.headers['x-admin-secret'];
const expectedSecret = $credentials.adminSecret; // Store in n8n credentials

if (secretHeader !== expectedSecret) {
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

### 4. Add HTTP Request Node - Create Supabase User
- **Node Type**: HTTP Request
- **Name**: "Create Supabase User"
- **Settings**:
  - Method: `POST`
  - URL: `https://xrxsqivbytniuovblwqs.supabase.co/auth/v1/admin/users`
  - Authentication: None

- **Headers** (Add these):
  ```
  Authorization: Bearer {{YOUR_SUPABASE_SERVICE_ROLE_KEY}}
  apikey: {{YOUR_SUPABASE_SERVICE_ROLE_KEY}}
  Content-Type: application/json
  ```

- **Body** (JSON):
  ```json
  {
    "email": "={{$json.email}}",
    "email_confirm": false,
    "user_metadata": {
      "full_name": "={{$json.displayName}}",
      "phone": "={{$json.phone}}",
      "is_admin": false
    }
  }
  ```

- **Options**:
  - Response Format: JSON

**⚠️ IMPORTANT**: Replace `{{YOUR_SUPABASE_SERVICE_ROLE_KEY}}` with your actual service role key from:
Supabase Dashboard > Settings > API > Service Role Key (secret)

### 5. Add HTTP Request Node - Generate Invite Token
- **Node Type**: HTTP Request
- **Name**: "Generate Invite Token"
- **Settings**:
  - Method: `POST`
  - URL: `https://xrxsqivbytniuovblwqs.supabase.co/auth/v1/admin/users/={{$json.id}}/invite`
  - Authentication: None

- **Headers**:
  ```
  Authorization: Bearer {{YOUR_SUPABASE_SERVICE_ROLE_KEY}}
  apikey: {{YOUR_SUPABASE_SERVICE_ROLE_KEY}}
  Content-Type: application/json
  ```

- **Body** (JSON):
  ```json
  {}
  ```

### 6. Add Code Node - Build Invite URL
- **Node Type**: Code
- **Name**: "Build Invite URL"
- **JavaScript Code**:

```javascript
// Extract data from previous nodes
const inviteResponse = $input.item.json;
const userEmail = $node["Create Supabase User"].json.email;
const displayName = $node["Create Supabase User"].json.user_metadata.full_name;
const appUrl = $node["Validation"].json.appUrl;

// Construct invite URL with tokens
const inviteUrl = `${appUrl}/set-password.html#access_token=${inviteResponse.access_token}&refresh_token=${inviteResponse.refresh_token}&type=invite`;

return {
  json: {
    email: userEmail,
    displayName: displayName,
    inviteUrl: inviteUrl
  }
};
```

### 7. Add Send Email Node

**Option A: Gmail (Recommended for Testing)**
- **Node Type**: Gmail
- **Operation**: Send Email
- **Settings**:
  - To: `={{$json.email}}`
  - Subject: `Invitation to Ishan Technologies Training Platform`
  - Message Type: HTML
  - Email Body: [See HTML template below]

**Option B: SMTP (For Production)**
- **Node Type**: Send Email (SMTP)
- Configure your SMTP settings (host, port, credentials)
- Use same settings as Gmail option above

**Email HTML Template**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        h1 { color: #003366; }
        .button {
            display: inline-block;
            background: #003366;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
        .footer { margin-top: 30px; font-size: 0.9rem; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Ishan Technologies Training Platform</h1>
        </div>

        <p>Hello <strong>={{$json.displayName}}</strong>,</p>

        <p>You've been invited to access the Ishan Technologies Compliance Training Hub. This platform provides essential training on:</p>

        <ul>
            <li>Anti-Corruption Policy</li>
            <li>Prevention of Sexual Harassment (POSH)</li>
            <li>Data Privacy & Protection</li>
            <li>Health, Safety & Environment</li>
            <li>Cyber Security</li>
        </ul>

        <p>To get started, please set your password by clicking the button below:</p>

        <div style="text-align: center;">
            <a href="={{$json.inviteUrl}}" class="button">Set Your Password</a>
        </div>

        <p style="font-size: 0.9rem; color: #666; margin-top: 20px;">
            Or copy and paste this link into your browser:<br>
            <a href="={{$json.inviteUrl}}">={{$json.inviteUrl}}</a>
        </p>

        <div class="footer">
            <p><strong>Note:</strong> This invitation link will expire in 24 hours. If you experience any issues, please contact your administrator.</p>
            <p>Best regards,<br>Ishan Technologies Team</p>
        </div>
    </div>
</body>
</html>
```

### 8. Add Response Node (Code Node)
- **Node Type**: Code
- **Name**: "Success Response"
- **JavaScript Code**:

```javascript
// Return success response to admin page
return {
  json: {
    success: true,
    message: 'Invitation sent successfully',
    email: $node["Build Invite URL"].json.email,
    inviteUrl: $node["Build Invite URL"].json.inviteUrl
  }
};
```

### 9. Add Error Handler
For each HTTP Request node:
1. Click the node
2. Go to "Settings" tab
3. Enable "Continue On Fail"
4. Add an "IF" node after to check for errors
5. Route errors to an Error Response node

**Error Response Node** (Code):
```javascript
const errorMessage = $input.item.error?.message || 'Unknown error occurred';
return {
  json: {
    success: false,
    error: errorMessage
  }
};
```

---

## 10. Configure Credentials

### A. Admin Secret (for webhook validation)
1. Go to n8n Credentials
2. Create new credential type: "Generic Credential"
3. Name: "Admin Secret"
4. Add field: `adminSecret` = `your-chosen-secret-key`
5. Save

### B. Gmail/SMTP Credentials
1. For Gmail:
   - Go to Google Account > Security
   - Enable 2-Step Verification
   - Generate App Password
   - Use in n8n Gmail credentials

2. For SMTP:
   - Get SMTP host, port, username, password from your provider
   - Add to n8n SMTP credentials

---

## 11. Activate Workflow
1. Click "Execute Workflow" to test
2. If successful, click "Active" toggle to enable
3. Copy the webhook URL

---

## 12. Update Admin Portal

Edit `admin/admin.js` and update:

```javascript
// Replace these values:
const N8N_WEBHOOK_URL = 'https://your-n8n.app.n8n.cloud/webhook/invite-user'; // Your actual webhook URL
const ADMIN_SECRET = 'your-chosen-secret-key'; // Same as n8n credential
```

---

## Testing the Workflow

### Test in n8n:
1. Click "Execute Workflow"
2. Use the "Webhook" test feature
3. Send test payload:
```json
{
  "displayName": "Test User",
  "email": "test@ishantechnologies.com",
  "phone": "+91-9876543210",
  "invitedBy": "admin@ishantechnologies.com",
  "appUrl": "https://your-app.vercel.app"
}
```

### Test from Admin Portal:
1. Login to admin portal
2. Fill invitation form
3. Submit
4. Check n8n execution history
5. Check user's email inbox
6. Verify user created in Supabase Dashboard > Authentication > Users

---

## Troubleshooting

### Issue: "Unauthorized" error
- Check that X-Admin-Secret header matches credential in n8n
- Verify admin.js has correct ADMIN_SECRET value

### Issue: "Failed to create user"
- Verify Supabase service role key is correct
- Check Supabase URL in HTTP Request nodes
- Ensure user doesn't already exist

### Issue: Email not sent
- For Gmail: Check App Password is correct
- For SMTP: Verify host/port/credentials
- Check spam folder
- Review n8n execution logs for email node

### Issue: Invite link doesn't work
- Verify appUrl in webhook payload matches your Vercel deployment
- Check that set-password.html is accessible
- Ensure tokens are being passed correctly in URL hash

---

## Security Checklist

✅ Supabase service role key is stored only in n8n (never in client code)
✅ Webhook validates X-Admin-Secret header
✅ Email domain restricted to @ishantechnologies.com
✅ n8n credentials are encrypted
✅ Webhook URL is known only to authorized admins

---

## Workflow Diagram

```
Webhook (POST /webhook/invite-user)
    ↓
Validation (check secret, email domain)
    ↓
Create Supabase User (POST to Supabase Admin API)
    ↓
Generate Invite Token (POST to Supabase Admin API)
    ↓
Build Invite URL (construct full URL with tokens)
    ↓
Send Email (Gmail/SMTP with branded template)
    ↓
Success Response (return to admin portal)
```

---

## Next Steps

After completing this setup:

1. ✅ Run the SQL script in Supabase (`.shared/supabase-invitations-setup.sql`)
2. ✅ Set gautam.advait@ishantechnologies.com as admin in Supabase
3. ✅ Update admin.js with webhook URL and secret
4. ✅ Deploy to Vercel
5. ✅ Test end-to-end flow
6. ✅ Send first real invitation

---

## Support

If you encounter issues:
1. Check n8n execution history for detailed logs
2. Review Supabase logs (Dashboard > Logs)
3. Check browser console for client-side errors
4. Verify all credentials are correct
