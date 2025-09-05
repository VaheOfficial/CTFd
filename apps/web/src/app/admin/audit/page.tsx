'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuditLogs } from '@/lib/api/hooks'
import { 
  FileText, 
  Search, 
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  Edit,
  Trash2,
  Settings,
  RefreshCw
} from 'lucide-react'

// Mock audit logs - replace with actual API call
const mockAuditLogs = [
  {
    id: '1',
    action: 'challenge.published',
    entity_type: 'challenge',
    entity_id: 'ch_123',
    actor_user_id: 'user_admin',
    actor_username: 'admin',
    details: { challenge_title: 'Advanced Network Forensics', season_id: 'season_1', week: 3 },
    timestamp: '2024-01-15T14:30:00Z',
    ip_address: '192.168.1.100',
    severity: 'info'
  },
  {
    id: '2',
    action: 'user.role_changed',
    entity_type: 'user',
    entity_id: 'user_123',
    actor_user_id: 'user_admin',
    actor_username: 'admin',
    details: { old_role: 'participant', new_role: 'moderator', target_username: 'security_student' },
    timestamp: '2024-01-15T13:15:00Z',
    ip_address: '192.168.1.100',
    severity: 'warning'
  },
  {
    id: '3',
    action: 'ai.challenge_generated',
    entity_type: 'challenge',
    entity_id: 'ch_ai_456',
    actor_user_id: 'user_admin',
    actor_username: 'admin',
    details: { prompt: 'Create malware analysis challenge', status: 'success' },
    timestamp: '2024-01-15T12:45:00Z',
    ip_address: '192.168.1.100',
    severity: 'info'
  },
  {
    id: '4',
    action: 'user.failed_login',
    entity_type: 'user',
    entity_id: 'user_456',
    actor_user_id: null,
    actor_username: 'unknown',
    details: { username: 'attacker_user', reason: 'invalid_password', attempts: 3 },
    timestamp: '2024-01-15T11:30:00Z',
    ip_address: '203.0.113.42',
    severity: 'error'
  },
  {
    id: '5',
    action: 'season.created',
    entity_type: 'season',
    entity_id: 'season_2',
    actor_user_id: 'user_admin',
    actor_username: 'admin',
    details: { season_name: 'Spring DCO Challenge 2024', total_weeks: 8 },
    timestamp: '2024-01-15T10:00:00Z',
    ip_address: '192.168.1.100',
    severity: 'info'
  }
]

export default function AdminAuditPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  
  const filteredLogs = mockAuditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.actor_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAction = actionFilter === 'all' || log.action.startsWith(actionFilter)
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter
    
    return matchesSearch && matchesAction && matchesSeverity
  })

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-400" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-400" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>
      case 'warning':
        return <Badge variant="warning">WARNING</Badge>
      case 'info':
        return <Badge variant="outline">INFO</Badge>
      default:
        return <Badge variant="default">SUCCESS</Badge>
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return <Edit className="h-4 w-4" />
    if (action.includes('delete')) return <Trash2 className="h-4 w-4" />
    if (action.includes('view') || action.includes('access')) return <Eye className="h-4 w-4" />
    if (action.includes('login') || action.includes('auth')) return <Shield className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  const formatActionName = (action: string) => {
    return action.split('.').map(part => 
      part.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    ).join(' - ')
  }

  return (
    <div className="space-y-8 py-8 px-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-brand" />
            Audit Log
          </h1>
          <p className="text-muted-foreground">
            Monitor system activity and security events
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredLogs.filter(log => log.severity === 'error').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Security incidents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredLogs.filter(log => log.severity === 'warning').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredLogs.map(log => log.actor_user_id).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique actors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Filter audit logs by activity, severity, and time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="user">User Actions</SelectItem>
                  <SelectItem value="challenge">Challenge Actions</SelectItem>
                  <SelectItem value="season">Season Actions</SelectItem>
                  <SelectItem value="ai">AI Actions</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="warning">Warnings</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredLogs.length} entries)</CardTitle>
          <CardDescription>
            Chronological list of system events and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-4 p-4 rounded-lg border border-slate-700 hover:border-brand/50 transition-colors">
                <div className="flex items-center space-x-2 mt-1">
                  {getSeverityIcon(log.severity)}
                  {getActionIcon(log.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-white">
                        {formatActionName(log.action)}
                      </h3>
                      {getSeverityBadge(log.severity)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {log.actor_username}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {log.entity_type}
                    </span>
                    <span>
                      IP: {log.ip_address}
                    </span>
                  </div>
                  
                  {/* Event Details */}
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-sm">
                      {Object.entries(log.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-1">
                          <span className="text-slate-400 capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="text-white font-mono text-xs">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No audit logs found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
