#!/usr/bin/env python3
"""
Challenge Publisher CLI

Usage:
    python scripts/publish_challenge.py path/to/challenge --season season_id --week week_index
"""

import argparse
import yaml
import json
import hashlib
import os
import sys
import boto3
from pathlib import Path
import requests
from typing import Dict, Any

def calculate_sha256(file_path: Path) -> str:
    """Calculate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()

def validate_challenge_yaml(challenge_data: Dict[Any, Any]) -> bool:
    """Validate challenge.yml structure"""
    required_fields = [
        'id', 'title', 'track', 'difficulty', 'points', 
        'time_cap_minutes', 'mode', 'flag'
    ]
    
    for field in required_fields:
        if field not in challenge_data:
            print(f"Error: Missing required field '{field}' in challenge.yml")
            return False
    
    # Validate artifacts
    if 'artifacts' in challenge_data:
        for artifact in challenge_data['artifacts']:
            if not all(key in artifact for key in ['path', 'kind']):
                print(f"Error: Artifact missing required fields: {artifact}")
                return False
    
    return True

def upload_artifact_to_s3(file_path: Path, s3_client, bucket: str) -> str:
    """Upload artifact to S3 and return key"""
    # Use content hash as S3 key for deduplication
    sha256 = calculate_sha256(file_path)
    s3_key = f"artifacts/{sha256[:2]}/{sha256[2:4]}/{sha256}"
    
    try:
        # Check if already exists
        s3_client.head_object(Bucket=bucket, Key=s3_key)
        print(f"Artifact already exists in S3: {s3_key}")
    except Exception as e:
        # Handle both NoSuchKey and other S3 errors
        if "NoSuchKey" in str(e) or "404" in str(e):
            # Upload file
            print(f"Uploading {file_path.name} to S3...")
            s3_client.upload_file(str(file_path), bucket, s3_key)
            print(f"Uploaded to: {s3_key}")
        else:
            print(f"Error checking S3 object: {e}")
            raise
    
    return s3_key

def validate_and_process_challenge(challenge_dir: Path, dry_run: bool = False) -> tuple[bool, dict]:
    """Validate challenge and process artifacts (returns success, challenge_data)"""
    
    # Load challenge.yml
    challenge_yaml_path = challenge_dir / "challenge.yml"
    if not challenge_yaml_path.exists():
        print(f"❌ Error: challenge.yml not found in {challenge_dir}")
        return False, {}
    
    try:
        with open(challenge_yaml_path, 'r') as f:
            challenge_data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        print(f"❌ Error parsing challenge.yml: {e}")
        return False, {}
    
    # Validate structure
    if not validate_challenge_yaml(challenge_data):
        return False, {}
    
    print(f"✅ Challenge YAML structure valid")
    print(f"   Title: {challenge_data['title']}")
    print(f"   Track: {challenge_data['track']}")
    print(f"   Difficulty: {challenge_data['difficulty']}")
    print(f"   Points: {challenge_data['points']}")
    
    # Process artifacts
    artifacts_dir = challenge_dir / "artifacts"
    if artifacts_dir.exists() and 'artifacts' in challenge_data:
        print(f"\n📁 Processing {len(challenge_data['artifacts'])} artifact(s):")
        
        for i, artifact in enumerate(challenge_data['artifacts']):
            artifact_path = artifacts_dir / artifact['path']
            if not artifact_path.exists():
                print(f"❌ Error: Artifact file not found: {artifact_path}")
                return False, {}
            
            # Calculate and verify SHA256
            actual_sha256 = calculate_sha256(artifact_path)
            if 'sha256' in artifact:
                if artifact['sha256'] != actual_sha256:
                    print(f"❌ Error: SHA256 mismatch for {artifact['path']}")
                    print(f"   Expected: {artifact['sha256']}")
                    print(f"   Actual: {actual_sha256}")
                    return False, {}
                print(f"   ✅ {artifact['path']} (SHA256 verified)")
            else:
                # Add calculated SHA256
                artifact['sha256'] = actual_sha256
                print(f"   ✅ {artifact['path']} (SHA256 calculated: {actual_sha256[:16]}...)")
            
            # Add file size
            artifact['size_bytes'] = artifact_path.stat().st_size
            
            if not dry_run:
                # Setup S3 client for actual upload
                s3_client = boto3.client(
                    's3',
                    endpoint_url=os.getenv('S3_ENDPOINT', 'http://localhost:9000'),
                    aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minio'),
                    aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minio123')
                )
                bucket = os.getenv('S3_BUCKET', 'cte-artifacts')
                
                try:
                    s3_key = upload_artifact_to_s3(artifact_path, s3_client, bucket)
                    artifact['s3_key'] = s3_key
                except Exception as e:
                    print(f"❌ Error uploading {artifact['path']}: {e}")
                    return False, {}
            else:
                # Dry run - simulate S3 key
                s3_key = f"artifacts/{actual_sha256[:2]}/{actual_sha256[2:4]}/{actual_sha256}"
                artifact['s3_key'] = s3_key
                print(f"      → Would upload to S3: {s3_key}")
    
    return True, challenge_data

def publish_challenge(challenge_dir: Path, season_id: str = None, week_index: int = None, dry_run: bool = False):
    """Publish a challenge to the platform"""
    
    # Validate and process challenge
    success, challenge_data = validate_and_process_challenge(challenge_dir, dry_run)
    if not success:
        return False
    
    if dry_run:
        print(f"\n🔍 DRY RUN - Would submit to API:")
        print(f"   URL: {os.getenv('API_URL', 'http://localhost:8000')}/api/admin/challenges")
        print(f"   Challenge ID: {challenge_data['id']}")
        print(f"   Title: {challenge_data['title']}")
        if season_id:
            print(f"   Season: {season_id}")
        if week_index:
            print(f"   Week: {week_index}")
        print(f"   Artifacts: {len(challenge_data.get('artifacts', []))}")
        print(f"   Hints: {len(challenge_data.get('hints', []))}")
        print(f"\n✅ Dry run completed successfully!")
        return True

    
    # Prepare API payload
    api_payload = {
        'challenge_yaml': challenge_data,
        'season_id': season_id,
        'week_index': week_index
    }
    
    # Submit to API
    api_url = os.getenv('API_URL', 'http://localhost:8000')
    api_token = os.getenv('API_TOKEN')
    
    # Prepare headers
    headers = {'Content-Type': 'application/json'}
    if api_token:
        headers['Authorization'] = f'Bearer {api_token}'
    else:
        print("⚠️  Warning: No API_TOKEN set. Authentication may fail.")
    
    try:
        response = requests.post(
            f"{api_url}/api/admin/challenges",
            json=api_payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Challenge '{challenge_data['title']}' published successfully!")
            print(f"Challenge ID: {result.get('challenge_id', challenge_data['id'])}")
            print(f"Status: {result.get('status', 'unknown')}")
            return True
        elif response.status_code == 401:
            print(f"❌ Authentication failed. Check API_TOKEN.")
            return False
        elif response.status_code == 403:
            print(f"❌ Access forbidden. Insufficient permissions.")
            return False
        elif response.status_code == 409:
            print(f"❌ Challenge ID conflict: {response.json().get('detail', 'Already exists')}")
            return False
        else:
            print(f"❌ API Error: {response.status_code}")
            try:
                error_detail = response.json().get('detail', 'Unknown error')
                print(f"Error: {error_detail}")
            except:
                print(response.text)
            return False
            
    except requests.Timeout:
        print(f"❌ Request timeout. Check API server.")
        return False
    except requests.ConnectionError:
        print(f"❌ Failed to connect to API at {api_url}")
        return False
    except requests.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description='Publish a challenge to the CTE platform',
        epilog="""
