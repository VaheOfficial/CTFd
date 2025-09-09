#!/usr/bin/env python3
import os
import sys
import json
import requests
import time
from datetime import datetime
import argparse

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

class AIChallengeTester:
    def __init__(self, api_url="http://localhost:8000", api_key=None):
        self.api_url = api_url.rstrip('/')  # Remove trailing slash if present
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.challenge_id = None
        self.generation_id = None

    def generate_challenge(self, prompt, track=None, difficulty=None):
        """Generate a challenge using AI"""
        print("\n🤖 Generating challenge using AI...")
        
        # Prepare request payload according to API schema
        payload = {
            "prompt": prompt,
            "preferred_provider": "auto",
            "track": track,
            "difficulty": difficulty,
            "seed": None  # Optional, can be set if deterministic generation is needed
        }

        response = requests.post(
            f"{self.api_url}/api/admin/ai/generate",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        result = response.json()
        
        self.challenge_id = result["challenge_id"]
        self.generation_id = result["generation_id"]
        
        print(f"✅ Challenge generated successfully!")
        print(f"Challenge ID: {self.challenge_id}")
        print(f"Generation ID: {self.generation_id}")
        print("\nGenerated Challenge Details:")
        print(json.dumps(result["generated_json"], indent=2))
        print(f"\nTokens used: {result['tokens_used']}")
        print(f"Cost: ${result['cost_usd']:.4f}")
        
        return result

    def wait_for_validation(self, timeout=300):
        """Wait for challenge validation to complete"""
        print("\n⏳ Waiting for validation to complete...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            response = requests.get(
                f"{self.api_url}/api/admin/challenges/{self.challenge_id}",
                headers=self.headers
            )
            response.raise_for_status()
            challenge = response.json()
            
            if challenge["status"] == "VALIDATION_FAILED":
                print("❌ Validation failed!")
                if challenge.get("latest_validation"):
                    print("\nValidation Feedback:")
                    print(challenge["latest_validation"]["feedback"])
                return False
                
            elif challenge["status"] == "READY_FOR_MATERIALIZATION":
                print("✅ Validation passed!")
                return True
                
            time.sleep(5)
            print(".", end="", flush=True)
            
        raise TimeoutError("Validation timed out")

    def materialize_challenge(self, timeout=300):
        """Materialize challenge artifacts"""
        print("\n🏗️ Materializing challenge artifacts...")
        
        response = requests.post(
            f"{self.api_url}/api/admin/ai/materialize/{self.challenge_id}",
            headers=self.headers,
            json={}
        )
        response.raise_for_status()
        
        # Wait for materialization
        start_time = time.time()
        while time.time() - start_time < timeout:
            response = requests.get(
                f"{self.api_url}/api/admin/challenges/{self.challenge_id}",
                headers=self.headers
            )
            response.raise_for_status()
            challenge = response.json()
            
            if challenge["status"] == "MATERIALIZATION_FAILED":
                print("❌ Materialization failed!")
                return False
                
            elif challenge["status"] == "READY_FOR_PUBLISHING":
                print("✅ Materialization complete!")
                return True
                
            time.sleep(5)
            print(".", end="", flush=True)
            
        raise TimeoutError("Materialization timed out")

    def publish_challenge(self):
        """Publish the challenge"""
        print("\n📢 Publishing challenge...")
        
        response = requests.post(
            f"{self.api_url}/api/admin/ai/publish/{self.challenge_id}",
            headers=self.headers,
            json={}
        )
        response.raise_for_status()
        print("✅ Challenge published successfully!")
        return response.json()

    def create_instance(self):
        """Create a challenge instance for solving"""
        print("\n🚀 Creating challenge instance...")
        
        response = requests.post(
            f"{self.api_url}/api/challenges/{self.challenge_id}/instance",
            headers=self.headers,
            json={}
        )
        response.raise_for_status()
        result = response.json()
        
        print("✅ Challenge instance created!")
        print("\nInstance Details:")
        print(json.dumps(result, indent=2))
        
        return result

    def get_challenge_info(self):
        """Get challenge information"""
        response = requests.get(
            f"{self.api_url}/api/admin/challenges/{self.challenge_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

def main():
    parser = argparse.ArgumentParser(description="Test AI Challenge Generation")
    parser.add_argument("--api-url", default="http://localhost:8000", help="API URL")
    parser.add_argument("--api-key", required=True, help="API Key")
    parser.add_argument("--prompt", help="Challenge generation prompt")
    parser.add_argument("--track", choices=["INTEL_RECON", "ACCESS_EXPLOIT", "IDENTITY_CLOUD", "C2_EGRESS", "DETECT_FORENSICS"], help="Challenge track")
    parser.add_argument("--difficulty", choices=["EASY", "MEDIUM", "HARD", "INSANE"], help="Challenge difficulty")
    args = parser.parse_args()

    # Default prompt if none provided
    if not args.prompt:
        args.prompt = """
        Create a web security challenge focused on API security.
        The challenge should involve finding and exploiting a vulnerability in a REST API.
        Include authentication bypass and privilege escalation elements.
        Make it suitable for intermediate skill level.
        """

    try:
        tester = AIChallengeTester(args.api_url, args.api_key)
        
        # Generate challenge
        result = tester.generate_challenge(args.prompt, args.track, args.difficulty)
        
        # Wait for validation
        if not tester.wait_for_validation():
            print("\n❌ Challenge validation failed. Exiting.")
            sys.exit(1)
        
        # Materialize artifacts
        if not tester.materialize_challenge():
            print("\n❌ Challenge materialization failed. Exiting.")
            sys.exit(1)
        
        # Publish challenge
        tester.publish_challenge()
        
        # Create instance for solving
        instance = tester.create_instance()
        
        # Get final challenge info
        challenge = tester.get_challenge_info()
        
        print("\n🎯 Challenge Ready to Solve!")
        print("\nChallenge Details:")
        print(f"Title: {challenge['title']}")
        print(f"Track: {challenge['track']}")
        print(f"Difficulty: {challenge['difficulty']}")
        print(f"Points: {challenge['points_base']}")
        
        if instance.get('lab_url'):
            print(f"\nLab URL: {instance['lab_url']}")
        
        if instance.get('artifacts'):
            print("\nArtifacts:")
            for artifact in instance['artifacts']:
                print(f"- {artifact['name']}: {artifact['url']}")
        
        print("\n✨ Test completed successfully!")
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ API Error: {str(e)}")
        if hasattr(e, 'response'):
            print(f"Response: {e.response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()