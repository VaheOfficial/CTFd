'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border border-destructive/30 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-lg bg-destructive/20 border border-destructive/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <span className="text-xl">Something went wrong</span>
            </CardTitle>
            <CardDescription className="text-base">
              An unexpected error occurred. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="p-4 rounded-xl bg-card/50 border border-border backdrop-blur-sm">
                <code className="text-base text-destructive font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <RefreshCw className="h-5 w-5 mr-3" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
