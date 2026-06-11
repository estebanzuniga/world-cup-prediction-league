#!/usr/bin/env python3
"""Block any tool call that targets a .env file."""
import sys
import json
import os

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool = data.get("tool_name", "")
params = data.get("tool_input", {})

BLOCK = json.dumps({"decision": "block", "reason": "Access to .env files is restricted."})
APPROVE = json.dumps({"decision": "approve"})

if tool in ("Read", "Edit", "Write", "Grep"):
    path = params.get("file_path", "") or params.get("path", "")
    name = os.path.basename(path)
    if name == ".env" or name.startswith(".env."):
        print(BLOCK)
        sys.exit(0)

if tool == "Bash":
    cmd = params.get("command", "")
    # Block commands that explicitly read a .env file
    import re
    if re.search(r'\b(cat|head|tail|less|more|nano|vim?|open|bat)\b.*\.env\b', cmd):
        print(BLOCK)
        sys.exit(0)

print(APPROVE)
