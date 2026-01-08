import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - PropSift',
  description: 'PropSift Privacy Policy - How we collect, use, and protect your data.',
}

export default function PrivacyPage() {
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
          Privacy Policy
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
              <strong>Summary:</strong> We collect only the data necessary to provide our services. We never sell your personal information. We use industry-standard security to protect your data.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Introduction</h2>
          <p className="text-gray-600 mb-4">
            PropSift ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services (collectively, the "Service").
          </p>
          <p className="text-gray-600 mb-4">
            By using PropSift, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Information You Provide</h3>
          <p className="text-gray-600 mb-4">We collect information you provide directly to us, including:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li><strong>Account Information:</strong> Name, email address, password, company name, phone number, and billing information when you create an account or subscribe to our services.</li>
            <li><strong>Profile Information:</strong> Any additional information you add to your profile, such as timezone preferences.</li>
            <li><strong>Property Data:</strong> Property addresses, owner information, and related data you input into the system for lead management purposes.</li>
            <li><strong>Communications:</strong> Information you provide when you contact us for support, feedback, or other inquiries.</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Information Collected Automatically</h3>
          <p className="text-gray-600 mb-4">When you use our Service, we automatically collect certain information, including:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li><strong>Usage Data:</strong> Information about how you use the Service, including features accessed, pages viewed, and actions taken.</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device type, and IP address.</li>
            <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to track activity on our Service and hold certain information.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-600 mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Provide, maintain, and improve our Service</li>
            <li>Process transactions and send related information</li>
            <li>Send you technical notices, updates, security alerts, and support messages</li>
            <li>Respond to your comments, questions, and customer service requests</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our Service</li>
            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
            <li>Personalize and improve your experience</li>
            <li>Send promotional communications (with your consent)</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Information Sharing and Disclosure</h2>
          <p className="text-gray-600 mb-4">We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li><strong>Service Providers:</strong> We may share information with third-party vendors who perform services on our behalf, such as payment processing, data analysis, email delivery, hosting services, and customer service.</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required to do so by law or in response to valid requests by public authorities.</li>
            <li><strong>Business Transfers:</strong> If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
            <li><strong>With Your Consent:</strong> We may share information with your consent or at your direction.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Data Security</h2>
          <p className="text-gray-600 mb-4">
            We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Encryption of data in transit using TLS/SSL</li>
            <li>Encryption of sensitive data at rest</li>
            <li>Regular security assessments and updates</li>
            <li>Access controls and authentication requirements</li>
            <li>Secure data centers with physical security measures</li>
          </ul>
          <p className="text-gray-600 mb-4">
            However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
          <p className="text-gray-600 mb-4">
            We retain your personal information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
          </p>
          <p className="text-gray-600 mb-4">
            If you wish to delete your account, please contact us at support@propsift.com. We will delete your personal information within 30 days of your request, except for information we are required to retain for legal or legitimate business purposes.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Cookies and Tracking Technologies</h2>
          <p className="text-gray-600 mb-4">We use cookies and similar tracking technologies to:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Keep you logged in to your account</li>
            <li>Remember your preferences and settings</li>
            <li>Understand how you use our Service</li>
            <li>Improve our Service based on usage patterns</li>
          </ul>
          <p className="text-gray-600 mb-4">
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Your Rights and Choices</h2>
          <p className="text-gray-600 mb-4">Depending on your location, you may have certain rights regarding your personal information:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li><strong>Access:</strong> You can request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> You can request that we correct inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> You can request that we delete your personal information.</li>
            <li><strong>Portability:</strong> You can request a copy of your data in a machine-readable format.</li>
            <li><strong>Opt-out:</strong> You can opt out of promotional communications at any time.</li>
          </ul>
          <p className="text-gray-600 mb-4">
            To exercise any of these rights, please contact us at support@propsift.com.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. California Privacy Rights</h2>
          <p className="text-gray-600 mb-4">
            If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>The right to know what personal information we collect, use, and disclose</li>
            <li>The right to request deletion of your personal information</li>
            <li>The right to opt-out of the sale of personal information (we do not sell personal information)</li>
            <li>The right to non-discrimination for exercising your privacy rights</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Children's Privacy</h2>
          <p className="text-gray-600 mb-4">
            Our Service is not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can delete such information.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. International Data Transfers</h2>
          <p className="text-gray-600 mb-4">
            Your information may be transferred to and maintained on servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our Service, you consent to such transfers.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Third-Party Links</h2>
          <p className="text-gray-600 mb-4">
            Our Service may contain links to third-party websites or services that are not owned or controlled by PropSift. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Changes to This Privacy Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul className="list-none pl-0 text-gray-600 mb-4 space-y-2">
            <li><strong>Email:</strong> support@propsift.com</li>
            <li><strong>Website:</strong> <Link href="/contact" className="text-blue-600 hover:text-blue-700">Contact Form</Link></li>
          </ul>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              By using PropSift, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
