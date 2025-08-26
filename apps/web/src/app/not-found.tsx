'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Shield, 
  Home, 
  ArrowLeft, 
  Search,
  Terminal,
  Zap
} from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-6">
          {/* Animated Icon */}
          <div className="relative inline-block">
            <div className="h-32 w-32 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/25">
              <Shield className="h-16 w-16 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 flex items-center justify-center animate-bounce">
              <span className="text-white text-sm font-bold">!</span>
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-mono text-slate-300">ERROR_404</span>
            </div>
            
            <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              404
            </h1>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              Page Not Found
            </h2>
            
            <p className="text-lg text-slate-400 max-w-md mx-auto">
              The page you're looking for has been moved, deleted, or doesn't exist anymore.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            asChild
            size="lg" 
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300"
          >
            <Link href="/">
              <Home className="h-5 w-5 mr-2" />
              Return to Base
            </Link>
          </Button>
          
          <Button 
            asChild
            variant="outline" 
            size="lg"
            className="border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800/60 transition-all duration-300"
          >
            <Link href="/seasons">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Browse Challenges
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-800/50">
          <p className="text-sm text-slate-500">
            If you believe this is an error, please contact the{' '}
            <Link href="mailto:redactme@dedsec.ai" className="text-emerald-400 font-medium">system administrator</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
