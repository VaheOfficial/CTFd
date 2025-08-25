import json
import yaml
from typing import Dict, Any

from .base import ArtifactGenerator, GENERATORS

class KubeYamlInsecureMountGenerator(ArtifactGenerator):
    """Generate Kubernetes YAML with security issues"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        host_path = params.get('hostPath', '/etc')
        privileged = params.get('privileged', True)
        
        # Create insecure Kubernetes deployment
        deployment = {
            'apiVersion': 'apps/v1',
            'kind': 'Deployment',
            'metadata': {
                'name': f'webapp-{self._deterministic_string(6)}',
                'namespace': 'default'
            },
            'spec': {
                'replicas': 1,
                'selector': {
                    'matchLabels': {
                        'app': 'webapp'
                    }
                },
                'template': {
                    'metadata': {
                        'labels': {
                            'app': 'webapp'
                        }
                    },
                    'spec': {
                        'containers': [{
                            'name': 'webapp',
                            'image': f'nginx:{self.rng.choice(["latest", "1.20", "1.19"])}',
                            'ports': [{'containerPort': 80}],
                            'volumeMounts': [{
                                'name': 'host-volume',
                                'mountPath': '/host-data'
                            }]
                        }],
                        'volumes': [{
                            'name': 'host-volume',
                            'hostPath': {
                                'path': host_path,
                                'type': 'Directory'
                            }
                        }]
                    }
                }
            }
        }
        
        # Add privileged container if requested
        if privileged:
            deployment['spec']['template']['spec']['containers'][0]['securityContext'] = {
                'privileged': True,
                'runAsUser': 0,
                'capabilities': {
                    'add': ['SYS_ADMIN', 'NET_ADMIN']
                }
            }
        
        # Add additional security issues
        deployment['spec']['template']['spec']['serviceAccountName'] = 'default'
        deployment['spec']['template']['spec']['automountServiceAccountToken'] = True
        
        return yaml.dump(deployment, default_flow_style=False).encode('utf-8')

class IamPolicyOverbreadGenerator(ArtifactGenerator):
    """Generate overprivileged IAM policies"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        service = params.get('service', 's3')
        actions = params.get('actions', 10)
        
        if service == 's3':
            policy = self._generate_aws_s3_policy(actions)
        elif service == 'azure':
            policy = self._generate_azure_policy(actions)
        else:
            policy = self._generate_aws_s3_policy(actions)
        
        return json.dumps(policy, indent=2).encode('utf-8')
    
    def _generate_aws_s3_policy(self, actions: int) -> Dict[str, Any]:
        """Generate overprivileged AWS S3 policy"""
        
        # Start with legitimate actions
        s3_actions = [
            's3:GetObject',
            's3:PutObject',
            's3:ListBucket'
        ]
        
        # Add excessive permissions
        excessive_actions = [
            's3:*',  # Wildcard - major security issue
            's3:DeleteBucket',
            's3:PutBucketPolicy',
            's3:PutBucketAcl',
            's3:GetBucketAcl',
            's3:PutObjectAcl',
            's3:DeleteObject',
            's3:GetBucketLocation',
            's3:ListAllMyBuckets'
        ]
        
        # Select actions up to the limit
        selected_actions = s3_actions + self.rng.sample(
            excessive_actions, 
            min(actions - len(s3_actions), len(excessive_actions))
        )
        
        policy = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Sid': f'AllowS3Access{self._deterministic_string(8)}',
                    'Effect': 'Allow',
                    'Action': selected_actions,
                    'Resource': [
                        '*',  # Overly broad resource
                        'arn:aws:s3:::*/*'
                    ]
                }
            ]
        }
        
        # Add additional risky statements
        if actions > 5:
            policy['Statement'].append({
                'Sid': 'AllowAdminAccess',
                'Effect': 'Allow',
                'Action': '*',  # Complete admin access - major issue
                'Resource': '*'
            })
        
        return policy
    
    def _generate_azure_policy(self, actions: int) -> Dict[str, Any]:
        """Generate overprivileged Azure RBAC policy"""
        
        policy = {
            'properties': {
                'roleName': f'CustomRole{self._deterministic_string(8)}',
                'description': 'Custom role for application access',
                'type': 'CustomRole',
                'permissions': [
                    {
                        'actions': [
                            'Microsoft.Storage/storageAccounts/read',
                            'Microsoft.Storage/storageAccounts/listKeys/action',
                            'Microsoft.Storage/storageAccounts/blobServices/containers/read'
                        ],
                        'notActions': [],
                        'dataActions': [
                            'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read',
                            'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write'
                        ],
                        'notDataActions': []
                    }
                ],
                'assignableScopes': [
                    '/subscriptions/*'  # Overly broad scope
                ]
            }
        }
        
        # Add excessive permissions
        if actions > 3:
            policy['properties']['permissions'][0]['actions'].extend([
                '*',  # Wildcard permissions
                'Microsoft.Authorization/*/write',
                'Microsoft.Resources/deployments/*'
            ])
        
        return policy

