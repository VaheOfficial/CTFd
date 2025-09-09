"""
Prompt templates for CTF challenge generation.
"""
from .challenge_design import challenge_design_template
from .code_generation import code_generation_template
from .vulnerability_implementation import vulnerability_implementation_template
from .validation import validation_template
from .deployment import deployment_template

__all__ = [
    "challenge_design_template",
    "code_generation_template",
    "vulnerability_implementation_template",
    "validation_template",
    "deployment_template"
]
