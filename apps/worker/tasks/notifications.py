from celery import Celery
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import structlog

logger = structlog.get_logger(__name__)

app = Celery('cte-worker')

@app.task(bind=True)
def send_email(self, to_email: str, subject: str, body: str, html_body: str = None):
    """
    Send an email notification
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
    """
    try:
        smtp_host = os.getenv('SMTP_HOST')
        smtp_user = os.getenv('SMTP_USER')
        smtp_pass = os.getenv('SMTP_PASS')
        
        if not all([smtp_host, smtp_user, smtp_pass]):
            logger.warning("SMTP not configured, skipping email")
            return {'status': 'skipped', 'reason': 'SMTP not configured'}
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_user
        msg['To'] = to_email
        
        # Add plain text part
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)
        
        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(smtp_host, 587) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        
        logger.info("Email sent successfully", 
                   to_email=to_email, 
                   subject=subject)
        
        return {'status': 'sent'}
        
    except Exception as e:
        logger.error("Email send failed", 
                    error=str(e),
                    to_email=to_email,
                    subject=subject)
        return {
            'status': 'failed',
            'error': str(e)
        }

@app.task(bind=True)
def send_challenge_notification(self, user_emails: list, challenge_title: str, week_info: dict):
    """
    Send notification about new challenge availability
    
    Args:
        user_emails: List of user email addresses
        challenge_title: Title of the new challenge
        week_info: Information about the week/season
    """
    subject = f"New Challenge Available: {challenge_title}"
    
    body = f"""
    A new challenge is now available!
    
    Challenge: {challenge_title}
    Week: {week_info.get('index', 'N/A')}
    Season: {week_info.get('season_name', 'Current Season')}
    
    Log in to the CTE Platform to start solving!
    """
    
    # Send to all users
    results = []
    for email in user_emails:
        result = send_email.delay(email, subject, body)
        results.append(result.id)
    
    return {'notification_tasks': results}

