#!/usr/bin/env python3
"""
Database seeder script

Creates initial admin user and sample data for development/testing
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent.parent / 'src'))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models.user import User, UserRole
from models.season import Season, Week
from models.badge import Badge
from utils.auth import get_password_hash
from datetime import datetime, timedelta
import uuid

def create_admin_user(db: Session):
    """Create default admin user"""
    admin = db.query(User).filter(User.username == "admin").first()
    if admin:
        print("Admin user already exists")
        return admin
    
    admin = User(
        username="admin",
        email="admin@example.com",
        password_hash=get_password_hash("admin123"),
        role=UserRole.ADMIN
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    print(f"✅ Created admin user: admin / admin123")
    return admin

def create_sample_season(db: Session, admin: User):
    """Create a sample season with weeks"""
    season = db.query(Season).filter(Season.name == "Demo Season 2024").first()
    if season:
        print("Demo season already exists")
        return season
    
    # Create season
    start_date = datetime.utcnow()
    season = Season(
        name="Demo Season 2024",
        start_at=start_date,
        end_at=start_date + timedelta(weeks=8),
        description="Demonstration season for DCO challenges",
        theme="Cyber Threat Detection"
    )
    
    db.add(season)
    db.commit()
    db.refresh(season)
    
    # Create 8 weeks
    for i in range(1, 9):
        week_start = start_date + timedelta(weeks=i-1)
        week_end = week_start + timedelta(days=7)
        
        week = Week(
            season_id=season.id,
            index=i,
            opens_at=week_start,
            closes_at=week_end,
            is_mini_mission=(i == 4)  # Week 4 is a mini-mission
        )
        db.add(week)
    
    db.commit()
    print(f"✅ Created demo season with 8 weeks")
    return season

def create_default_badges(db: Session):
    """Create default badge system"""
    badges_data = [
        {
            'code': 'first_blood',
            'name': 'First Blood',
            'description': 'First to solve a challenge',
            'icon_key': 'blood_drop'
        },
        {
            'code': 'streak_3',
            'name': 'Triple Threat', 
            'description': 'Solve challenges 3 weeks in a row',
            'icon_key': 'fire'
        },
        {
            'code': 'streak_6',
            'name': 'Persistent Hunter',
            'description': 'Solve challenges 6 weeks in a row', 
            'icon_key': 'target'
        },
        {
            'code': 'blue_star',
            'name': 'Blue Star',
            'description': 'Detection deliverable accepted',
            'icon_key': 'shield'
        },
        {
            'code': 'red_spark',
            'name': 'Red Spark', 
            'description': 'OCO-lite challenge completed',
            'icon_key': 'sword'
        }
    ]
    
    created_count = 0
    for badge_data in badges_data:
        existing = db.query(Badge).filter(Badge.code == badge_data['code']).first()
        if not existing:
            badge = Badge(**badge_data)
            db.add(badge)
            created_count += 1
    
    db.commit()
    print(f"✅ Created {created_count} badges")

def seed_database():
    """Run all seeding operations"""
    print("🌱 Seeding database...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = SessionLocal()
    
    try:
        # Create admin user
        admin = create_admin_user(db)
        
        # Create sample season
        season = create_sample_season(db, admin)
        
        # Create badges
        create_default_badges(db)
        
        print("\n✅ Database seeding completed!")
        print("\nLogin credentials:")
        print("  Username: admin")
        print("  Password: admin123")
        print("  URL: http://localhost:3000/login")
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == '__main__':
    seed_database()
