'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${token}`)
        const data = await res.json()

        if (res.ok) {
          setStatus('success')
          setMessage(data.message || 'Email verified successfully!')
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed.')
        }
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage('An error occurred during verification.')
      }
    }

    verifyEmail()
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl bg-gray-800 border-gray-700">
          <CardHeader className="space-y-1">
            <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2 text-gray-400 hover:text-white" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            
            {status === 'loading' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-center text-white">Verifying...</CardTitle>
                <CardDescription className="text-center text-gray-400">
                  Please wait while we verify your email
                </CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-center text-white">Email Verified!</CardTitle>
                <CardDescription className="text-center text-gray-400">
                  {message}
                </CardDescription>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full">
                    <XCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-center text-white">Verification Failed</CardTitle>
                <CardDescription className="text-center text-gray-400">
                  {message}
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {status === 'success' && (
              <Button className="w-full" onClick={() => router.push('/login')}>
                Go to Login
              </Button>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Button className="w-full" variant="outline" onClick={() => router.push('/register')}>
                  Try Registering Again
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  If you continue to have issues, please contact support.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
