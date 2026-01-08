import Link from 'next/link'
import { 
  ArrowRight,
  Target,
  Heart,
  Zap,
  Users,
  TrendingUp,
  Shield
} from 'lucide-react'

export const metadata = {
  title: 'About - PropSift',
  description: 'Learn about PropSift and our mission to help real estate wholesalers close more deals.',
}

export default function AboutPage() {
  return (
    <div className="bg-white">
      <HeroSection />
      <MissionSection />
      <StorySection />
      <ValuesSection />
      <CTASection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Built by Wholesalers,{' '}
          <span className="text-blue-600">For Wholesalers</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          We understand the hustle. That's why we built PropSift — to help you spend less time on admin and more time closing deals.
        </p>
      </div>
    </section>
  )
}

function MissionSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <Target className="w-4 h-4" />
              Our Mission
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Empowering Wholesalers to Scale Their Business
            </h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Real estate wholesaling is one of the best ways to build wealth and create financial freedom. But managing hundreds or thousands of leads across spreadsheets, sticky notes, and scattered tools? That's a recipe for missed opportunities.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Our mission is simple: <strong>give every wholesaler the tools they need to work smarter, not harder.</strong> We believe that with the right system, anyone can build a successful wholesaling business.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-2xl p-6 text-center">
              <p className="text-4xl font-bold text-blue-600 mb-2">500+</p>
              <p className="text-gray-600">Active Wholesalers</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 text-center">
              <p className="text-4xl font-bold text-green-600 mb-2">50K+</p>
              <p className="text-gray-600">Leads Managed</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-6 text-center">
              <p className="text-4xl font-bold text-purple-600 mb-2">$2.5M+</p>
              <p className="text-gray-600">Deals Closed</p>
            </div>
            <div className="bg-orange-50 rounded-2xl p-6 text-center">
              <p className="text-4xl font-bold text-orange-600 mb-2">4.9/5</p>
              <p className="text-gray-600">Customer Rating</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StorySection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Our Story
          </h2>
        </div>

        <div className="prose prose-lg max-w-none text-gray-600">
          <p className="mb-6">
            PropSift was born out of frustration. Like many wholesalers, we started with spreadsheets. Thousands of rows of property data, owner information, and follow-up notes — all crammed into Excel files that crashed when they got too big.
          </p>
          <p className="mb-6">
            We tried other CRMs. Salesforce was too complex and expensive. HubSpot wasn't built for real estate. Podio required a PhD in database design. Nothing fit the unique workflow of a real estate wholesaler.
          </p>
          <p className="mb-6">
            So we built our own. What started as an internal tool quickly became something bigger. Other wholesalers saw what we were using and wanted in. They gave us feedback, feature requests, and pushed us to make it better.
          </p>
          <p className="mb-6">
            Today, PropSift is used by hundreds of wholesalers across the country. From solo operators working their first deals to teams closing millions in assignments every year. We're proud to be part of their success.
          </p>
          <p className="font-semibold text-gray-900">
            And we're just getting started.
          </p>
        </div>
      </div>
    </section>
  )
}

function ValuesSection() {
  const values = [
    {
      icon: Zap,
      title: 'Simplicity',
      description: 'Powerful doesn\'t have to mean complicated. We obsess over making PropSift intuitive and easy to use.',
      color: 'blue',
    },
    {
      icon: Heart,
      title: 'Customer First',
      description: 'Every feature we build starts with a real customer need. Your feedback shapes our roadmap.',
      color: 'red',
    },
    {
      icon: TrendingUp,
      title: 'Results Driven',
      description: 'We measure our success by your success. More deals closed, more time saved, more money made.',
      color: 'green',
    },
    {
      icon: Shield,
      title: 'Trust & Security',
      description: 'Your data is your business. We use industry-standard security and never sell your information.',
      color: 'purple',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'We\'re building more than software — we\'re building a community of successful wholesalers.',
      color: 'orange',
    },
    {
      icon: Target,
      title: 'Continuous Improvement',
      description: 'We ship updates every week. PropSift is always getting better based on your feedback.',
      color: 'cyan',
    },
  ]

  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    red: { bg: 'bg-red-100', icon: 'text-red-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600' },
    cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600' },
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Our Values
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The principles that guide everything we do at PropSift.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map((value) => {
            const Icon = value.icon
            const colors = colorClasses[value.color]
            return (
              <div key={value.title} className="text-center">
                <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`w-7 h-7 ${colors.icon}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-20 bg-blue-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to Join the PropSift Community?
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Start your free trial today and see why hundreds of wholesalers trust PropSift.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white/10 transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </section>
  )
}
