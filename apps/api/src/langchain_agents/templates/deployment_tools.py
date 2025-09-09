"""
Prompt templates for deployment agent tools.
"""
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

# Infrastructure Setup Templates
INFRASTRUCTURE_SETUP_SYSTEM = """You are an expert CTF infrastructure engineer. Your task is to design and validate infrastructure setups.

Key Considerations:
1. Component Architecture
2. Resource Requirements
3. Scalability
4. Reliability
5. Maintenance

Guidelines:
1. Design efficient setups
2. Consider scalability
3. Ensure reliability
4. Plan maintenance
5. Document thoroughly"""

INFRASTRUCTURE_SETUP_HUMAN = """Plan infrastructure setup for this CTF challenge:

Requirements: {requirements}
Constraints: {constraints}
Resources: {resources}

Please provide:
1. Infrastructure components
2. Setup sequence
3. Configuration details
4. Validation steps
5. Access information

Return JSON only:
{{
  "components": [str],
  "sequence": [str],
  "config": [str],
  "validation": [str],
  "access": [str]
}}"""

infrastructure_setup_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(INFRASTRUCTURE_SETUP_SYSTEM),
    HumanMessagePromptTemplate.from_template(INFRASTRUCTURE_SETUP_HUMAN)
])

# Network Configuration Templates
NETWORK_CONFIG_SYSTEM = """You are an expert CTF network engineer. Your task is to design secure and efficient network configurations.

Key Considerations:
1. Network Topology
2. Security Isolation
3. Access Controls
4. Performance
5. Monitoring

Guidelines:
1. Design secure networks
2. Implement isolation
3. Configure access
4. Optimize performance
5. Enable monitoring"""

NETWORK_CONFIG_HUMAN = """Design network configuration for this CTF challenge:

Network Requirements: {network_requirements}
Security Policy: {security_policy}
Access Controls: {access_controls}

Please provide:
1. Network topology
2. Routing configuration
3. Access control rules
4. Security measures
5. Monitoring points

Return JSON only:
{{
  "topology": [str],
  "routing": [str],
  "acl": [str],
  "security": [str],
  "monitoring": [str]
}}"""

network_config_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(NETWORK_CONFIG_SYSTEM),
    HumanMessagePromptTemplate.from_template(NETWORK_CONFIG_HUMAN)
])

# Security Configuration Templates
SECURITY_CONFIG_SYSTEM = """You are an expert CTF security engineer. Your task is to design and implement security controls.

Key Considerations:
1. Security Controls
2. Access Policies
3. Monitoring Setup
4. Incident Response
5. Compliance

Guidelines:
1. Implement defense-in-depth
2. Apply least privilege
3. Enable auditing
4. Plan incident response
5. Ensure compliance"""

SECURITY_CONFIG_HUMAN = """Design security configuration for this CTF challenge:

Security Requirements: {security_requirements}
Compliance Requirements: {compliance}
Threat Model: {threat_model}

Please provide:
1. Security controls
2. Access policies
3. Monitoring setup
4. Incident response
5. Compliance validation

Return JSON only:
{{
  "controls": [str],
  "policies": [str],
  "monitoring": [str],
  "ir": [str],
  "compliance": [str]
}}"""

security_config_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(SECURITY_CONFIG_SYSTEM),
    HumanMessagePromptTemplate.from_template(SECURITY_CONFIG_HUMAN)
])

# Resource Allocation Templates
RESOURCE_ALLOCATION_SYSTEM = """You are an expert CTF resource manager. Your task is to plan and optimize resource allocation.

Key Considerations:
1. Compute Resources
2. Storage Resources
3. Scaling Requirements
4. Performance Targets
5. Cost Optimization

Guidelines:
1. Allocate efficiently
2. Plan for scaling
3. Set resource limits
4. Monitor usage
5. Optimize costs"""

RESOURCE_ALLOCATION_HUMAN = """Plan resource allocation for this CTF challenge:

Compute Requirements: {compute_requirements}
Storage Requirements: {storage_requirements}
Scaling Policy: {scaling_policy}

Please provide:
1. Resource allocation plan
2. Scaling configuration
3. Resource limits
4. Performance targets
5. Optimization recommendations

Return JSON only:
{{
  "allocation": [str],
  "scaling": [str],
  "limits": [str],
  "performance": [str],
  "optimize": [str]
}}"""

resource_allocation_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(RESOURCE_ALLOCATION_SYSTEM),
    HumanMessagePromptTemplate.from_template(RESOURCE_ALLOCATION_HUMAN)
])

# Monitoring Setup Templates
MONITORING_SETUP_SYSTEM = """You are an expert CTF monitoring engineer. Your task is to design comprehensive monitoring solutions.

Key Considerations:
1. Metrics Collection
2. Alert Rules
3. Dashboards
4. Performance Impact
5. Data Retention

Guidelines:
1. Select key metrics
2. Configure alerts
3. Design dashboards
4. Minimize impact
5. Plan data storage"""

MONITORING_SETUP_HUMAN = """Design monitoring setup for this CTF challenge:

Monitoring Requirements: {monitoring_requirements}
Required Metrics: {metrics}
Alert Configurations: {alerts}

Please provide:
1. Monitoring configuration
2. Metric collection
3. Alert rules
4. Dashboard setup
5. Reporting configuration

Return JSON only:
{{
  "configuration": [str],
  "metrics": [str],
  "alerts": [str],
  "dashboards": [str],
  "reporting": [str]
}}"""

monitoring_setup_template = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(MONITORING_SETUP_SYSTEM),
    HumanMessagePromptTemplate.from_template(MONITORING_SETUP_HUMAN)
])
