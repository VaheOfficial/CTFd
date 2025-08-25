export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          CTE Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Self-hosted CTF platform optimized for Defensive Cyberspace Operations (DCO) 
          with optional OCO-lite challenges.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">DCO-First Design</h3>
            <p className="text-muted-foreground">
              Short, self-contained challenges focused on defensive operations, 
              artifact analysis, and threat detection.
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Dynamic Flags</h3>
            <p className="text-muted-foreground">
              HMAC-based flag generation ensures unique solutions per participant
              while maintaining scoring integrity.
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Live Labs</h3>
            <p className="text-muted-foreground">
              Optional ephemeral container environments accessible via 
              Kasm workspaces or VPN connections.
            </p>
          </div>
        </div>
        
        <div className="mt-8 space-x-4">
          <a 
            href="/login" 
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Sign In
          </a>
          <a 
            href="/api/docs" 
            className="inline-flex items-center px-6 py-3 border border-input rounded-md hover:bg-accent"
          >
            API Docs
          </a>
        </div>
      </div>
    </main>
  )
}
