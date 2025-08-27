import { NavShell } from '@/components/nav-shell'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function DashLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background">
        <NavShell>
          {children}
        </NavShell>
        
        {/* Footer */}
        <footer className="border-t border-border mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                CTE Platform © 2024 • Defensive Cyber Operations Training
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AuthGuard>
  )
}
