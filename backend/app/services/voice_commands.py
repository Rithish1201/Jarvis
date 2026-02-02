"""
Voice Command Parser - Extracts control intents from natural language
Parses user voice commands to control machines
"""
import re
from typing import Dict, Optional, List, Tuple


# Command patterns for machine control - flexible to handle various naming styles
COMMAND_PATTERNS = {
    "stop": [
        r"(?:shut\s*down|stop|turn\s*off|halt|disable)\s+(?:the\s+)?([a-zA-Z]+[\s\-_]*\d*)",
        r"([a-zA-Z]+[\s\-_]*\d*)\s+(?:should\s+)?(?:be\s+)?(?:shut\s*down|stopped|turned\s*off)",
        r"(?:stop|shutdown)\s+(?:the\s+)?(?:machine\s+)?([a-zA-Z]+[\s\-_]*\d*)",
    ],
    "start": [
        r"(?:start|turn\s*on|enable|activate|boot)\s+(?:up\s+)?(?:the\s+)?([a-zA-Z]+[\s\-_]*\d*)",
        r"([a-zA-Z]+[\s\-_]*\d*)\s+(?:should\s+)?(?:be\s+)?(?:started|turned\s*on|activated)",
        r"(?:start|boot)\s+(?:the\s+)?(?:machine\s+)?([a-zA-Z]+[\s\-_]*\d*)",
    ],
    "adjust_speed": [
        r"(?:set|change|adjust|modify)\s+(?:the\s+)?speed\s+(?:of\s+)?(?:the\s+)?([a-zA-Z]+[\s\-_]*\d*)\s+(?:to\s+)?(\d+)",
        r"(?:reduce|decrease|lower)\s+(?:the\s+)?speed\s+(?:of\s+)?(?:the\s+)?([a-zA-Z]+[\s\-_]*\d*)\s+(?:by\s+)?(\d+)",
        r"(?:increase|raise|boost)\s+(?:the\s+)?speed\s+(?:of\s+)?(?:the\s+)?([a-zA-Z]+[\s\-_]*\d*)\s+(?:by\s+)?(\d+)",
        r"([a-zA-Z]+[\s\-_]*\d*)\s+speed\s+(?:to\s+)?(\d+)",
    ],
    "schedule_maintenance": [
        r"schedule\s+(?:a\s+)?maintenance\s+(?:for\s+)?(?:the\s+)?([a-zA-Z]+[\s\-_]*\d*)",
        r"(?:plan|book|set\s*up)\s+(?:a\s+)?(?:maintenance|service)\s+(?:for\s+)?(?:the\s+)?([a-zA-Z]+[\s\-_]*\d*)",
        r"([a-zA-Z]+[\s\-_]*\d*)\s+(?:needs|requires)\s+maintenance",
    ],
}

# Known machine IDs (can be dynamically loaded)
KNOWN_MACHINES = ["MILL-01", "LATHE-02", "PRESS-03", "CNC-04", "DRILL-05"]


def normalize_machine_id(text: str) -> Optional[str]:
    """Normalize machine ID from user input"""
    if not text:
        return None
        
    # Clean and normalize
    text = text.upper().strip()
    # Remove spaces, replace with hyphen for standard format
    text = re.sub(r'\s+', '-', text)
    # Remove trailing 's' (e.g., "Mills" -> "MILL")
    text = re.sub(r'S$', '', text)
    # Try to extract number and normalize format
    match = re.match(r'^([A-Z]+)[-_\s]*(\d*)$', text)
    if match:
        base, num = match.groups()
        # Find matching machine
        for machine in KNOWN_MACHINES:
            machine_base = machine.split("-")[0]
            if base == machine_base or base.startswith(machine_base):
                return machine
        # If number provided, format it
        if num:
            return f"{base}-{num.zfill(2)}"
    
    # Direct match
    if text in KNOWN_MACHINES:
        return text
    
    # Fuzzy match for common names
    name_map = {
        "MILL": "MILL-01",
        "LATHE": "LATHE-02", 
        "PRESS": "PRESS-03",
        "CNC": "CNC-04",
        "DRILL": "DRILL-05",
        "MACHINE1": "MILL-01",
        "MACHINE2": "LATHE-02",
        "MACHINE3": "PRESS-03",
        "FIRST": "MILL-01",
        "SECOND": "LATHE-02",
        "THIRD": "PRESS-03",
    }
    
    # Remove hyphens for matching
    clean = re.sub(r"[^A-Z0-9]", "", text)
    if clean in name_map:
        return name_map[clean]
    
    # Return cleaned version or first known machine if nothing matches
    return text if text else None


def parse_voice_command(text: str) -> Optional[Dict]:
    """
    Parse a voice command to extract action and parameters
    
    Returns:
        Dict with keys: action, machine_id, value (optional)
        None if no command detected
    """
    text_lower = text.lower().strip()
    
    # Try each command type
    for action, patterns in COMMAND_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                groups = match.groups()
                machine_id = normalize_machine_id(groups[0]) if groups else None
                
                result = {
                    "action": action,
                    "machine_id": machine_id,
                    "raw_text": text,
                    "confidence": 0.9
                }
                
                # Extract value for speed adjustment
                if action == "adjust_speed" and len(groups) > 1:
                    try:
                        result["value"] = float(groups[1])
                    except (ValueError, IndexError):
                        result["value"] = None
                    
                    # Check for increase/decrease modifiers
                    if "reduce" in text_lower or "decrease" in text_lower or "lower" in text_lower:
                        result["modifier"] = "decrease"
                    elif "increase" in text_lower or "raise" in text_lower or "boost" in text_lower:
                        result["modifier"] = "increase"
                
                return result
    
    return None


def is_control_command(text: str) -> bool:
    """Check if text contains a machine control command"""
    command = parse_voice_command(text)
    return command is not None


def get_confirmation_message(command: Dict, language: str = "en") -> str:
    """Generate a confirmation message for the command"""
    action = command.get("action", "")
    machine_id = command.get("machine_id", "unknown")
    value = command.get("value")
    
    confirmations = {
        "en": {
            "stop": f"I'm about to shut down {machine_id}. Do you want me to proceed?",
            "start": f"I'm about to start {machine_id}. Should I continue?",
            "adjust_speed": f"I'll adjust {machine_id}'s speed to {value}%. Confirm?",
            "schedule_maintenance": f"I'll schedule maintenance for {machine_id}. Is that correct?"
        },
        "ta": {
            "stop": f"{machine_id} நிறுத்த போகிறேன். தொடரவா?",
            "start": f"{machine_id} தொடங்க போகிறேன். தொடரவா?",
            "adjust_speed": f"{machine_id} வேகத்தை {value}% ஆக மாற்றுவேன். சரியா?",
            "schedule_maintenance": f"{machine_id} பராமரிப்பு திட்டமிடுவேன். சரியா?"
        },
        "tanglish": {
            "stop": f"{machine_id} shutdown pannaporen. Proceed pannava?",
            "start": f"{machine_id} start pannaporen. Continue pannava?",
            "adjust_speed": f"{machine_id} speed-a {value}% ku change pannuven. Confirm pannava?",
            "schedule_maintenance": f"{machine_id} ku maintenance schedule pannuven. OK-va?"
        }
    }
    
    lang_confirmations = confirmations.get(language, confirmations["en"])
    return lang_confirmations.get(action, f"Execute {action} on {machine_id}?")


def format_command_result(result: Dict, language: str = "en") -> str:
    """Format command result for voice output"""
    if result.get("success"):
        return result.get("message", "Command executed successfully")
    else:
        return f"Sorry, {result.get('message', 'command failed')}"
