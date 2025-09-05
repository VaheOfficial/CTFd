# AI Challenge Testing Script

This script demonstrates the end-to-end flow of generating, validating, materializing, and deploying an AI-generated challenge.

## Prerequisites

1. Running CTFd API server
2. Valid API key with admin permissions
3. Python 3.7+
4. Required Python packages:
   ```bash
   pip install requests
   ```

## Usage

Basic usage:
```bash
python test_ai_challenge.py --api-key YOUR_API_KEY
```

This will generate a challenge using the default prompt (API security challenge).

### Custom Challenge Generation

You can customize the challenge generation:

```bash
python test_ai_challenge.py \
  --api-key YOUR_API_KEY \
  --prompt "Create a forensics challenge involving memory analysis of a compromised Linux system" \
  --track DETECT_FORENSICS \
  --difficulty MEDIUM
```

### Available Options

- `--api-url`: API server URL (default: http://localhost:8000)
- `--api-key`: Your API key (required)
- `--prompt`: Challenge generation prompt
- `--track`: Challenge track (INTEL_RECON, ACCESS_EXPLOIT, IDENTITY_CLOUD, C2_EGRESS, DETECT_FORENSICS)
- `--difficulty`: Challenge difficulty (EASY, MEDIUM, HARD, INSANE)

## Example Prompts

1. Web Security Challenge:
```bash
python test_ai_challenge.py --api-key YOUR_API_KEY --prompt "
Create a web security challenge involving a vulnerable GraphQL API.
Include injection vulnerabilities and broken access controls.
Make it challenging but not too difficult.
"
```

2. Forensics Challenge:
```bash
python test_ai_challenge.py --api-key YOUR_API_KEY --prompt "
Create a digital forensics challenge involving network traffic analysis.
Include C2 traffic hidden in DNS queries.
Make it suitable for advanced players.
" --track DETECT_FORENSICS --difficulty HARD
```

3. Cloud Security Challenge:
```bash
python test_ai_challenge.py --api-key YOUR_API_KEY --prompt "
Create an AWS security challenge involving IAM misconfigurations.
Include overly permissive policies and privilege escalation paths.
Make it educational for cloud security beginners.
" --track IDENTITY_CLOUD --difficulty EASY
```

## Script Flow

1. Generates challenge using AI
2. Waits for validation to complete
3. Materializes challenge artifacts
4. Publishes the challenge
5. Creates a challenge instance
6. Displays challenge details and solving instructions

## Output

The script provides detailed output at each stage:

- Challenge generation details
- Validation status and feedback
- Materialization progress
- Instance details including lab URL and artifacts
- Cost information (tokens used and USD)
