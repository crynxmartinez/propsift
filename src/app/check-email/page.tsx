'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'

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
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-white">Check Your Email</CardTitle>
            <CardDescription className="text-center text-gray-400">
              We&apos;ve sent an activation link to your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-300 mb-2">Sent to:</p>
              <p className="font-medium text-white">{email}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p>Click the activation link in the email to verify your account</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p>Check your spam or junk folder if you don&apos;t see it</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p>The link expires in 24 hours</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 text-center mb-4">
                Already verified?
              </p>
              <Button className="w-full" asChild>
                <Link href="/login">
                  Go to Login
                </Link>
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Didn&apos;t receive the email? Try registering again after 24 hours or contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  )
}