Examples:
  # Validate challenge structure only
  python scripts/publish_challenge.py path/to/challenge --dry-run
  
  # Publish challenge immediately
  python scripts/publish_challenge.py path/to/challenge
  
  # Publish to specific season and week
  python scripts/publish_challenge.py path/to/challenge --season season-uuid --week 3

Environment variables required:
  API_URL (default: http://localhost:8000)
  API_TOKEN (for authentication)
  S3_ENDPOINT (default: http://localhost:9000)
  S3_ACCESS_KEY (default: minio)
  S3_SECRET_KEY (default: minio123)
  S3_BUCKET (default: cte-artifacts)
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('challenge_dir', type=Path, help='Path to challenge directory')
    parser.add_argument('--season', type=str, help='Season ID to publish to')
    parser.add_argument('--week', type=int, help='Week index within season (1-52)')
    parser.add_argument('--dry-run', action='store_true', help='Validate only, do not publish')
    
    # Show help if no arguments
    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(1)
    
    args = parser.parse_args()
    
    if not args.challenge_dir.exists():
        print(f"Error: Challenge directory not found: {args.challenge_dir}")
        sys.exit(1)
    
    if not args.challenge_dir.is_dir():
        print(f"Error: Not a directory: {args.challenge_dir}")
        sys.exit(1)
    
    success = publish_challenge(args.challenge_dir, args.season, args.week, args.dry_run)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