class AzureSigninJsonGenerator(ArtifactGenerator):
    """Generate Azure sign-in logs with anomalies"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        num_events = params.get('num_events', 50)
        impossible_travel = params.get('impossible_travel', True)
        
        events = []
        
        # Generate normal sign-in events
        normal_users = [f"user{i:03d}@corp.com" for i in range(1, 11)]
        normal_locations = [
            {'city': 'Seattle', 'country': 'US', 'lat': 47.6062, 'lon': -122.3321},
            {'city': 'New York', 'country': 'US', 'lat': 40.7128, 'lon': -74.0060},
            {'city': 'London', 'country': 'GB', 'lat': 51.5074, 'lon': -0.1278}
        ]
        
        for i in range(num_events - 5):
            user = self.rng.choice(normal_users)
            location = self.rng.choice(normal_locations)
            
            event = {
                'id': self._deterministic_string(32),
                'createdDateTime': self._deterministic_timestamp(),
                'userPrincipalName': user,
                'userId': self._deterministic_string(32),
                'appDisplayName': self.rng.choice(['Microsoft 365', 'Azure Portal', 'SharePoint']),
                'clientAppUsed': 'Browser',
                'deviceDetail': {
                    'browser': 'Chrome',
                    'operatingSystem': 'Windows 10',
                    'trustType': 'Hybrid Azure AD joined'
                },
                'location': {
                    'city': location['city'],
                    'countryOrRegion': location['country'],
                    'geoCoordinates': {
                        'latitude': location['lat'],
                        'longitude': location['lon']
                    }
                },
                'ipAddress': self._deterministic_ip(),
                'riskState': 'none',
                'riskLevelAggregated': 'none',
                'status': {
                    'errorCode': 0,
                    'failureReason': None
                }
            }
            
            events.append(event)
        
        # Generate impossible travel events
        if impossible_travel:
            suspicious_user = 'admin@corp.com'
            
            # First login from Seattle
            event1 = {
                'id': self._deterministic_string(32),
                'createdDateTime': '2024-01-15T10:00:00Z',
                'userPrincipalName': suspicious_user,
                'userId': self._deterministic_string(32),
                'appDisplayName': 'Azure Portal',
                'clientAppUsed': 'Browser',
                'location': {
                    'city': 'Seattle',
                    'countryOrRegion': 'US',
                    'geoCoordinates': {
                        'latitude': 47.6062,
                        'longitude': -122.3321
                    }
                },
                'ipAddress': '203.0.113.1',
                'riskState': 'none',
                'status': {'errorCode': 0}
            }
            
            # Second login from Tokyo 30 minutes later (impossible travel)
            event2 = {
                'id': self._deterministic_string(32),
                'createdDateTime': '2024-01-15T10:30:00Z',
                'userPrincipalName': suspicious_user,
                'userId': event1['userId'],
                'appDisplayName': 'Azure Portal',
                'clientAppUsed': 'Browser',
                'location': {
                    'city': 'Tokyo',
                    'countryOrRegion': 'JP',
                    'geoCoordinates': {
                        'latitude': 35.6762,
                        'longitude': 139.6503
                    }
                },
                'ipAddress': '198.51.100.1',
                'riskState': 'atRisk',
                'riskLevelAggregated': 'high',
                'status': {'errorCode': 0}
            }
            
            events.extend([event1, event2])
        
        # Wrap in Azure log format
        log_data = {
            'value': events,
            '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#auditLogs/signIns'
        }
        
        return json.dumps(log_data, indent=2).encode('utf-8')

# Register generators
GENERATORS['kubeyaml_insecure_mount'] = KubeYamlInsecureMountGenerator
GENERATORS['iam_policy_overbroad'] = IamPolicyOverbreadGenerator
GENERATORS['azure_signin_json'] = AzureSigninJsonGenerator
