import { Resend } from "resend";

// Initialize Resend with API key
export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@yourdomain.com";
export const APP_NAME = "Cash Book";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

// Email templates
export const getInvitationEmailHTML = (params: {
  organizationName: string;
  invitedByName: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}) => {
  const { organizationName, invitedByName, role, inviteLink, expiresAt } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${organizationName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      margin-bottom: 10px;
    }
    h1 {
      color: #10b981;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .content {
      margin: 30px 0;
    }
    .info-box {
      background-color: #f9fafb;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 20px 0;
    }
    .info-box p {
      margin: 8px 0;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 14px;
    }
    .info-value {
      color: #111827;
      font-size: 16px;
    }
    .cta-button {
      display: inline-block;
      background-color: #10b981;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      background-color: #059669;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .link {
      color: #10b981;
      text-decoration: none;
    }
    .expires {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">💰</div>
      <h1>You're Invited!</h1>
      <p>Join ${organizationName} on ${APP_NAME}</p>
    </div>

    <div class="content">
      <p>Hi there,</p>
      <p><strong>${invitedByName}</strong> has invited you to join <strong>${organizationName}</strong> on ${APP_NAME}.</p>

      <div class="info-box">
        <p><span class="info-label">Organization:</span><br><span class="info-value">${organizationName}</span></p>
        <p><span class="info-label">Your Role:</span><br><span class="info-value">${role.charAt(0).toUpperCase() + role.slice(1)}</span></p>
        <p><span class="info-label">Invited By:</span><br><span class="info-value">${invitedByName}</span></p>
      </div>

      <p>As a <strong>${role}</strong>, you'll be able to ${getRoleDescription(role)}.</p>

      <div class="button-container">
        <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
      </div>

      <div class="expires">
        ⏰ This invitation expires on <strong>${new Date(expiresAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</strong>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        If the button doesn't work, you can copy and paste this link into your browser:
        <br>
        <a href="${inviteLink}" class="link">${inviteLink}</a>
      </p>
    </div>

    <div class="footer">
      <p>This invitation was sent to you by ${invitedByName} from ${organizationName}.</p>
      <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
      <p style="margin-top: 20px;">
        <a href="${APP_URL}" class="link">${APP_NAME}</a> - Simple Cash Book Management
      </p>
    </div>
  </div>
</body>
</html>
`;
};

function getRoleDescription(role: string): string {
  switch (role.toLowerCase()) {
    case "admin":
      return "manage users, invite members, and have full access to all transactions";
    case "editor":
      return "add, edit, and view transactions";
    case "viewer":
      return "view transactions and reports";
    default:
      return "access the cash book";
  }
}

// Plain text version for email clients that don't support HTML
export const getInvitationEmailText = (params: {
  organizationName: string;
  invitedByName: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}) => {
  const { organizationName, invitedByName, role, inviteLink, expiresAt } = params;

  return `
You're Invited to Join ${organizationName}!

Hi there,

${invitedByName} has invited you to join ${organizationName} on ${APP_NAME}.

Organization: ${organizationName}
Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
Invited By: ${invitedByName}

Accept your invitation by clicking this link:
${inviteLink}

This invitation expires on ${new Date(expiresAt).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

If you weren't expecting this invitation, you can safely ignore this email.

---
${APP_NAME} - Simple Cash Book Management
${APP_URL}
`;
};
