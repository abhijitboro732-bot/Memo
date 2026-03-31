import React from 'react';

export const metadata = {
  title: 'Privacy Policy | Voxo',
  description: 'Privacy Policy for Voxo',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-8 font-display">Privacy Policy</h1>
      
      <div className="space-y-8 text-text-secondary">
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us when you create an account, update your profile, use our interactive features, or communicate with us.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Information:</strong> Your username, email address, password, and profile picture.</li>
            <li><strong>Content:</strong> Videos, images, comments, and other content you upload or share on our platform.</li>
            <li><strong>Communications:</strong> Messages and interactions between you and other users.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to provide, maintain, and improve our services, including to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Create and manage your account.</li>
            <li>Enable you to share content and interact with others.</li>
            <li>Personalize your experience and content feed.</li>
            <li>Monitor and analyze trends, usage, and activities.</li>
            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">3. Sharing of Information</h2>
          <p className="mb-4">
            We may share personal information about you as follows:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>With other users:</strong> When you share content or interact on the platform.</li>
            <li><strong>Service Providers:</strong> With vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.</li>
            <li><strong>Legal Requirements:</strong> In response to a request for information if we believe disclosure is in accordance with any applicable law, regulation, or legal process.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">4. Security</h2>
          <p>
            We take reasonable measures to help protect personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at support@voxo.com.
          </p>
        </section>

        <div className="pt-8 border-t border-glass-border">
          <p className="text-sm">Last Updated: March 2024</p>
        </div>
      </div>
    </div>
  );
}
