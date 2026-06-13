export type LegalSection = {
  title: string;
  body?: string;
  items?: string[];
};

export type FaqSection = {
  title: string;
  items: {
    question: string;
    answer: string[];
  }[];
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. Acceptance of Terms',
    body: 'By using Plz, you agree to comply with these Terms and all applicable laws and regulations.',
  },
  {
    title: '2. Eligibility',
    body: 'By using Plz, you represent and warrant that you are at least 18 years old and capable of forming a binding legal contract.',
  },
  {
    title: '3. User Accounts and Registration',
    items: [
      'Single Account: You may register for one unified account that allows you to both give and ask. You may not maintain multiple accounts.',
      'Accuracy: You agree to provide accurate, current and complete information during registration and keep it updated.',
      'Security: You are responsible for safeguarding your password and for all activities that occur under your account.',
    ],
  },
  {
    title: '4. Request Rules',
    body: 'All requests ("Begs") must comply with the following rules:',
    items: [
      'Requests are text-only, 40 words max. No videos, images, or external links are permitted.',
      'Requests are subject to a hard cap of ₦100,000.',
      'Requests remain visible on the platform until fully funded or until you ask for a payout.',
      'You may only have one active request at a time.',
      'After a request is completed or expires, you are subject to a cooldown period, typically 48 hours, before creating a new request.',
      'Your maximum request amount is determined by your user tier: Newcomer, Verified, or Trusted.',
      'You may request an early payout of the funds raised before the time limit expires.',
      'You may not create requests that are fraudulent, deceptive, illegal, or that violate the rights of others.',
    ],
  },
  {
    title: '5. Fees and Payments',
    items: [
      'Plz charges a 7% platform fee on all successful requests. A 7.5% VAT is applied to the platform fee, making the total fee deducted 7.525%.',
      'There is no fee for Donors to give money.',
      'All payments are processed by third-party payment gateways. By making a donation, you agree to the terms of those gateways.',
      'All donations are final and non-refundable. In cases of proven fraud, Plz will work with law enforcement and may, at its sole discretion, attempt to recover funds.',
    ],
  },
  {
    title: '6. Donations',
    items: [
      'By donating, you understand that you are gifting money to the Requester and are not purchasing goods or services.',
      'You may choose to display your donation publicly or anonymously.',
      'Plz works to maintain a trusted community, but does not guarantee that a Requester will use the funds for their stated purpose.',
    ],
  },
  {
    title: '7. Trust and Conduct',
    items: [
      'Users are placed into tiers based on their activity and compliance. This system is dynamic and determined by Plz at its sole discretion.',
      'You agree not to use the Platform to solicit for illegal purposes, harass or harm another user, impersonate anyone, or manipulate the trust system.',
      'Violation may result in suspension or permanent ban.',
    ],
  },
  {
    title: '8. Moderation and Termination',
    body: 'Plz reserves the right to monitor, moderate, and remove content or requests that violate these Terms or are otherwise harmful. We may suspend or terminate access at any time, with or without notice, including pausing payouts to accounts flagged for suspicious activity pending investigation.',
  },
  {
    title: '9. Intellectual Property',
    body: 'The Plz name, logo, related names, product and service names, designs, and slogans are trademarks of Axonvault Innovations Ltd or its affiliates. You must not use such marks without prior written permission.',
  },
  {
    title: '10. Disclaimer of Warranties',
    body: 'The Platform is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, Plz disclaims all warranties, whether express or implied, including warranties of merchantability, fitness for a particular purpose, title, and non-infringement.',
  },
  {
    title: '11. Limitation of Liability',
    body: 'To the maximum extent permitted by law, Plz, its affiliates, directors, employees, or agents shall not be liable for indirect, punitive, incidental, special, consequential, or exemplary damages arising out of or relating to use of the Platform.',
  },
  {
    title: '12. Governing Law',
    body: 'These Terms are governed by and construed in accordance with the laws of Nigeria, without regard to conflict of law provisions.',
  },
  {
    title: '13. Changes to Terms',
    body: 'We may revise these Terms from time to time. By continuing to access or use the Platform after revisions become effective, you agree to be bound by the revised terms.',
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: 'Effective Date',
    body: 'March 23, 2026',
  },
  {
    title: 'Overview',
    body: 'Plz respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform in Nigeria or internationally.',
  },
  {
    title: '1. Who We Are',
    body: 'Plz is a peer-to-peer financial support platform operated by Axonvault Innovations. We connect individuals who request small financial assistance with those willing to give support. Contact: axonvault@gmail.com. Website: www.axonvault.cc.',
  },
  {
    title: '2. Information We Collect',
    items: [
      'Account information: full name, email address, phone number, encrypted password, and user tier.',
      'Request information: text-only request content, requested amount, and request history.',
      'Payment information: transaction amounts, payment status, and gateway references. Plz does not store raw debit or credit card details.',
      'Device information: user agent, browser type, operating system, device type, session status, and refresh token.',
      'Location information: IP address, country, and city where available.',
      'Usage and activity data: login timestamps, session duration, last active time, account activity logs, and reports filed or received.',
    ],
  },
  {
    title: '3. How We Use Your Information',
    items: [
      'Account management.',
      'Payment processing and platform fee deduction.',
      'Fraud detection and prevention.',
      'Tier system management.',
      'Compliance with legal obligations.',
      'Platform improvement.',
    ],
  },
  {
    title: '4. International Users',
    body: 'Plz is accessible globally. Your information may be processed in jurisdictions where data protection laws may differ from those in your country. In the interim, Plz receives and pays money only in Naira, regardless of location.',
  },
  {
    title: '5. Data Sharing',
    items: [
      'Payment providers, to process donations and payouts.',
      'Service providers, including hosting, analytics, and fraud detection tools.',
      'Legal authorities, when required by law or in cases of fraud investigation.',
      'We do not sell personal data.',
    ],
  },
  {
    title: '6. Data Retention',
    body: 'We retain information as long as necessary for account operation, fraud monitoring, legal compliance, and dispute resolution. Anonymized data may be retained for analytics.',
  },
  {
    title: '7. Security Measures',
    items: [
      'Encrypted passwords.',
      'Secure authentication tokens.',
      'Monitoring suspicious activity.',
      'No system guarantees 100% security.',
    ],
  },
  {
    title: '8. Your Rights',
    items: ['Access your data.', 'Request correction.', 'Request deletion.', 'Object to processing where applicable.'],
  },
  {
    title: '9. Cookies and Tracking',
    body: 'Plz may use session cookies, authentication tokens, and security cookies for login persistence, fraud detection, and session management. We do not use cookies for behavioral advertising.',
  },
  {
    title: '10. Children’s Privacy',
    body: 'Plz is not intended for individuals under 18 years old.',
  },
  {
    title: '11. Account Deletion',
    body: 'You may request account deletion by contacting support. We may retain transaction records, fraud-related logs, and legal compliance data where required.',
  },
  {
    title: '12. Fraud Monitoring and System',
    body: 'Plz uses automated and manual systems to assign user tiers, detect suspicious activity, monitor device and IP consistency, and enforce cooldown periods. Suspension or termination decisions are made at Plz’s discretion.',
  },
  {
    title: '13. Changes to Policy',
    body: 'We may update this Privacy Policy periodically. Continued use of the Platform after updates constitutes acceptance.',
  },
];

