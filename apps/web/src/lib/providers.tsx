'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { useState } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './redux/store'
import { useEffect } from 'react'
import { useAppDispatch } from './redux/hooks'
import { loadAllStats, loadAdminStats } from './redux/slices/statsSlice'
import { useAppSelector } from './redux/hooks'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
            retry: (failureCount, error: any) => {
              // Don't retry on 401/403 errors
              if (error?.status === 401 || error?.status === 403) {
                return false
              }
              return failureCount < 3
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  // Bootstrap loader: when authenticated, load all stats once
  const Bootstrapper = () => {
    const dispatch = useAppDispatch()
    const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
    const role = useAppSelector((s) => s.auth.user?.role)
    useEffect(() => {
      if (isAuthenticated) {
        dispatch(loadAllStats())
        if (role === 'ADMIN') {
          dispatch(loadAdminStats())
        }
      }
    }, [dispatch, isAuthenticated, role])
    return null
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Bootstrapper />
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                },
              }}
            />
          </ThemeProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  )
}