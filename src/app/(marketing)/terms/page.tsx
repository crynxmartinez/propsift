import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service',
  description: 'PropSift terms of service. Read our user agreement and service terms.',
  openGraph: {
    title: 'Terms of Service | PropSift',
    description: 'PropSift terms of service. Read our user agreement and service terms.',
  },
}

export default function TermsPage() {
  return (
    <div className="bg-white">
      <HeroSection />
      <ContentSection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Terms of Service
        </h1>
        <p className="text-gray-600">
          Last updated: January 8, 2026
        </p>
      </div>
    </section>
  )
}

function ContentSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none">
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <p className="text-blue-800 m-0">
              <strong>Summary:</strong> By using PropSift, you agree to these terms. Use our service responsibly, pay for your subscription, and respect other users. We provide the service "as is" and limit our liability as described below.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Agreement to Terms</h2>
          <p className="text-gray-600 mb-4">
            These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and PropSift ("Company," "we," "us," or "our") governing your access to and use of the PropSift website, applications, and services (collectively, the "Service").
          </p>
          <p className="text-gray-600 mb-4">
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
          <p className="text-gray-600 mb-4">
            PropSift is a customer relationship management (CRM) platform designed for real estate wholesalers. The Service provides tools for:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Managing property leads and owner information</li>
            <li>Tracking outreach and communication attempts</li>
            <li>Organizing leads with tags, motivations, and custom fields</li>
            <li>Visualizing pipelines with kanban boards</li>
            <li>Automating workflows and tasks</li>
            <li>Analyzing data through dashboards and reports</li>
            <li>Collaborating with team members</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Account Registration</h2>
          <p className="text-gray-600 mb-4">
            To use the Service, you must create an account. When registering, you agree to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and promptly update your account information</li>
            <li>Maintain the security of your password and account</li>
            <li>Accept responsibility for all activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
          <p className="text-gray-600 mb-4">
            You must be at least 18 years old to create an account and use the Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Subscription and Payment</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Free Trial</h3>
          <p className="text-gray-600 mb-4">
            We offer a 14-day free trial for new users. No credit card is required to start the trial. At the end of the trial period, you must subscribe to a paid plan to continue using the Service.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Subscription Plans</h3>
          <p className="text-gray-600 mb-4">
            We offer various subscription plans with different features and pricing. Current pricing is available on our <Link href="/pricing" className="text-blue-600 hover:text-blue-700">Pricing page</Link>. We reserve the right to modify pricing with 30 days' notice.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Billing</h3>
          <p className="text-gray-600 mb-4">
            Subscriptions are billed in advance on a monthly or annual basis, depending on your chosen plan. Payment is due at the beginning of each billing cycle. All fees are non-refundable except as expressly stated in these Terms.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.4 Cancellation</h3>
          <p className="text-gray-600 mb-4">
            You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period. You will retain access to the Service until the end of the paid period.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Acceptable Use</h2>
          <p className="text-gray-600 mb-4">
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Violate the rights of others, including privacy and intellectual property rights</li>
            <li>Upload or transmit viruses, malware, or other malicious code</li>
            <li>Attempt to gain unauthorized access to the Service or its systems</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Use the Service to send spam, unsolicited messages, or harass others</li>
            <li>Scrape, crawl, or use automated means to access the Service without permission</li>
            <li>Resell, sublicense, or share your account with unauthorized users</li>
            <li>Use the Service in any way that could damage our reputation or goodwill</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Your Data</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.1 Ownership</h3>
          <p className="text-gray-600 mb-4">
            You retain all rights to the data you upload to the Service ("Your Data"). We do not claim ownership of Your Data.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.2 License</h3>
          <p className="text-gray-600 mb-4">
            By uploading Your Data to the Service, you grant us a limited license to use, store, and process Your Data solely for the purpose of providing the Service to you.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.3 Responsibility</h3>
          <p className="text-gray-600 mb-4">
            You are solely responsible for Your Data, including its accuracy, legality, and compliance with applicable laws. You represent that you have all necessary rights to upload and use Your Data.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.4 Data Export</h3>
          <p className="text-gray-600 mb-4">
            You may export Your Data at any time using the export features provided in the Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
          <p className="text-gray-600 mb-4">
            The Service and its original content, features, and functionality are owned by PropSift and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>
          <p className="text-gray-600 mb-4">
            Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Third-Party Services</h2>
          <p className="text-gray-600 mb-4">
            The Service may integrate with or contain links to third-party websites or services. We are not responsible for the content, privacy policies, or practices of third-party services. Your use of third-party services is at your own risk.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Disclaimer of Warranties</h2>
          <p className="text-gray-600 mb-4">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
          </p>
          <p className="text-gray-600 mb-4">
            We do not warrant that:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>The Service will function uninterrupted, secure, or available at any particular time or location</li>
            <li>Any errors or defects will be corrected</li>
            <li>The Service is free of viruses or other harmful components</li>
            <li>The results of using the Service will meet your requirements</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Limitation of Liability</h2>
          <p className="text-gray-600 mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL PROPSIFT, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Your access to or use of or inability to access or use the Service</li>
            <li>Any conduct or content of any third party on the Service</li>
            <li>Any content obtained from the Service</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
          </ul>
          <p className="text-gray-600 mb-4">
            IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Indemnification</h2>
          <p className="text-gray-600 mb-4">
            You agree to defend, indemnify, and hold harmless PropSift and its officers, directors, employees, and agents from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your use of the Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Termination</h2>
          <p className="text-gray-600 mb-4">
            We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach these Terms.
          </p>
          <p className="text-gray-600 mb-4">
            Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may do so by contacting us or using the account deletion feature in the Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Governing Law</h2>
          <p className="text-gray-600 mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the State of Texas, United States, without regard to its conflict of law provisions.
          </p>
          <p className="text-gray-600 mb-4">
            Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Harris County, Texas.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Dispute Resolution</h2>
          <p className="text-gray-600 mb-4">
            Before filing a claim against PropSift, you agree to try to resolve the dispute informally by contacting us at support@propsift.com. We will try to resolve the dispute informally within 60 days.
          </p>
          <p className="text-gray-600 mb-4">
            If we cannot resolve the dispute informally, you and PropSift agree to resolve any claims through binding arbitration, except that either party may bring claims in small claims court if they qualify.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">15. Changes to Terms</h2>
          <p className="text-gray-600 mb-4">
            We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>
          <p className="text-gray-600 mb-4">
            By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">16. Severability</h2>
          <p className="text-gray-600 mb-4">
            If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">17. Waiver</h2>
          <p className="text-gray-600 mb-4">
            Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. The waiver of any such right or provision will be effective only if in writing and signed by a duly authorized representative of PropSift.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">18. Entire Agreement</h2>
          <p className="text-gray-600 mb-4">
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and PropSift regarding the Service and supersede all prior agreements and understandings.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">19. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about these Terms, please contact us:
          </p>
          <ul className="list-none pl-0 text-gray-600 mb-4 space-y-2">
            <li><strong>Email:</strong> support@propsift.com</li>
            <li><strong>Website:</strong> <Link href="/contact" className="text-blue-600 hover:text-blue-700">Contact Form</Link></li>
          </ul>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              By using PropSift, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
