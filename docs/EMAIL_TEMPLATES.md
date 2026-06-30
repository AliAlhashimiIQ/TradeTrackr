# TradeTrackr — Branded HTML Email Templates

Use these premium, responsive HTML email templates to brand your Supabase Auth emails. 

## Where to configure in Supabase
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** (sidebar) → **Email Templates**.
3. Under each email type, select **HTML** as the body format.
4. Copy and paste the corresponding HTML code from below.
5. In **Authentication** → **URL Configuration**, set your **Site URL** to your live production domain (e.g., `https://tradetrackr.com`) and add `https://tradetrackr.com/auth/callback` to the redirect whitelist.

---

## 1. Confirm Signup Template
*   **Subject**: `Confirm your registration on TradeTrackr`
*   **HTML Body**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your TradeTrackr Account</title>
  <style>
    body {
      background-color: #07080d;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      text-align: center;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #07080d;
      width: 100%;
      padding: 40px 0;
    }
    .container {
      background-color: #0d0f17;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      margin: 0 auto;
      max-width: 500px;
      padding: 40px;
      text-align: left;
    }
    .logo {
      color: #6366f1;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
    }
    .heading {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .text {
      color: #94a3b8;
      font-size: 15px;
      line-height: 24px;
      margin-bottom: 30px;
    }
    .btn-container {
      margin-bottom: 30px;
    }
    .btn {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      border-radius: 12px;
      color: #ffffff !important;
      display: inline-block;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 28px;
      text-decoration: none;
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.15);
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      color: #475569;
      font-size: 12px;
      padding-top: 20px;
      text-align: center;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo">TradeTrackr</div>
      <div class="heading">Welcome to the Command Center</div>
      <div class="text">
        Thank you for registering on TradeTrackr. To complete your setup and unlock your AI trading coach, advanced analytics dashboard, and prop firm target trackers, please confirm your email address.
      </div>
      <div class="btn-container">
        <!-- Supabase confirmation link placeholder -->
        <a href="{{ .ConfirmationURL }}" class="btn">Confirm Email Address</a>
      </div>
      <div class="text" style="font-size: 13px; margin-bottom: 20px;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <span style="color: #6366f1; word-break: break-all;">{{ .ConfirmationURL }}</span>
      </div>
      <div class="footer">
        © 2026 TradeTrackr. All rights reserved.<br>
        If you did not sign up for this account, please ignore this email.
      </div>
    </div>
  </div>
</body>
</html>
```

---

## 2. Reset Password Template
*   **Subject**: `Reset your TradeTrackr password`
*   **HTML Body**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      background-color: #07080d;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      text-align: center;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #07080d;
      width: 100%;
      padding: 40px 0;
    }
    .container {
      background-color: #0d0f17;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      margin: 0 auto;
      max-width: 500px;
      padding: 40px;
      text-align: left;
    }
    .logo {
      color: #6366f1;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
    }
    .heading {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .text {
      color: #94a3b8;
      font-size: 15px;
      line-height: 24px;
      margin-bottom: 30px;
    }
    .btn-container {
      margin-bottom: 30px;
    }
    .btn {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 12px;
      color: #ffffff !important;
      display: inline-block;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 28px;
      text-decoration: none;
      box-shadow: 0 10px 20px rgba(239, 68, 68, 0.15);
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      color: #475569;
      font-size: 12px;
      padding-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo">TradeTrackr</div>
      <div class="heading">Reset Your Password</div>
      <div class="text">
        We received a request to reset the password associated with your account. Click the button below to choose a new password. This link is valid for 60 minutes.
      </div>
      <div class="btn-container">
        <a href="{{ .ConfirmationURL }}" class="btn">Reset Password</a>
      </div>
      <div class="text" style="font-size: 13px; margin-bottom: 20px;">
        If you cannot click the button, copy and paste this URL into your browser:<br>
        <span style="color: #ef4444; word-break: break-all;">{{ .ConfirmationURL }}</span>
      </div>
      <div class="footer">
        © 2026 TradeTrackr. All rights reserved.<br>
        If you did not request a password reset, you can safely ignore this email.
      </div>
    </div>
  </div>
</body>
</html>
```

---

## 3. Magic Link Template
*   **Subject**: `Log in to TradeTrackr`
*   **HTML Body**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Log in to TradeTrackr</title>
  <style>
    body {
      background-color: #07080d;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      text-align: center;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #07080d;
      width: 100%;
      padding: 40px 0;
    }
    .container {
      background-color: #0d0f17;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      margin: 0 auto;
      max-width: 500px;
      padding: 40px;
      text-align: left;
    }
    .logo {
      color: #6366f1;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
    }
    .heading {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .text {
      color: #94a3b8;
      font-size: 15px;
      line-height: 24px;
      margin-bottom: 30px;
    }
    .btn-container {
      margin-bottom: 30px;
    }
    .btn {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      border-radius: 12px;
      color: #ffffff !important;
      display: inline-block;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 28px;
      text-decoration: none;
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.15);
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      color: #475569;
      font-size: 12px;
      padding-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo">TradeTrackr</div>
      <div class="heading">Your Magic Login Link</div>
      <div class="text">
        Click the button below to instantly sign in to your TradeTrackr dashboard. No password required.
      </div>
      <div class="btn-container">
        <a href="{{ .ConfirmationURL }}" class="btn">Sign In to Dashboard</a>
      </div>
      <div class="text" style="font-size: 13px; margin-bottom: 20px;">
        This link is valid for 15 minutes. If the button doesn't work, copy and paste this URL:<br>
        <span style="color: #6366f1; word-break: break-all;">{{ .ConfirmationURL }}</span>
      </div>
      <div class="footer">
        © 2026 TradeTrackr. All rights reserved.<br>
        If you did not request this login link, you can safely ignore this email.
      </div>
    </div>
  </div>
</body>
</html>
```
