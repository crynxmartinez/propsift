'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
  ArrowRight, 
  CheckCircle, 
  BarChart3, 
  Users, 
  Zap, 
  Target,
  ClipboardList,
  TrendingUp,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Star,
  Menu,
  X
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <SocialProofBar />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-gray-900">PropSift</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-gray-600 hover:text-gray-900 font-medium py-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-gray-600 hover:text-gray-900 font-medium py-2"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50 pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Built for Real Estate Wholesalers
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Stop Chasing Leads.{' '}
              <span className="text-blue-600">Start Closing Deals.</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              The all-in-one CRM built for real estate wholesalers. Organize leads, automate follow-ups, and make data-driven decisions to close more deals.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                See All Features
              </Link>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                14-day free trial
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">1,247</p>
                    <p className="text-xs text-green-600">+12% this month</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Hot Leads</p>
                    <p className="text-2xl font-bold text-gray-900">89</p>
                    <p className="text-xs text-green-600">+8 today</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Call Ready</p>
                    <p className="text-2xl font-bold text-gray-900">342</p>
                    <p className="text-xs text-gray-500">With phone numbers</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Tasks Due</p>
                    <p className="text-2xl font-bold text-gray-900">15</p>
                    <p className="text-xs text-orange-600">3 overdue</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Lead Temperature</p>
                  <div className="flex items-end gap-2 h-20">
                    <div className="flex-1 bg-red-400 rounded-t" style={{ height: '60%' }} />
                    <div className="flex-1 bg-orange-400 rounded-t" style={{ height: '80%' }} />
                    <div className="flex-1 bg-blue-400 rounded-t" style={{ height: '40%' }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Hot</span>
                    <span>Warm</span>
                    <span>Cold</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Deal Closed!</p>
                  <p className="text-xs text-gray-500">$12,500 assignment fee</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SocialProofBar() {
  return (
    <section className="bg-white border-y border-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">500+</p>
            <p className="text-sm text-gray-500">Active Wholesalers</p>
          </div>
          <div className="hidden md:block w-px h-12 bg-gray-200" />
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">50,000+</p>
            <p className="text-sm text-gray-500">Leads Managed</p>
          </div>
          <div className="hidden md:block w-px h-12 bg-gray-200" />
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">$2.5M+</p>
            <p className="text-sm text-gray-500">Deals Closed</p>
          </div>
          <div className="hidden md:block w-px h-12 bg-gray-200" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-gray-500">4.9/5 Rating</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      icon: ClipboardList,
      title: 'Lead Management',
      description: 'Centralize all your property leads with owner info, property details, and complete outreach tracking. Never lose a lead again.',
      color: 'blue',
    },
    {
      icon: BarChart3,
      title: 'DockInsight Analytics',
      description: 'Real-time KPIs, charts, and action cards show you exactly where to focus. See hot leads, stale leads, and call-ready prospects at a glance.',
      color: 'purple',
    },
    {
      icon: Target,
      title: 'Kanban Boards',
      description: 'Visual pipeline management for acquisitions and dispositions. Drag and drop records through your custom stages.',
      color: 'green',
    },
    {
      icon: Zap,
      title: 'Workflow Automations',
      description: 'Set up trigger-based actions. When a lead goes hot, automatically assign it, create tasks, and notify your team.',
      color: 'orange',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Role-based access control, round-robin task assignment, and activity tracking. Scale your operation with confidence.',
      color: 'pink',
    },
    {
      icon: Phone,
      title: 'Outreach Tracking',
      description: 'Track call attempts, direct mail, SMS, and voicemails. Know exactly when and how you contacted each lead.',
      color: 'cyan',
    },
  ]

  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600' },
    pink: { bg: 'bg-pink-100', icon: 'text-pink-600' },
    cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600' },
  }

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Close More Deals
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            PropSift combines lead management, analytics, and automation in one powerful platform built specifically for real estate wholesalers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon
            const colors = colorClasses[feature.color]
            return (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/features"
            className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
          >
            See all features
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Import Your Leads',
      description: 'Bulk import from skip trace services, list providers, or add properties manually. PropSift handles any CSV format.',
      icon: ClipboardList,
    },
    {
      number: '02',
      title: 'Qualify & Prioritize',
      description: 'Tag leads by source, add motivations, set temperature (hot/warm/cold), and let PropSift surface your best opportunities.',
      icon: Target,
    },
    {
      number: '03',
      title: 'Work Your Pipeline',
      description: 'Tasks, calls, and follow-ups are tracked automatically. Automations handle the repetitive work so you can focus on conversations.',
      icon: Phone,
    },
    {
      number: '04',
      title: 'Close More Deals',
      description: 'Data-driven insights show you exactly where to focus. Spend less time on admin, more time talking to motivated sellers.',
      icon: TrendingUp,
    },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How PropSift Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From lead import to deal closed, PropSift streamlines your entire wholesaling workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gray-200 -translate-x-1/2" />
                )}
                
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4">
                    <Icon className="w-7 h-7" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-blue-600 text-xs font-bold rounded-full flex items-center justify-center border-2 border-blue-600">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const features = [
    'Unlimited Records',
    'DockInsight Analytics',
    'Lead Cadence Engine',
    'Smart Lead Scoring',
    'Unlimited Automations',
    'Up to 10 Team Members',
    'Priority Support',
  ]

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            One plan. Everything included. No hidden fees.
          </p>
        </div>

        {/* Single Pricing Card with FREE banner */}
        <div className="max-w-md mx-auto">
          <div className="relative rounded-2xl border-2 border-blue-600 shadow-xl p-8 overflow-hidden">
            {/* FREE FOR 2026 Banner - diagonal strike across the price */}
            <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center py-2 font-bold text-lg">
              🎉 FREE FOR 2026 🎉
            </div>

            <div className="text-center mb-6 pt-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Full Access</h3>
              
              {/* Price with strikethrough effect */}
              <div className="relative inline-block">
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-bold text-gray-400 line-through decoration-red-600 decoration-4">$49</span>
                  <span className="text-gray-400 line-through decoration-red-600 decoration-2">/month</span>
                </div>
                <div className="text-2xl font-bold text-green-600">$0 /month for 2026</div>
              </div>
              
              <p className="text-gray-600 mt-4">Everything you need to close more deals.</p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="block w-full text-center py-4 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors text-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
          >
            See all features
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "PropSift completely transformed how I manage my leads. I went from spreadsheets to closing 3x more deals in just 2 months.",
      name: 'Marcus Johnson',
      title: 'Wholesaler, Houston TX',
      avatar: 'MJ',
    },
    {
      quote: "The DockInsight dashboard is a game-changer. I can see exactly which leads to call first and my conversion rate has doubled.",
      name: 'Sarah Chen',
      title: 'Real Estate Investor, Phoenix AZ',
      avatar: 'SC',
    },
    {
      quote: "Finally, a CRM that understands wholesaling. The automations save me hours every week. Worth every penny.",
      name: 'David Williams',
      title: 'Wholesaler, Atlanta GA',
      avatar: 'DW',
    },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Trusted by Wholesalers Nationwide
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See what our customers have to say about PropSift.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">&quot;{testimonial.quote}&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">{testimonial.avatar}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQSection() {
  const faqs = [
    {
      question: 'What is PropSift?',
      answer: 'PropSift is a CRM (Customer Relationship Management) platform built specifically for real estate wholesalers. It helps you organize property leads, track outreach, automate follow-ups, and make data-driven decisions to close more deals.',
    },
    {
      question: 'Do I need technical skills to use PropSift?',
      answer: 'Not at all! PropSift is designed to be intuitive and easy to use. If you can use a spreadsheet, you can use PropSift. We also provide onboarding support to help you get started.',
    },
    {
      question: 'Can I import my existing leads?',
      answer: 'Yes! PropSift supports bulk CSV imports from any source — skip trace services, list providers, or your own spreadsheets. Our import wizard maps your columns automatically.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes, we offer a 14-day free trial with full access to all features. No credit card required to start.',
    },
    {
      question: 'Can I add team members?',
      answer: 'Yes! Our Team plan supports up to 10 team members with role-based access control. You can assign leads, distribute tasks with round-robin, and track team performance.',
    },
    {
      question: 'What kind of support do you offer?',
      answer: 'All plans include email support. Pro and Team plans include priority support with faster response times. Team plans also get access to dedicated support for onboarding and training.',
    },
  ]

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Got questions? We&apos;ve got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
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
          Ready to Close More Deals?
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Join hundreds of wholesalers who are using PropSift to organize their leads, automate their workflow, and grow their business.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white/10 transition-colors"
          >
            <Mail className="w-5 h-5" />
            Contact Sales
          </Link>
        </div>
        <p className="mt-6 text-blue-200 text-sm">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  )
}

function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { href: '/features', label: 'Features' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
    legal: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
    account: [
      { href: '/login', label: 'Login' },
      { href: '/register', label: 'Sign Up' },
    ],
  }

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-white">PropSift</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              The all-in-one CRM built for real estate wholesalers. Organize leads, automate follow-ups, and close more deals.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Account</h3>
            <ul className="space-y-3">
              {footerLinks.account.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} PropSift. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
