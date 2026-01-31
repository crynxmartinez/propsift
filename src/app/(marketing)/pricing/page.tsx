'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PricingPage() {
  return (
    <div className="bg-gray-950">
      <FreeBanner />
      <HeroSection />
      <PricingCards />
      <FeatureComparison />
      <FAQSection />
      <CTASection />
    </div>
  )
}

function FreeBanner() {
  return (
    <div className="bg-green-600 py-4 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-white text-xl sm:text-2xl font-bold tracking-wide">
          🎉 $10 ENROLLMENT + 3 MONTHS FREE — Limited Time Offer! 🎉
        </p>
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-gray-950 to-gray-900 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
          Simple, Transparent{' '}
          <span className="text-blue-400">Pricing</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          One plan. Everything included. No hidden fees. Cancel anytime.
        </p>
      </div>
    </section>
  )
}

function PricingCards() {
  const features = [
    '10K Records/Month',
    'DockInsight Analytics Dashboard',
    'Lead Cadence Engine (LCE)',
    'Smart Lead Scoring',
    'Temperature-based Prioritization',
    'Unlimited Kanban Boards',
    'Unlimited Automations',
    'Custom Fields',
    'Custom Statuses & Call Results',
    'Task Management & Templates',
    'CSV Import/Export',
    'Up to 10 Team Members',
    'Role-based Access Control',
    'Priority Support',
  ]

  return (
    <section className="py-20 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Single Pricing Card */}
        <div className="max-w-lg mx-auto">
          <div className="relative rounded-2xl border-2 border-blue-600 shadow-xl p-8 bg-gray-900">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">
              $10 + 3 MONTHS FREE
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-white mb-4">Full Access</h3>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold text-white">$10</span>
                <span className="text-gray-400">one-time</span>
              </div>
              <p className="text-xl font-semibold text-green-400 mt-2">Then $49/month after 3 months</p>
              <p className="text-gray-400 mt-2">Everything you need to manage leads and close deals.</p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Button asChild className="w-full" size="lg">
              <Link href="/register">
                Get Started — $10
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Enterprise */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-900/50 text-purple-400 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Enterprise
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Need More?</h3>
            <p className="text-gray-400 mb-6">
              For larger teams or custom requirements, contact us for a tailored solution.
            </p>
            <Button asChild size="lg">
              <Link href="/contact">
                Contact Sales
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureComparison() {
  const categories = [
    {
      name: 'Lead Management',
      features: [
        '10K Property Records/Month',
        'Owner Information & Contact Details',
        'Outreach Tracking & History',
        'Tags & Motivations',
        'Custom Fields',
        'Bulk Import/Export (CSV)',
      ],
    },
    {
      name: 'Analytics & Reporting',
      features: [
        'DockInsight Dashboard',
        'Real-time KPI Cards',
        'Charts & Visualizations',
        'Action Cards & Insights',
        'Team Performance Analytics',
      ],
    },
    {
      name: 'Workflow & Automation',
      features: [
        'Lead Cadence Engine (LCE)',
        'Smart Lead Scoring',
        'Temperature-based Prioritization',
        'Unlimited Kanban Boards',
        'Unlimited Automations',
        'Task Management & Templates',
        'Round-robin Assignment',
      ],
    },
    {
      name: 'Team & Collaboration',
      features: [
        'Up to 10 Team Members',
        'Role-based Access Control',
        'Activity Logs',
        'Real-time Notifications',
      ],
    },
    {
      name: 'Support',
      features: [
        'Email Support',
        'Priority Support',
        'Onboarding Assistance',
      ],
    },
  ]

  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Everything Included</h2>
          <p className="text-xl text-gray-400">One plan with all the features you need</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {categories.map((category) => (
            <div key={category.name} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">{category.name}</h3>
              <ul className="space-y-3">
                {category.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-400 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
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
      question: 'What does the $10 enrollment fee include?',
      answer: 'The $10 one-time enrollment fee gives you immediate full access to PropSift for 3 months completely free. This includes all features: DockInsight analytics, Lead Cadence Engine, smart scoring, unlimited automations, and up to 10 team members.',
    },
    {
      question: 'What happens after 3 months?',
      answer: 'After your 3-month free period, PropSift is $49/month for continued full access. We\'ll notify you before any charges begin. You can cancel anytime — no contracts or commitments.',
    },
    {
      question: 'Is there a contract or commitment?',
      answer: 'No contracts, no commitments. After your 3-month free period, it\'s month-to-month and you can cancel anytime. Your data is always yours.',
    },
    {
      question: 'What\'s included in the $49/month plan?',
      answer: 'Everything! Unlimited records, DockInsight analytics, Lead Cadence Engine, smart scoring, unlimited automations, up to 10 team members, and priority support. One simple price for all features.',
    },
    {
      question: 'What if I need more than 10 team members?',
      answer: 'Contact us for an Enterprise plan! We can accommodate larger teams with custom pricing and additional features like SSO, dedicated support, and custom integrations.',
    },
    {
      question: 'How do I get started?',
      answer: 'Click "Get Started" and pay the one-time $10 enrollment fee. You\'ll get immediate full access to all features for 3 months free.',
    },
  ]

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-20 bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Billing FAQ</h2>
          <p className="text-xl text-gray-400">Common questions about pricing and billing</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                <span className="font-semibold text-white">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4">
                  <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
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
          Get Started for Just $10
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          One-time enrollment fee. 3 months free. Then $49/month. Cancel anytime.
        </p>
        <Button asChild size="lg" variant="secondary">
          <Link href="/register">
            Get Started — $10
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