@app.task(bind=True) 
def send_leaderboard_update(self, user_emails: list, top_users: list, season_info: dict):
    """
    Send weekly leaderboard update to participants
    
    Args:
        user_emails: List of user email addresses
        top_users: List of top users with scores
        season_info: Season information
    """
    try:
        smtp_host = os.getenv('SMTP_HOST')
        if not smtp_host:
            logger.info("SMTP not configured, skipping leaderboard update")
            return {'status': 'skipped', 'reason': 'SMTP not configured'}
        
        subject = f"Weekly Leaderboard Update - {season_info.get('name', 'CTE Season')}"
        
        # Generate HTML content
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }}
                .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; }}
                .leaderboard {{ margin: 20px 0; }}
                .rank {{ padding: 10px; border-bottom: 1px solid #e5e7eb; }}
                .rank:nth-child(1) {{ background-color: #fef3c7; }}
                .rank:nth-child(2) {{ background-color: #e5e7eb; }}
                .rank:nth-child(3) {{ background-color: #fde68a; }}
                .footer {{ margin-top: 30px; padding: 20px; background-color: #f3f4f6; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏆 Weekly Leaderboard</h1>
                <h2>{season_info.get('name', 'CTE Season')}</h2>
            </div>
            
            <div class="leaderboard">
                <h3>🥇 Top Performers This Week</h3>
        """
        
        # Add top users
        for i, user in enumerate(top_users[:10]):
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else f"{i+1}."
            html_body += f"""
                <div class="rank">
                    <strong>{medal} {user.get('username', 'Unknown')}</strong>
                    <span style="float: right;">{user.get('total_points', 0)} points</span>
                    <br>
                    <small>Challenges solved: {user.get('challenges_solved', 0)}</small>
                </div>
            """
        
        html_body += """
            </div>
            
            <div class="footer">
                <p>Keep up the great work! 💪</p>
                <p><a href="http://localhost:3000">Login to CTE Platform</a></p>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_body = f"""
Weekly Leaderboard Update - {season_info.get('name', 'CTE Season')}

Top Performers This Week:
"""
        
        for i, user in enumerate(top_users[:10]):
            text_body += f"{i+1}. {user.get('username', 'Unknown')} - {user.get('total_points', 0)} points ({user.get('challenges_solved', 0)} challenges)\n"
        
        text_body += "\nKeep up the great work!\nLogin: http://localhost:3000"
        
        # Rate limiting check (24 hours)
        import redis
        try:
            r = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))
            rate_limit_key = f"leaderboard_email:{season_info.get('id', 'unknown')}"
            
            if r.exists(rate_limit_key):
                logger.info("Leaderboard email rate limited (24h)")
                return {'status': 'rate_limited'}
            
            # Set rate limit for 24 hours
            r.setex(rate_limit_key, 24 * 3600, "sent")
        except:
            # Continue without rate limiting if Redis fails
            pass
        
        # Send to all users
        results = []
        for email in user_emails[:100]:  # Limit to 100 emails per batch
            try:
                result = send_email.delay(email, subject, text_body, html_body)
                results.append(result.id)
            except Exception as e:
                logger.error("Failed to queue leaderboard email", 
                           email=email, error=str(e))
        
        logger.info("Leaderboard update emails queued",
                   season=season_info.get('name'),
                   email_count=len(results))
        
        return {
            'status': 'queued',
            'email_tasks': results,
            'email_count': len(results)
        }
        
    except Exception as e:
        logger.error("Leaderboard update failed", 
                    error=str(e),
                    season=season_info.get('name'))
        return {
            'status': 'failed',
            'error': str(e)
        }

@app.task(bind=True)
def send_first_blood_notification(self, user_email: str, challenge_title: str, user_name: str):
    """
    Send first blood achievement notification
    
    Args:
        user_email: Email of the user who got first blood
        challenge_title: Title of the challenge
        user_name: Username of the achiever
    """
    subject = f"🩸 First Blood Achievement: {challenge_title}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center;">
            <h1>🩸 FIRST BLOOD! 🩸</h1>
            <h2>Congratulations {user_name}!</h2>
        </div>
        
        <div style="padding: 30px;">
            <p>Outstanding work! You were the <strong>first</strong> to solve:</p>
            <h3 style="color: #dc2626;">"{challenge_title}"</h3>
            
            <p>This achievement demonstrates exceptional skill and speed. The first blood badge has been added to your profile!</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <p><strong>🏆 Achievement Unlocked: First Blood</strong></p>
                <p>You're leading the pack in this challenge!</p>
            </div>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
            <p>Keep pushing forward and claim more victories!</p>
            <a href="http://localhost:3000" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Leaderboard</a>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
🩸 FIRST BLOOD ACHIEVEMENT! 🩸

Congratulations {user_name}!

You were the FIRST to solve: "{challenge_title}"

This achievement demonstrates exceptional skill and speed. The first blood badge has been added to your profile!

Keep pushing forward and claim more victories!
View leaderboard: http://localhost:3000
    """
    
    return send_email.delay(user_email, subject, text_body, html_body)

@app.task(bind=True)
def send_weekly_challenge_drop(self, user_emails: list, challenges: list, week_info: dict):
    """
    Send notification about new weekly challenge drop
    
    Args:
        user_emails: List of participant email addresses
        challenges: List of new challenges
        week_info: Week and season information
    """
    if not challenges:
        return {'status': 'no_challenges'}
    
    season_name = week_info.get('season_name', 'Current Season')
    week_index = week_info.get('index', 'N/A')
    
    subject = f"🚀 Week {week_index} Challenges Available - {season_name}"
    
    challenges_html = ""
    challenges_text = ""
    
    for challenge in challenges:
        challenges_html += f"""
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0;">
            <h4 style="color: #1f2937; margin: 0 0 5px 0;">{challenge.get('title', 'Unknown')}</h4>
            <p style="margin: 5px 0; color: #6b7280;">
                <span style="background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                    {challenge.get('track', 'Unknown')}
                </span>
                <span style="background-color: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 5px;">
                    {challenge.get('difficulty', 'Unknown')}
                </span>
                <span style="float: right; font-weight: bold;">{challenge.get('points', 0)} pts</span>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #4b5563;">
                {challenge.get('description', '')[:100]}{'...' if len(challenge.get('description', '')) > 100 else ''}
            </p>
        </div>
        """
        
        challenges_text += f"""
- {challenge.get('title', 'Unknown')} ({challenge.get('difficulty', 'Unknown')})
  Track: {challenge.get('track', 'Unknown')} | Points: {challenge.get('points', 0)}
  {challenge.get('description', '')[:80]}{'...' if len(challenge.get('description', '')) > 80 else ''}

"""
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center;">
            <h1>🚀 New Challenges Available!</h1>
            <h2>Week {week_index} - {season_name}</h2>
        </div>
        
        <div style="padding: 30px;">
            <p>Get ready to dive into this week's challenges! We've prepared {len(challenges)} new challenge{'s' if len(challenges) != 1 else ''} to test your defensive cybersecurity skills.</p>
            
            <h3>This Week's Challenges:</h3>
            {challenges_html}
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                <p><strong>💡 Pro Tips:</strong></p>
                <ul style="margin: 5px 0;">
                    <li>Start early to claim first blood bonuses! 🩸</li>
                    <li>Use hints wisely - they cost points but can save time</li>
                    <li>Focus on deliverables (Sigma rules, analysis) for Blue Stars ⭐</li>
                </ul>
            </div>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
            <p>Ready to defend? Let's go!</p>
            <a href="http://localhost:3000" style="background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Solving</a>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
🚀 New Challenges Available!
Week {week_index} - {season_name}

Get ready to dive into this week's challenges! We've prepared {len(challenges)} new challenge{'s' if len(challenges) != 1 else ''} to test your defensive cybersecurity skills.

This Week's Challenges:
{challenges_text}

💡 Pro Tips:
- Start early to claim first blood bonuses! 🩸
- Use hints wisely - they cost points but can save time  
- Focus on deliverables (Sigma rules, analysis) for Blue Stars ⭐

Ready to defend? Let's go!
Start solving: http://localhost:3000
    """
    
    # Send to all participants
    results = []
    for email in user_emails:
        try:
            result = send_email.delay(email, subject, text_body, html_body)
            results.append(result.id)
        except Exception as e:
            logger.error("Failed to queue challenge notification", 
                        email=email, error=str(e))
    
    logger.info("Weekly challenge notifications queued",
               week=week_index,
               season=season_name,
               challenges_count=len(challenges),
               email_count=len(results))
    
    return {
        'status': 'queued',
        'email_tasks': results,
        'email_count': len(results),
        'challenges_count': len(challenges)
    }
