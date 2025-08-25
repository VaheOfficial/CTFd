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
    except s3_client.exceptions.NoSuchKey:
        # Upload file
        print(f"Uploading {file_path.name} to S3...")
        s3_client.upload_file(str(file_path), bucket, s3_key)
        print(f"Uploaded to: {s3_key}")
    
    return s3_key

def publish_challenge(challenge_dir: Path, season_id: str = None, week_index: int = None):
    """Publish a challenge to the platform"""
    
    # Load challenge.yml
    challenge_yaml_path = challenge_dir / "challenge.yml"
    if not challenge_yaml_path.exists():
        print(f"Error: challenge.yml not found in {challenge_dir}")
        return False
    
    with open(challenge_yaml_path, 'r') as f:
        challenge_data = yaml.safe_load(f)
    
    # Validate structure
    if not validate_challenge_yaml(challenge_data):
        return False
    
    # Setup S3 client
    s3_client = boto3.client(
        's3',
        endpoint_url=os.getenv('S3_ENDPOINT', 'http://localhost:9000'),
        aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minio'),
        aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minio123')
    )
    bucket = os.getenv('S3_BUCKET', 'cte-artifacts')
    
    # Process artifacts
    artifacts_dir = challenge_dir / "artifacts"
    if artifacts_dir.exists() and 'artifacts' in challenge_data:
        for artifact in challenge_data['artifacts']:
            artifact_path = artifacts_dir / artifact['path']
            if not artifact_path.exists():
                print(f"Error: Artifact file not found: {artifact_path}")
                return False
            
            # Calculate and verify SHA256 if provided
            actual_sha256 = calculate_sha256(artifact_path)
            if 'sha256' in artifact:
                if artifact['sha256'] != actual_sha256:
                    print(f"Error: SHA256 mismatch for {artifact['path']}")
                    print(f"Expected: {artifact['sha256']}")
                    print(f"Actual: {actual_sha256}")
                    return False
            else:
                # Add calculated SHA256
                artifact['sha256'] = actual_sha256
            
            # Upload to S3
            s3_key = upload_artifact_to_s3(artifact_path, s3_client, bucket)
            artifact['s3_key'] = s3_key
            artifact['size_bytes'] = artifact_path.stat().st_size
    
    # Prepare API payload
    api_payload = {
        'challenge_yaml': challenge_data,
        'season_id': season_id,
        'week_index': week_index
    }
    
    # Submit to API
    api_url = os.getenv('API_URL', 'http://localhost:8000')
    try:
        response = requests.post(
            f"{api_url}/api/admin/challenges",
            json=api_payload,
            headers={'Content-Type': 'application/json'}
            # TODO: Add authentication headers
        )
        
        if response.status_code == 201:
            print(f"✅ Challenge '{challenge_data['title']}' published successfully!")
            print(f"Challenge ID: {challenge_data['id']}")
            return True
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            return False
            
    except requests.RequestException as e:
        print(f"❌ Failed to connect to API: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Publish a challenge to the CTE platform')
    parser.add_argument('challenge_dir', type=Path, help='Path to challenge directory')
    parser.add_argument('--season', type=str, help='Season ID to publish to')
    parser.add_argument('--week', type=int, help='Week index within season')
    parser.add_argument('--dry-run', action='store_true', help='Validate only, do not publish')
    
    args = parser.parse_args()
    
    if not args.challenge_dir.exists():
        print(f"Error: Challenge directory not found: {args.challenge_dir}")
        sys.exit(1)
    
    if not args.challenge_dir.is_dir():
        print(f"Error: Not a directory: {args.challenge_dir}")
        sys.exit(1)
    
    if args.dry_run:
        print("🔍 Dry run mode - validation only")
        # TODO: Add dry run validation logic
        return
    
    success = publish_challenge(args.challenge_dir, args.season, args.week)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
