import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST")
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASS")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return all([self.smtp_host, self.smtp_user, self.smtp_pass])
    
    def send_2fa_code(self, to_email: str, code: str, username: str, purpose: str = "login") -> bool:
        """Send 2FA code via email"""
        if not self.is_configured():
            logger.error("Email service not configured")
            return False
        
        try:
            # Create email content
            subject = f"Your CTE Platform verification code"
            
            # HTML email template
            html_body = self._generate_2fa_html(code, username, purpose)
            
            # Plain text fallback
            text_body = f"""
Hello {username},

Your CTE Platform verification code is: {code}

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email.

Best regards,
CTE Platform Security Team
            """.strip()
            
            # Send email
            return self._send_email(to_email, subject, html_body, text_body)
            
        except Exception as e:
            logger.error(f"Failed to send 2FA code: {str(e)}")
            return False
    
    def _generate_2fa_html(self, code: str, username: str, purpose: str) -> str:
        """Generate HTML email template for 2FA code"""
        purpose_text = {
            "login": "sign in to your account",
            "setup": "set up two-factor authentication",
            "reset": "reset your account"
        }.get(purpose, "verify your identity")
        
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CTE Platform - Verification Code</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #e2e8f0;
            background-color: #0f172a;
            margin: 0;
            padding: 0;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            text-align: center;
            padding: 40px 0;
            border-bottom: 1px solid #334155;
        }}
        .logo {{
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 12px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }}
        .content {{
            padding: 40px 0;
            text-align: center;
        }}
        .code-box {{
            background: #1e293b;
            border: 2px solid #10b981;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
        }}
        .code {{
            font-size: 36px;
            font-weight: bold;
            color: #10b981;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
        }}
        .warning {{
            background: #7c2d12;
            border: 1px solid #dc2626;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            color: #fecaca;
        }}
        .footer {{
            border-top: 1px solid #334155;
            padding: 30px 0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }}
        .btn {{
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🛡️</div>
            <h1 style="color: #f1f5f9; margin: 0;">CTE Platform</h1>
            <p style="color: #94a3b8; margin: 10px 0 0;">Cyber Training Excellence</p>
        </div>
        
        <div class="content">
            <h2 style="color: #f1f5f9;">Hello {username},</h2>
            <p style="color: #cbd5e1; font-size: 16px;">
                You're trying to {purpose_text}. Use the verification code below:
            </p>
            
            <div class="code-box">
                <div class="code">{code}</div>
                <p style="color: #94a3b8; margin: 10px 0 0; font-size: 14px;">
                    This code expires in 5 minutes
                </p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                If you didn't request this code, please ignore this email and secure your account.
            </div>
        </div>
        
        <div class="footer">
            <p>
                This email was sent from CTE Platform Security System.<br>
                Please do not reply to this email.
            </p>
            <p style="margin-top: 20px;">
                <strong>CTE Platform</strong> - Defensive Cyber Operations Training
            </p>
        </div>
    </div>
</body>
</html>
        """.strip()
    
    def _send_email(self, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """Send email using SMTP"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            # Attach text and HTML parts
            text_part = MIMEText(text_body, 'plain', 'utf-8')
            html_part = MIMEText(html_body, 'html', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
            
            logger.info(f"2FA code sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False


# Global email service instance
email_service = EmailService()
