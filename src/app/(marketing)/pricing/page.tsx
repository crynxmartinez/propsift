'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
  ArrowRight,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PricingPage() {
  return (
    <div className="bg-white">
      <HeroSection />
      <PricingCards />
      <FeatureComparison />
      <FAQSection />
      <CTASection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Simple, Transparent{' '}
          <span className="text-blue-600">Pricing</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Start free for 14 days. No credit card required. Choose the plan that fits your business.
        </p>
      </div>
    </section>
  )
}

function PricingCards() {
  const [annual, setAnnual] = useState(false)

  const plans = [
    {
      name: 'Starter',
      monthlyPrice: 49,
      annualPrice: 39,
      description: 'Perfect for solo wholesalers just getting started.',
      features: [
        { text: 'Up to 1,000 records', included: true },
        { text: 'DockInsight Analytics', included: true },
        { text: '1 Kanban Board', included: true },
        { text: 'Basic Automations (5 max)', included: true },
        { text: 'Email Support', included: true },
        { text: 'CSV Import/Export', included: true },
        { text: 'Custom Fields', included: false },
        { text: 'Team Members', included: false },
        { text: 'Priority Support', included: false },
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Pro',
      monthlyPrice: 99,
      annualPrice: 79,
      description: 'For serious wholesalers scaling their business.',
      features: [
        { text: 'Up to 10,000 records', included: true },
        { text: 'DockInsight Analytics', included: true },
        { text: 'Unlimited Kanban Boards', included: true },
        { text: 'Unlimited Automations', included: true },
        { text: 'Priority Support', included: true },
        { text: 'CSV Import/Export', included: true },
        { text: 'Custom Fields', included: true },
        { text: 'Task Templates', included: true },
        { text: 'Team Members', included: false },
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Team',
      monthlyPrice: 199,
      annualPrice: 159,
      description: 'For teams that need collaboration and control.',
      features: [
        { text: 'Unlimited records', included: true },
        { text: 'DockInsight Analytics', included: true },
        { text: 'Unlimited Kanban Boards', included: true },
        { text: 'Unlimited Automations', included: true },
        { text: 'Dedicated Support', included: true },
        { text: 'CSV Import/Export', included: true },
        { text: 'Custom Fields', included: true },
        { text: 'Task Templates', included: true },
        { text: 'Up to 10 Team Members', included: true },
        { text: 'Role-based Access Control', included: true },
        { text: 'Round-robin Assignment', included: true },
        { text: 'Team Performance Analytics', included: true },
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`font-medium ${!annual ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${annual ? 'left-8' : 'left-1'}`} />
          </button>
          <span className={`font-medium ${annual ? 'text-gray-900' : 'text-gray-500'}`}>
            Annual
            <span className="ml-2 text-xs text-green-600 font-semibold">Save 20%</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 p-8 ${
                plan.popular
                  ? 'border-blue-600 shadow-xl scale-105'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    ${annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>
                {annual && (
                  <p className="text-sm text-green-600">
                    Billed annually (${plan.annualPrice * 12}/year)
                  </p>
                )}
                <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3">
                    {feature.included ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Enterprise
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Need More?</h3>
            <p className="text-gray-600 mb-6">
              For larger teams or custom requirements, contact us for a tailored solution.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Contact Sales
              <ArrowRight className="w-5 h-5" />
            </Link>
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
        { name: 'Property Records', starter: '1,000', pro: '10,000', team: 'Unlimited' },
        { name: 'Owner Information', starter: true, pro: true, team: true },
        { name: 'Outreach Tracking', starter: true, pro: true, team: true },
        { name: 'Tags & Motivations', starter: true, pro: true, team: true },
        { name: 'Custom Fields', starter: false, pro: true, team: true },
        { name: 'Bulk Import/Export', starter: true, pro: true, team: true },
      ],
    },
    {
      name: 'Analytics & Reporting',
      features: [
        { name: 'DockInsight Dashboard', starter: true, pro: true, team: true },
        { name: 'KPI Cards', starter: true, pro: true, team: true },
        { name: 'Charts & Visualizations', starter: true, pro: true, team: true },
        { name: 'Action Cards', starter: true, pro: true, team: true },
        { name: 'Team Performance Analytics', starter: false, pro: false, team: true },
      ],
    },
    {
      name: 'Workflow & Automation',
      features: [
        { name: 'Kanban Boards', starter: '1', pro: 'Unlimited', team: 'Unlimited' },
        { name: 'Automations', starter: '5', pro: 'Unlimited', team: 'Unlimited' },
        { name: 'Task Management', starter: true, pro: true, team: true },
        { name: 'Task Templates', starter: false, pro: true, team: true },
        { name: 'Round-robin Assignment', starter: false, pro: false, team: true },
      ],
    },
    {
      name: 'Team & Collaboration',
      features: [
        { name: 'Team Members', starter: '1', pro: '1', team: '10' },
        { name: 'Role-based Access', starter: false, pro: false, team: true },
        { name: 'Activity Logs', starter: true, pro: true, team: true },
        { name: 'Notifications', starter: true, pro: true, team: true },
      ],
    },
    {
      name: 'Support',
      features: [
        { name: 'Email Support', starter: true, pro: true, team: true },
        { name: 'Priority Support', starter: false, pro: true, team: true },
        { name: 'Dedicated Support', starter: false, pro: false, team: true },
        { name: 'Onboarding Assistance', starter: false, pro: false, team: true },
      ],
    },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Compare Plans</h2>
          <p className="text-xl text-gray-600">See what's included in each plan</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Features</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900">Starter</th>
                <th className="text-center py-4 px-4 font-semibold text-blue-600">Pro</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900">Team</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <>
                  <tr key={category.name} className="bg-gray-100">
                    <td colSpan={4} className="py-3 px-4 font-semibold text-gray-700">
                      {category.name}
                    </td>
                  </tr>
                  {category.features.map((feature) => (
                    <tr key={feature.name} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">{feature.name}</td>
                      <td className="py-3 px-4 text-center">
                        {typeof feature.starter === 'boolean' ? (
                          feature.starter ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-700">{feature.starter}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center bg-blue-50/50">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-700 font-medium">{feature.pro}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {typeof feature.team === 'boolean' ? (
                          feature.team ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-700">{feature.team}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function FAQSection() {
  const faqs = [
    {
      question: 'Can I change plans later?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at the end of your billing cycle.',
    },
    {
      question: 'What happens after my free trial?',
      answer: 'After your 14-day free trial, you\'ll need to choose a plan to continue using PropSift. We\'ll send you a reminder before your trial ends. If you don\'t subscribe, your account will be paused (not deleted) until you choose a plan.',
    },
    {
      question: 'Is there a contract or commitment?',
      answer: 'No long-term contracts. All plans are month-to-month (or annual if you choose). You can cancel anytime and your subscription will end at the end of your billing period.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express, Discover) through our secure payment processor, Stripe.',
    },
    {
      question: 'Can I get a refund?',
      answer: 'We offer a 30-day money-back guarantee for annual plans. For monthly plans, you can cancel anytime but we don\'t offer partial refunds for the current billing period.',
    },
    {
      question: 'What if I need more than 10 team members?',
      answer: 'Contact us for an Enterprise plan! We can accommodate larger teams with custom pricing and additional features like SSO, dedicated support, and custom integrations.',
    },
  ]

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Billing FAQ</h2>
          <p className="text-xl text-gray-600">Common questions about pricing and billing</p>
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
          Start Your Free Trial Today
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          14 days free. No credit card required. Cancel anytime.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Get Started Free
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  )
}
