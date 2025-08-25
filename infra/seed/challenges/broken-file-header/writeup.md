# Broken File Header - Solution

## Challenge Description

A file was recovered from a compromised system, but something seems off about it. Your task is to identify what's wrong and determine the flag.

## Solution

### Step 1: Initial Analysis

The file has a `.jpg` extension, suggesting it should be a JPEG image. However, when trying to open it, most image viewers will fail.

### Step 2: Hex Analysis

Using a hex editor (like `xxd`, `hexdump`, or any GUI hex editor):

```bash
xxd corrupted_image.jpg | head -1
```

Expected JPEG header: `FF D8 FF`
Actual header in file: `89 50 4E 47` (PNG signature)

### Step 3: Identify the Issue

The file has been renamed from `.png` to `.jpg`, but the magic number (file signature) remains that of a PNG file:
- PNG signature: `89 50 4E 47 0D 0A 1A 0A`
- JPEG signature: `FF D8 FF E0` or `FF D8 FF E1`

### Step 4: Flag

The flag identifies this mismatch: `flag{magic_number_mismatch}`

## Learning Objectives

- Understanding file signatures and magic numbers
- Recognizing when file extensions don't match content
- Basic forensics techniques for file identification
- Importance of content validation over extension trust

## Defensive Applications

- File upload validation in web applications
- Malware detection (polymorphic threats changing extensions)
- Data loss prevention (DLP) systems
- Forensic analysis of recovered files
