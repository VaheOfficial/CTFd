'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  username: string
  email: string
  role: string
}

export function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('auth_token')
    if (token) {
      fetchUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        localStorage.removeItem('auth_token')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('auth_token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground text-lg font-bold">C</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                CTE Platform
              </h1>
              <span className="text-xs text-muted-foreground">
                Defensive Cyber Operations
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/challenges" 
              className="text-foreground hover:text-primary transition-colors text-sm font-medium"
            >
              Challenges
            </Link>
            <Link 
              href="/leaderboard" 
              className="text-foreground hover:text-primary transition-colors text-sm font-medium"
            >
              Leaderboard
            </Link>
            <Link 
              href="/seasons" 
              className="text-foreground hover:text-primary transition-colors text-sm font-medium"
            >
              Seasons
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm code-font text-primary">{user.username}</span>
                  {user.role === 'admin' && (
                    <Badge variant="default" className="text-xs">Admin</Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden mt-4 flex flex-wrap gap-4">
          <Link 
            href="/challenges" 
            className="text-foreground hover:text-primary transition-colors text-sm font-medium"
          >
            Challenges
          </Link>
          <Link 
            href="/leaderboard" 
            className="text-foreground hover:text-primary transition-colors text-sm font-medium"
          >
            Leaderboard
          </Link>
          <Link 
            href="/seasons" 
            className="text-foreground hover:text-primary transition-colors text-sm font-medium"
          >
            Seasons
          </Link>
        </nav>
      </div>
    </header>
  )
}