export const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'About Plz',
    items: [
      {
        question: 'What is Plz?',
        answer: [
          'Plz is a peer-to-peer micro-support platform where individuals can request small amounts of financial help and others can give securely and respectfully.',
        ],
      },
      {
        question: 'Is Plz a charity?',
        answer: [
          'No. Plz is a technology platform that facilitates peer-to-peer assistance. We are not a registered charity.',
        ],
      },
      {
        question: 'Who can use Plz?',
        answer: ['Anyone who creates an account and complies with our community rules can request or give support.'],
      },
      {
        question: 'What is the core idea of Plz?',
        answer: [
          'To prove that strangers can give small amounts of money to other strangers safely, repeatedly, and without awkwardness.',
        ],
      },
    ],
  },
  {
    title: 'For Requesters',
    items: [
      {
        question: 'How do I create a request?',
        answer: [
          'Create a request by telling your short story, selecting a category, and setting the amount you need.',
          'All requests have a hard cap of ₦100,000 and a time limit, usually 24 to 72 hours.',
        ],
      },
      {
        question: 'What are the rules for creating a request?',
        answer: [
          'You can only have one active request at a time.',
          'You must wait for a cooldown period, usually 48 hours, after a request ends before starting a new one.',
          'Newcomer request limits start at ₦10,000 and increase as you build a positive history.',
        ],
      },
      {
        question: 'What happens when my request is fully funded?',
        answer: [
          'You will receive a notification. The funds, minus the platform fee, will be processed and sent to you. You may also send a thank-you message to donors.',
        ],
      },
      {
        question: 'Can I end a request early?',
        answer: [
          'Yes. If you need the funds before the time limit is up, you can request a payout early and receive the amount raised so far.',
        ],
      },
      {
        question: 'How do I get my limits increased?',
        answer: [
          'Limits increase automatically based on trust. Successful requests, donations, verification, and no misuse flags help you graduate from Newcomer to Verified and Trusted.',
        ],
      },
      {
        question: 'Why can’t I upload photos or videos with my request?',
        answer: [
          'For launch, Plz uses text-only requests to reduce fraud and keep the platform simple and safe.',
        ],
      },
    ],
  },
  {
    title: 'For People Giving',
    items: [
      {
        question: 'How do I donate?',
        answer: [
          'Browse active requests, choose one you want to support, then pick a quick amount or enter a custom amount.',
          'You can donate anonymously or publicly.',
        ],
      },
      {
        question: 'What payment methods do you accept?',
        answer: ['We accept card payments through our secure gateway and instant bank transfers or USSD for now.'],
      },
      {
        question: 'Is it safe to donate?',
        answer: [
          'Yes. We use trusted payment gateways to process transactions securely. Financial details are encrypted and tokenized for safety.',
        ],
      },
      {
        question: 'How do I know my donation helped?',
        answer: [
          'You will receive a donation confirmation. You may also receive thank-you messages, funded-request notifications, and private impact feedback.',
        ],
      },
      {
        question: 'Do you take a cut of my donation?',
        answer: [
          'Plz charges a 7% platform fee to the recipient on successful requests. The fee is deducted from the total raised before payout.',
        ],
      },
    ],
  },
  {
    title: 'Trust & Safety',
    items: [
      {
        question: 'How do you prevent fraud?',
        answer: [
          'We use strict newcomer limits, cooldowns, manual moderation, request reporting, and identity verification to protect the community.',
        ],
      },
      {
        question: 'Why do users have different limits?',
        answer: [
          'Limits are based on history with Plz, from Newcomer to Verified to Trusted. The system is designed to feel fair and safe, not like a visible score.',
        ],
      },
      {
        question: 'What if I see an inappropriate request?',
        answer: [
          'Use the report option from the request page or Help Center. The admin team reviews reports and takes appropriate action.',
        ],
      },
    ],
  },
];
