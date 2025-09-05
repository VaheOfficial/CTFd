import hashlib
import hmac
import os
from typing import Optional

def generate_hmac_flag(
    user_id: str,
    challenge_id: str,
    dynamic_seed: str,
    format_string: str = "flag{{{}}}"
) -> str:
    """Generate a dynamic HMAC flag"""
    secret = os.getenv("HMAC_SECRET", "change_me_32_char_secret_12345")
    
    # Create the message to sign
    message = f"{user_id}|{challenge_id}|{dynamic_seed}"
    
    # Generate HMAC
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()[:16]  # Take first 16 chars
    
    # Format the flag
    flag_content = f"{user_id[:8]}:{challenge_id[:8]}:{dynamic_seed[:8]}:{signature}"
    return format_string.format(flag_content)

def verify_hmac_flag(
    submitted_flag: str,
    user_id: str,
    challenge_id: str,
    dynamic_seed: str,
    format_string: str = "flag{{{}}}"
) -> bool:
    """Verify a submitted HMAC flag"""
    expected_flag = generate_hmac_flag(user_id, challenge_id, dynamic_seed, format_string)
    return hmac.compare_digest(submitted_flag, expected_flag)

def verify_static_flag(submitted_flag: str, expected_flag: str) -> bool:
    print(f"submitted_flag: {submitted_flag}, expected_flag: {expected_flag}")
    """Verify a static flag"""
    return hmac.compare_digest(submitted_flag.strip(), expected_flag.strip())
