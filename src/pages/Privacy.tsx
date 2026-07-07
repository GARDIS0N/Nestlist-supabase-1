import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Mail, Phone, ExternalLink, Calendar, CheckCircle2, AlertTriangle, ArrowUp } from "lucide-react";

export const Privacy: React.FC = () => {
  useEffect(() => {
    // 1. Update document Title
    document.title = "Privacy Policy — NestList Kenya";

    // 2. Set Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      "Learn how NestList collects, uses and protects your personal information. Nestlist Rental Platforms Limited complies with Kenya's Data Protection Act 2019."
    );

    // 3. Set Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://nestlist-supabase.vercel.app/privacy");
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sections = [
    { id: "introduction", num: 1, title: "Introduction" },
    { id: "info-we-collect", num: 2, title: "Information We Collect" },
    { id: "how-we-use", num: 3, title: "How We Use Your Information" },
    { id: "info-sharing", num: 4, title: "Information Sharing" },
    { id: "mpesa-payments", num: 5, title: "M-Pesa and Payment Data" },
    { id: "storage-security", num: 6, title: "Data Storage and Security" },
    { id: "your-rights", num: 7, title: "Your Rights" },
    { id: "cookies-tracking", num: 8, title: "Cookies and Tracking" },
    { id: "childrens-privacy", num: 9, title: "Children's Privacy" },
    { id: "policy-changes", num: 10, title: "Changes to This Policy" },
    { id: "contact-us", num: 11, title: "Contact Us" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-stone-700 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Dark Green Gradient Top Banner */}
      <div 
        className="relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 text-center text-white"
        style={{ background: "linear-gradient(135deg, #0A4D2E, #1E6B4A)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-md shadow-inner">
            <span className="text-3xl" role="img" aria-label="shield">🔒</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-emerald-100 font-medium text-lg sm:text-xl max-w-xl">
            Nestlist Rental Platforms Limited
          </p>
          <div className="mt-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-emerald-100/80 font-mono">
            <span>Effective: July 5, 2026</span>
            <span className="hidden sm:inline text-emerald-100/40">•</span>
            <span>Last Updated: July 5, 2026</span>
          </div>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          
          {/* Table of Contents - Sticky Left Column */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 bg-stone-50 rounded-2xl border border-stone-200/80 p-6 shadow-sm">
              <h3 className="font-serif text-lg text-stone-900 mb-4 pb-2 border-b border-stone-200 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <span>Table of Contents</span>
              </h3>
              <nav className="space-y-1.5">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="group flex items-start gap-2.5 py-1 text-[13px] text-stone-600 hover:text-emerald-800 transition font-medium"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600 group-hover:scale-125 transition shrink-0" />
                    <span>{sec.num}. {sec.title}</span>
                  </a>
                ))}
              </nav>
              <button
                onClick={handleScrollToTop}
                className="mt-6 w-full flex items-center justify-center gap-2 py-2 px-4 border border-stone-200 hover:border-emerald-700 bg-white hover:bg-emerald-50 text-xs font-semibold text-stone-600 hover:text-emerald-800 rounded-lg shadow-xs transition"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>Back to top</span>
              </button>
            </div>
          </aside>

          {/* Table of Contents - Mobile Quick Selector */}
          <div className="lg:hidden mb-10 bg-stone-50 rounded-xl border border-stone-200 p-5">
            <h3 className="font-serif text-base text-stone-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Quick Navigation</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="flex items-center gap-2 py-1 text-stone-600 hover:text-emerald-800 font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span>{sec.num}. {sec.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Policy Document Details - Right Column */}
          <main className="lg:col-span-8 max-w-[800px] mx-auto text-stone-700 leading-relaxed text-sm sm:text-[15px] space-y-12">
            
            {/* Highlight: Kenya Data Protection Act Compliance */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-stone-900 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-950 text-sm tracking-tight mb-1">
                    Kenya Data Protection Act, 2019 Notice
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
                    This Privacy Policy is designed to comply with <strong>Kenya's Data Protection Act 2019</strong>. We respect your rights as a data subject and guarantee full transparency in how we verify, process, and protect your listings, payments, and rental inquiries on NestList.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 1 - INTRODUCTION */}
            <section id="introduction" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  1
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Introduction
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-4">
                <p>
                  Karibu to NestList! NestList is Kenya's trusted digital property listing platform, operated by <strong>Nestlist Rental Platforms Limited</strong> (Business Registration: <strong>BN-P7SEPZD3</strong>). We connect landlords, property agents, caretakers, and property seekers (tenants) across Nairobi, Kiambu, Machakos, Nakuru, Kisumu, Mombasa, and beyond.
                </p>
                <p>
                  Your privacy is incredibly important to us. This policy outlines exactly how we collect, handle, verify, store, and protect your personal information on our website (<a href="https://nestlist-supabase.vercel.app" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline hover:text-emerald-800">https://nestlist-supabase.vercel.app</a>) and all related services. We have written this in straightforward, plain English so that landlords and tenants can understand exactly what happens to their information.
                </p>
                <p>
                  Under the <strong>Kenya Data Protection Act 2019</strong>, <strong>Nestlist Rental Platforms Limited</strong> acts as the Data Controller. We are fully committed to keeping your information safe and respecting your rights throughout your property journey.
                </p>
              </div>
            </section>

            {/* SECTION 2 - INFORMATION WE COLLECT */}
            <section id="info-we-collect" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  2
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Information We Collect
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-6">
                <p>
                  To provide our rental and property services, we need to collect different pieces of information depending on your role on the platform.
                </p>

                <div>
                  <h3 className="font-serif text-lg text-stone-900 mb-2">2.1 Information You Give Us Directly</h3>
                  <ul className="space-y-4">
                    <li className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                      <strong className="text-stone-950 block mb-1">Account Registration:</strong>
                      <div className="text-sm space-y-1.5 text-stone-700">
                        <p>• <strong>Full Name:</strong> To personalize your account and represent your identity to landlords or tenants.</p>
                        <p>• <strong>Email Address:</strong> Used for secure login, critical alerts, and platform notifications.</p>
                        <p>• <strong>Phone Number (+254 format):</strong> Crucial for SMS alerts, manual payment receipts, and landlord-tenant communication.</p>
                        <p>• <strong>Password:</strong> Hashed securely, meaning it is mathematically scrambled and completely unreadable by NestList employees or third parties.</p>
                        <p>• <strong>Role Selection:</strong> Whether you register as a Landlord, Caretaker, Agent, or Tenant, which helps us customize the menus, features, and dashboards you see.</p>
                      </div>
                    </li>

                    <li className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                      <strong className="text-stone-950 block mb-1">Property Listings (Landlords and Agents):</strong>
                      <div className="text-sm space-y-1.5 text-stone-700">
                        <p>• Property title, detailed description, and price in Kenyan Shillings (KES).</p>
                        <p>• Geographical location, including county, constituency, estate, or area name.</p>
                        <p>• Property category (e.g. bedsitter, single room, bedsitter, studio, 1-bedroom, executive homes).</p>
                        <p>• Available amenities (e.g. Borehole water, 24/7 security, WiFi, parking, balconies).</p>
                        <p>• Property photos uploaded by you, stored securely on our cloud storage buckets.</p>
                      </div>
                    </li>

                    <li className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                      <strong className="text-stone-950 block mb-1">Payment Information:</strong>
                      <div className="text-sm space-y-1.5 text-stone-700">
                        <p>• M-Pesa receipt verification code (e.g. QBG582Y78X).</p>
                        <p>• Mobile number used to perform the transaction.</p>
                        <p>• Amount paid in KES for the listing activation fee.</p>
                        <p className="mt-2 text-xs text-[#92400E] font-medium bg-[#FEF3C7] p-2 rounded-lg border border-[#FDE68A]">
                          ⚠️ NOTE: We do NOT store your M-Pesa PIN, nor do we have any access to your private M-Pesa balance. We only check the specific receipt code you share with us.
                        </p>
                      </div>
                    </li>

                    <li className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                      <strong className="text-stone-950 block mb-1">Inquiry Information:</strong>
                      <div className="text-sm space-y-1.5 text-stone-700">
                        <p>• Your name, email address, and phone number when you fill out an inquiry form to contact a landlord.</p>
                        <p>• The typed text of your message expressing interest in a property listing.</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-serif text-lg text-stone-900 mb-2">2.2 Information Collected Automatically</h3>
                  <p>
                    When you use NestList, we collect basic technical data automatically. This includes:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-stone-600">
                    <li>The type of web browser and device (Android, iPhone, tablet, or desktop) you use.</li>
                    <li>Your IP address and approximate location.</li>
                    <li>The specific pages you visit on NestList and the date and time of your interactions.</li>
                    <li>The referring link or search engine that directed you to our website.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-serif text-lg text-stone-900 mb-2">2.3 Information We Do NOT Collect</h3>
                  <p>
                    To stay compliant with the data minimization principles of Kenya's regulations, we explicitly avoid collecting:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-stone-600">
                    <li>Your personal M-Pesa PIN or password.</li>
                    <li>Your National Identity Card (ID) number (unless strictly required for manual KYC verification).</li>
                    <li>Your bank account details or credit card PINs.</li>
                    <li>Continuous location tracking when you are not using our platform.</li>
                    <li>Access to your mobile contacts or photos outside of those you choose to upload.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* SECTION 3 - HOW WE USE YOUR INFORMATION */}
            <section id="how-we-use" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  3
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  How We Use Your Information
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-4">
                <p>
                  We process your data to keep the platform reliable, secure, and helpful. Specifically, we use it for:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200/50">
                    <h4 className="font-bold text-stone-950 text-sm mb-1">Account Management</h4>
                    <p className="text-xs text-stone-600">
                      Creating and maintaining your NestList account, securely authenticating your login credentials, and personalizing your role experience.
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200/50">
                    <h4 className="font-bold text-stone-950 text-sm mb-1">Property Listings</h4>
                    <p className="text-xs text-stone-600">
                      Displaying your listed properties to tenants, tracking payment statuses, and notifying you automatically of any upcoming listing expirations.
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200/50">
                    <h4 className="font-bold text-stone-950 text-sm mb-1">Critical SMS Alerts</h4>
                    <p className="text-xs text-stone-600">
                      Sending automated text alerts for active inquiry notifications, payment verifications, and listing expiry warnings (e.g. 3 days before removal).
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200/50">
                    <h4 className="font-bold text-stone-950 text-sm mb-1">Platform Integrity</h4>
                    <p className="text-xs text-stone-600">
                      Checking submitted payment codes for duplicates, verifying that listings are authentic, and ensuring bad actors cannot list fraudulent apartments.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4 - INFORMATION SHARING */}
            <section id="info-sharing" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  4
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Information Sharing
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-4">
                <p>
                  We do not sell, rent, or trade your personal information. To deliver our services, we only share data with verified, trusted infrastructure providers:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-700 mt-0.5 font-bold">✓</span>
                    <div>
                      <strong>Africa's Talking (SMS API Provider):</strong> We share your registered phone number and message text solely to deliver instant alerts. Based in Nairobi, Kenya, Africa's Talking complies strictly with local data privacy laws. 
                      <a href="https://africastalking.com/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 ml-1.5 hover:underline">
                        Policy <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-700 mt-0.5 font-bold">✓</span>
                    <div>
                      <strong>Supabase (Cloud Database and Auth):</strong> Our primary database and storage provider. All database backups, tenant metadata, property listings, and photos are encrypted securely.
                      <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 ml-1.5 hover:underline">
                        Policy <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-700 mt-0.5 font-bold">✓</span>
                    <div>
                      <strong>Vercel (Website Hosting):</strong> Host of our web application. Vercel automatically routes and caches assets globally while complying with modern transport encryption rules.
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 ml-1.5 hover:underline">
                        Policy <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-4">
                  <h4 className="font-semibold text-stone-900 text-sm mb-1">What we NEVER share:</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    We will never share your details with advertisers, commercial third-parties, or other landlords outside of listing inquiries. We do not share information with Kenyan authorities unless presented with a formal court order or explicit legal mandate.
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 5 - M-PESA AND PAYMENT DATA */}
            <section id="mpesa-payments" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  5
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  M-Pesa and Payment Data
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-4">
                <p>
                  As an authentic Kenyan platform, NestList accepts manual mobile payment verification.
                </p>

                <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 space-y-3">
                  <h3 className="font-serif text-stone-950 font-normal">How Payments Work:</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-stone-700">
                    <li>Landlord sends the appropriate listing fee via M-Pesa to our designated account number.</li>
                    <li>Safaricom issues a confirmation SMS with a 10-character reference code (e.g., <strong>QBG582Y78X</strong>).</li>
                    <li>The Landlord copies and submits this code on our listing creation portal.</li>
                    <li>Our administrative team checks and approves the transaction internally. Once confirmed, the property immediately goes live.</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100">
                    <strong className="text-emerald-950 block text-xs uppercase tracking-wider mb-1">We Store:</strong>
                    <ul className="text-xs text-stone-700 space-y-1">
                      <li>• Receipt reference code</li>
                      <li>• Transacting phone number</li>
                      <li>• Total paid in KES</li>
                      <li>• Transaction date and time</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-100">
                    <strong className="text-rose-950 block text-xs uppercase tracking-wider mb-1">We NEVER Store:</strong>
                    <ul className="text-xs text-stone-700 space-y-1">
                      <li>• Your M-Pesa PIN</li>
                      <li>• Your mobile wallet balance</li>
                      <li>• Your other unrelated payments</li>
                      <li>• Bank account credentials</li>
                    </ul>
                  </div>
                </div>

                {/* Highlight Notice */}
                <div className="bg-emerald-50 border-l-4 border-emerald-700 rounded-r-xl p-4 my-2 text-emerald-950">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-emerald-800 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm font-medium">
                      <strong>Scam Warning:</strong> NestList will never, under any circumstances, call or email you to request your M-Pesa PIN. If someone claiming to represent NestList asks for your PIN, please hang up immediately and report them to us at <a href="mailto:gardisonkirui11@gmail.com" className="underline font-bold">gardisonkirui11@gmail.com</a>.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-stone-500 font-mono">
                  * Payment metadata records are archived for 7 years to meet auditing and statutory financial guidelines in Kenya.
                </p>
              </div>
            </section>

            {/* SECTION 6 - DATA STORAGE AND SECURITY */}
            <section id="storage-security" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  6
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Data Storage and Security
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-4">
                <p>
                  We keep all active account data secured in PostgreSQL relational databases on Supabase servers.
                </p>

                <div className="bg-stone-50 p-5 rounded-xl border border-stone-200 space-y-3">
                  <h4 className="font-bold text-stone-950 text-sm">Security Measures Implemented:</h4>
                  <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-stone-650">
                    <li><strong>Encrypted Transport:</strong> All data moving between your device and our servers is encrypted using HTTPS / TLS.</li>
                    <li><strong>Cryptographic Salting:</strong> Passwords are hashed using modern cryptographic bcrypt algorithms, meaning nobody (not even our lead programmers) can read your actual password.</li>
                    <li><strong>Row-Level Security (RLS):</strong> Our database prevents unauthorized cross-tenant queries. A tenant can never view or modify a landlord's private listing drafts.</li>
                    <li><strong>Regular Auditing:</strong> Admin privileges are strictly restricted to verified staff only.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-serif text-lg text-stone-900 mb-1">Data Retention Limits</h3>
                  <p className="text-sm">
                    We do not store information longer than necessary. Our general retention limits are:
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-stone-600 font-mono">
                    <li>Active Profiles: Retained for the duration of your membership.</li>
                    <li>Expired Listings: Automatically archived after 2 years.</li>
                    <li>Payment Auditing Records: Kept for 7 years (Statutory).</li>
                    <li>SMS Notification Logs: Pruned after 1 year.</li>
                    <li>Deleted Accounts: Fully purged within 30 days of request.</li>
                  </ul>
                </div>

                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-xs text-rose-950">
                  <strong>Breach Protocol:</strong> In the rare event of a malicious system compromise, we will notify affected individuals within 72 hours and report details to the <strong>Office of the Data Protection Commissioner (ODPC) in Kenya</strong>.
                </div>
              </div>
            </section>

            {/* SECTION 7 - YOUR RIGHTS */}
            <section id="your-rights" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  7
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Your Rights
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-4">
                <p>
                  Under Section 26 of <strong>Kenya's Data Protection Act, 2019</strong>, you possess the following critical rights:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <strong className="text-stone-950 block mb-1">1. Right to Access:</strong>
                    You can ask us for a complete copy of all your private details held on our platform.
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <strong className="text-stone-950 block mb-1">2. Right to Correction:</strong>
                    You can update incorrect profile names, emails, phone numbers, or listing prices inside your dashboard anytime.
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <strong className="text-stone-950 block mb-1">3. Right to Deletion:</strong>
                    You can request complete account removal. We will delete or anonymize your listings within 30 days.
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <strong className="text-stone-950 block mb-1">4. Right to Object:</strong>
                    You can ask us to stop sending you promotional texts, alerts, or marketing emails.
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-stone-950">
                  <p className="font-bold text-emerald-950 mb-1">How to exercise your rights:</p>
                  <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
                    Simply write to us at <a href="mailto:gardisonkirui11@gmail.com" className="underline font-bold text-emerald-850">gardisonkirui11@gmail.com</a> or reach out on our support phone: <a href="tel:+254715185037" className="underline font-bold text-emerald-850">+254715185037</a>. We will verify your identity first to protect your account and respond to your request within <strong>14 days</strong>.
                  </p>
                </div>

                <p className="text-xs text-stone-600">
                  If you feel we have not handled your privacy request adequately, you can raise an official complaint with the Kenyan regulator:
                  <br />
                  <strong>Office of the Data Protection Commissioner (ODPC) Kenya</strong>
                  <br />
                  Website: <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">odpc.go.ke</a> | Email: <a href="mailto:info@odpc.go.ke" className="text-emerald-700 underline">info@odpc.go.ke</a>
                </p>
              </div>
            </section>

            {/* SECTION 8 - COOKIES AND TRACKING */}
            <section id="cookies-tracking" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  8
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Cookies and Tracking
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-4">
                <p>
                  NestList uses browser cookies and local storage tokens to ensure your interface remains fast, modern, and easy to use.
                </p>

                <div className="space-y-3">
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-150">
                    <strong className="text-stone-950 text-sm block mb-1">Essential Authentication Cookie:</strong>
                    <p className="text-xs text-stone-600">
                      We store a temporary login token on your browser to keep you logged in between visits. This cookie is critical for account security and cannot be disabled.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-150">
                    <strong className="text-stone-950 text-sm block mb-1">Functional Preferences & Caching:</strong>
                    <p className="text-xs text-stone-600">
                      We utilize local storage keys to remember your filter selections (such as preferred countys or rental price thresholds) so you don't have to retype them every time.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-stone-600">
                  <strong>No Tracking Abuse:</strong> We do NOT employ intrusive third-party cookies, behavioral trackers, or cross-site advertisement scripts. We don't share your search patterns with Google, Meta, or external brokers.
                </p>
              </div>
            </section>

            {/* SECTION 9 - CHILDREN'S PRIVACY */}
            <section id="childrens-privacy" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  9
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Children's Privacy
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-3">
                <p>
                  NestList is strictly intended for adult users who are <strong>18 years of age and above</strong> (the legal age to sign tenancy agreements or own property in Kenya). We do not intentionally collect, store, or solicit data from minors under 18 years.
                </p>
                <p>
                  If you discover that a child has created an unauthorized profile on our website, please notify us immediately at <a href="mailto:gardisonkirui11@gmail.com" className="text-emerald-700 underline font-medium">gardisonkirui11@gmail.com</a>. We will immediately delete their information from our systems.
                </p>
              </div>
            </section>

            {/* SECTION 10 - CHANGES TO THIS POLICY */}
            <section id="policy-changes" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  10
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Changes to This Policy
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-3">
                <p>
                  We may occasionally update this Privacy Policy to match new legal guidelines or technical upgrades on NestList.
                </p>
                <p>
                  Whenever we make significant changes to this policy, we will:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-stone-600">
                  <li>Change the "Last Updated" date at the top of this page.</li>
                  <li>Email or SMS a notification to our active registered landlords and tenants.</li>
                  <li>Display a highly visible alert banner on our main website homepage.</li>
                </ul>
                <p className="text-stone-600 text-sm">
                  By continuing to log in or post property listings after we publish these changes, you accept the updated practices.
                </p>
              </div>
            </section>

            {/* SECTION 11 - CONTACT US */}
            <section id="contact-us" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-mono text-sm font-bold shrink-0">
                  11
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
                  Contact Us
                </h2>
              </div>
              <div className="pl-5 border-l-4 border-emerald-700 space-y-4">
                <p>
                  If you have any questions, clarifications, or complaints regarding this Privacy Policy or would like to exercise your data subject rights, please don't hesitate to reach out to us:
                </p>

                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2">
                    <p className="font-bold text-stone-950 font-serif">Corporate Address</p>
                    <p className="text-stone-600">
                      Nestlist Rental Platforms Limited<br />
                      Registration: BN-P7SEPZD3<br />
                      Nairobi, Kenya
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <p className="font-bold text-stone-950 font-serif">Contact Channels</p>
                    <p className="flex items-center gap-2 text-stone-600">
                      <Mail className="h-4 w-4 text-emerald-700" />
                      <a href="mailto:gardisonkirui11@gmail.com" className="hover:text-emerald-800 hover:underline">gardisonkirui11@gmail.com</a>
                    </p>
                    <p className="flex items-center gap-2 text-stone-600">
                      <Phone className="h-4 w-4 text-emerald-700" />
                      <a href="tel:+254715185037" className="hover:text-emerald-800 hover:underline">+254 715 185 037</a>
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-stone-700">
                  We endeavor to reply to all general privacy inquiries within <strong>2 business days</strong> and process formal data deletion/access requests within <strong>14 calendar days</strong>.
                </div>
              </div>
            </section>
            
            {/* Quick Back to Browse Link */}
            <div className="pt-8 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
              <p>© 2026 Nestlist Rental Platforms Limited. Registered under BN-P7SEPZD3, Kenya.</p>
              <Link to="/" className="text-emerald-700 hover:text-emerald-800 font-bold underline transition">
                Back to main platform
              </Link>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
};
