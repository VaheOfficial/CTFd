'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Lock, Calendar, User } from 'lucide-react'
import Link from 'next/link'

export default function WriteupPage() {
  const params = useParams()
  const slug = params.slug as string

  // Mock writeup data - replace with actual API call
  const writeup = {
    id: '1',
    slug: slug,
    title: 'Network Traffic Analysis Writeup',
    author: 'security_expert',
    challenge: {
      title: 'Malicious Network Traffic',
      difficulty: 'Medium',
      track: 'Forensics'
    },
    published_at: '2024-01-15T10:00:00Z',
    content: `# Network Traffic Analysis Writeup

## Challenge Overview
This challenge involved analyzing a PCAP file containing suspicious network traffic to identify indicators of compromise.

## Initial Analysis
First, I opened the PCAP file in Wireshark and performed an initial assessment:

\`\`\`bash
wireshark suspicious_traffic.pcap
\`\`\`

## Key Findings
1. **Suspicious DNS Queries**: Multiple queries to known malicious domains
2. **Data Exfiltration**: Base64 encoded data in HTTP requests
3. **Command & Control**: Periodic beacons to external IP

## Solution Steps
### Step 1: DNS Analysis
I filtered for DNS traffic and identified several queries to suspicious domains:
- evil-domain.com
- malicious-site.net

### Step 2: HTTP Traffic Analysis
Examining HTTP traffic revealed:
- POST requests with encoded payloads
- Suspicious user agents
- Regular beaconing pattern

### Step 3: Flag Extraction
The flag was hidden in the base64 encoded payload of the exfiltration traffic.

## Flag
\`CTE{n3tw0rk_f0r3ns1cs_m4st3r}\`

## Lessons Learned
- Always check DNS logs for IOCs
- Base64 encoding is commonly used in data exfiltration
- Regular beaconing patterns indicate C2 communication`,
    is_locked: false,
    unlock_condition: 'Complete the challenge to unlock this writeup'
  }

  if (writeup.is_locked) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Lock className="h-8 w-8 text-yellow-400" />
            Writeup Locked
          </h1>
          <p className="text-muted-foreground">
            This writeup is not yet available
          </p>
        </div>

        <Card>
          <CardContent className="text-center py-16">
            <Lock className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">Complete the Challenge First</CardTitle>
            <CardDescription className="max-w-md mx-auto mb-6">
              {writeup.unlock_condition}
            </CardDescription>
            <Link href="/challenges">
              <Button>Browse Challenges</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8 text-brand" />
          {writeup.title}
        </h1>
        <p className="text-muted-foreground">
          Solution writeup for {writeup.challenge.title}
        </p>
      </div>

      {/* Writeup Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {writeup.author}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                Published {new Date(writeup.published_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {writeup.challenge.track}
              </Badge>
              <Badge variant="medium">
                {writeup.challenge.difficulty}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Challenge Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Related Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{writeup.challenge.title}</h3>
              <p className="text-sm text-muted-foreground">
                {writeup.challenge.track} • {writeup.challenge.difficulty}
              </p>
            </div>
            <Link href={`/challenges/${slug}`}>
              <Button variant="outline">View Challenge</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Writeup Content */}
      <Card>
        <CardHeader>
          <CardTitle>Writeup</CardTitle>
          <CardDescription>
            Detailed solution and methodology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {writeup.content}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
