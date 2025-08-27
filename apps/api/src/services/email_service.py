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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #e2e8f0;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #0f172a;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            border: 1px solid #334155;
        }}
        .header {{
            text-align: center;
            padding: 40px 20px;
            border-bottom: 1px solid #334155;
            position: relative;
        }}
        .logo {{
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 20px;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: bold;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
            position: relative;
        }}
        .logo::before {{
            content: '';
            position: absolute;
            inset: -2px;
            background: linear-gradient(135deg, #10b981, #059669, #047857);
            border-radius: 22px;
            z-index: -1;
            opacity: 0.7;
        }}
        .brand-title {{
            color: #f1f5f9;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #f1f5f9, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }}
        .brand-subtitle {{
            color: #10b981;
            margin: 8px 0 0;
            font-size: 14px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .content {{
            padding: 40px 20px;
            text-align: center;
        }}
        .greeting {{
            color: #f1f5f9;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
        }}
        .description {{
            color: #cbd5e1;
            font-size: 16px;
            margin-bottom: 32px;
            line-height: 1.7;
        }}
        .code-container {{
            background: linear-gradient(135deg, #1e293b, #334155);
            border: 2px solid #10b981;
            border-radius: 16px;
            padding: 40px 20px;
            margin: 32px 0;
            position: relative;
            overflow: hidden;
        }}
        .code-container::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #10b981, #059669, #047857);
        }}
        .code-label {{
            color: #94a3b8;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .code {{
            font-size: 42px;
            font-weight: 800;
            color: #10b981;
            letter-spacing: 12px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            text-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
            margin: 16px 0;
        }}
        .code-expiry {{
            color: #94a3b8;
            font-size: 14px;
            margin-top: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }}
        .warning {{
            background: linear-gradient(135deg, #7c2d12, #991b1b);
            border: 1px solid #dc2626;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
            color: #fecaca;
            position: relative;
        }}
        .warning::before {{
            content: '⚠️';
            font-size: 20px;
            margin-right: 8px;
        }}
        .warning-title {{
            font-weight: 600;
            margin-bottom: 8px;
        }}
        .footer {{
            border-top: 1px solid #334155;
            padding: 32px 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
            line-height: 1.6;
        }}
        .footer-brand {{
            color: #10b981;
            font-weight: 600;
            margin-top: 16px;
        }}
        @media (max-width: 640px) {{
            .container {{
                margin: 10px;
                padding: 16px;
            }}
            .code {{
                font-size: 32px;
                letter-spacing: 8px;
            }}
            .logo {{
                width: 60px;
                height: 60px;
                font-size: 24px;
            }}
        }}
    </style>
</head>
<body>
    <div style="padding: 20px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); min-height: 100vh;">
        <div class="container">
            <div class="header">
                <div class="logo">🛡️</div>
                <h1 class="brand-title">CTE Platform</h1>
                <p class="brand-subtitle">Cyber Training Excellence</p>
            </div>
            
            <div class="content">
                <h2 class="greeting">Hello {username},</h2>
                <p class="description">
                    You're trying to {purpose_text}. Please use the verification code below to continue:
                </p>
                
                <div class="code-container">
                    <div class="code-label">Verification Code</div>
                    <div class="code">{code}</div>
                    <div class="code-expiry">
                        <span>⏱️</span>
                        <span>This code expires in 5 minutes</span>
                    </div>
                </div>
                
                <div class="warning">
                    <div class="warning-title">Security Notice</div>
                    <div>If you didn't request this code, please ignore this email and consider securing your account.</div>
                </div>
            </div>
            
            <div class="footer">
                <p>
                    This email was sent from the CTE Platform Security System.<br>
                    Please do not reply to this automated message.
                </p>
                <div class="footer-brand">
                    CTE Platform - Defensive Cyber Operations Training
                </div>
            </div>
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
