import Link from 'next/link'
import { 
  MessageCircle,
  Users,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ContactPage() {
  return (
    <div className="bg-gray-950">
      <HeroSection />
      <ContactSection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-gray-950 to-gray-900 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
          Get in{' '}
          <span className="text-blue-400">Touch</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          Join our community or message us directly. We're here to help!
        </p>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section className="py-20 bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Facebook Group */}
          <Link 
            href="https://www.facebook.com/groups/propsift/"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-blue-600 transition-all hover:shadow-xl h-full">
              <div className="w-16 h-16 bg-blue-900/50 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">PropSift Mastermind</h2>
              <p className="text-gray-400 mb-6">
                Join our Facebook community! Connect with fellow wholesalers, share strategies, get tips, and receive direct support from the PropSift team.
              </p>
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                Join the Group
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* WhatsApp */}
          <Link 
            href="https://wa.me/639152168012"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-green-600 transition-all hover:shadow-xl h-full">
              <div className="w-16 h-16 bg-green-900/50 rounded-xl flex items-center justify-center mb-6">
                <MessageCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">WhatsApp</h2>
              <p className="text-gray-400 mb-6">
                Message us directly on WhatsApp for quick support, questions, or just to say hello. We typically respond within a few hours.
              </p>
              <div className="flex items-center gap-2 text-green-400 font-semibold">
                +63 915 216 8012
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              PropSift is FREE for 2026! Sign up now and start closing more deals.
            </p>
            <Button asChild size="lg">
              <Link href="/register">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
