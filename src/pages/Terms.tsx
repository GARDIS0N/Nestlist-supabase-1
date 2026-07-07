import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Scale, Mail, Phone, ExternalLink, Calendar, CheckCircle2, AlertTriangle, ArrowUp, ArrowRight, Shield, ShieldCheck, AlertOctagon, HelpCircle } from "lucide-react";

export const Terms: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    // 1. Update document Title
    document.title = "Terms of Service — NestList Kenya";

    // 2. Set Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      "NestList Terms of Service for landlords and tenants in Kenya. Read our listing fee policy, M-Pesa payment terms, and user conduct rules. Nestlist Rental Platforms Limited BN-P7SEPZD3."
    );

    // 3. Set Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://nestlist-supabase.vercel.app/terms");

    // 4. Scroll listener for "Back to Top" button
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sections = [
    { id: "acceptance", num: 1, title: "Acceptance of Terms" },
    { id: "definitions", num: 2, title: "Definitions" },
    { id: "platform-desc", num: 3, title: "Platform Description" },
    { id: "accounts", num: 4, title: "User Accounts and Registration" },
    { id: "fees", num: 5, title: "Listing Fees and Payments" },
    { id: "mpesa", num: 6, title: "M-Pesa Payment Policy" },
    { id: "listing-rules", num: 7, title: "Listing Rules and Standards" },
    { id: "landlord-obligations", num: 8, title: "Landlord Obligations" },
    { id: "tenant-rights", num: 9, title: "Tenant Rights and Conduct" },
    { id: "prohibited", num: 10, title: "Prohibited Activities" },
    { id: "intellectual-property", num: 11, title: "Intellectual Property" },
    { id: "disclaimers", num: 12, title: "Disclaimers and Liability" },
    { id: "disputes", num: 13, title: "Dispute Resolution" },
    { id: "suspension", num: 14, title: "Account Suspension and Termination" },
    { id: "changes", num: 15, title: "Changes to These Terms" },
    { id: "governing-law", num: 16, title: "Governing Law" },
    { id: "contact", num: 17, title: "Contact Information" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans text-stone-700 antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-20">
      {/* HEADER SECTION: Dark green gradient banner */}
      <div 
        className="relative overflow-hidden py-16 px-4 text-center text-white"
        style={{ background: "linear-gradient(135deg, #0A4D2E, #1E6B4A)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-md shadow-inner text-[56px] leading-none">
            ⚖️
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-white mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Terms of Service
          </h1>
          <p className="text-emerald-100 font-medium text-base sm:text-lg mb-3">
            Nestlist Rental Platforms Limited
          </p>
          <div className="mt-2 flex flex-wrap justify-center items-center gap-2 text-xs text-emerald-100/80">
            <span className="bg-white/10 px-4 py-1 rounded-full text-[13px] font-medium backdrop-blur-xs">
              Effective: July 7, 2026
            </span>
            <span className="bg-white/10 px-4 py-1 rounded-full text-[13px] font-medium backdrop-blur-xs">
              Last Updated: July 7, 2026
            </span>
          </div>
          <p className="text-white/50 text-xs mt-4 tracking-wider uppercase font-semibold">
            Business Registration: BN-P7SEPZD3
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* TABLE OF CONTENTS: Quick Navigation */}
        <div className="bg-white p-6 border border-[#E2EAE6] rounded-2xl shadow-xs my-6">
          <h3 className="text-sm font-bold text-[#0F1A14] uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#1E6B4A]" />
            <span>Quick Navigation</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="flex items-center gap-2 py-1.5 text-[#1E6B4A] hover:text-[#0A4D2E] border-b border-gray-100 hover:border-[#1E6B4A] transition-colors"
              >
                <ArrowRight className="h-3 w-3 shrink-0 opacity-60" />
                <span className="truncate">{sec.num}. {sec.title}</span>
              </a>
            ))}
          </div>
        </div>

        {/* POLICY DOCUMENT CONTENT */}
        <div className="space-y-12 mt-10">
          
          {/* SECTION 1 - ACCEPTANCE OF TERMS */}
          <section id="acceptance" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Acceptance of Terms
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4 font-normal">
              <p>
                Welcome to NestList. By accessing or using our platform at{" "}
                <a href="https://nestlist-supabase.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#1E6B4A] underline font-medium">
                  nestlist-supabase.vercel.app
                </a>{" "}
                or any associated services, you agree to be bound by these Terms of Service. These terms form a legally binding contract between you and <strong>Nestlist Rental Platforms Limited</strong> (Business Registration: BN-P7SEPZD3).
              </p>
              <p className="font-semibold text-[#0F1A14]">
                These Terms of Service apply to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>All visitors and guests who browse properties on the platform.</li>
                <li>Landlords, caretakers, and property owners who post property listings.</li>
                <li>Agents licensed to manage and post listings on behalf of third-party clients.</li>
                <li>Tenants looking for rental properties who send inquiries to listed contacts.</li>
                <li>Anyone who creates an account on NestList.</li>
              </ul>
              <p>
                If you do not agree with, or cannot comply with, any part of these terms, you must immediately stop using NestList. Your continued access or use of the platform constitutes absolute and irrevocable acceptance of these terms.
              </p>

              {/* Highlight box */}
              <div className="bg-[#F0FDF4] border border-[#A7F3D0] border-l-4 border-l-[#1E6B4A] rounded-xl p-4 my-5 text-sm text-[#065F46] leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-emerald-950">
                  <ShieldCheck className="h-4 w-4 text-[#1E6B4A]" /> Account Registration Confirmation
                </span>
                By clicking "Create Account", registering on the platform, posting a property listing, or submitting any payment, you confirm that you have read, understood, and agreed to be bound by these Terms of Service.
              </div>
            </div>
          </section>

          {/* SECTION 2 - DEFINITIONS */}
          <section id="definitions" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Definitions
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <p>
                To make this document easy to understand, the following terms have these specific meanings whenever used:
              </p>
              <ul className="space-y-3 pl-4 border-l-2 border-emerald-100">
                <li>
                  <strong>"NestList" or "Platform":</strong> The website and digital portal accessible at <em>nestlist-supabase.vercel.app</em> and any related software application managed by Nestlist Rental Platforms Limited.
                </li>
                <li>
                  <strong>"We", "Us", "Our":</strong> Nestlist Rental Platforms Limited, a registered business in Kenya (Registration Number: BN-P7SEPZD3).
                </li>
                <li>
                  <strong>"You", "User":</strong> Any individual, business, or representative who visits, accesses, registers on, or uses NestList.
                </li>
                <li>
                  <strong>"Landlord":</strong> A property owner, manager, or landlord who uses the NestList platform to advertise rental properties.
                </li>
                <li>
                  <strong>"Caretaker":</strong> A person authorized to manage a specific property, make postings, and respond to tenant inquiries on behalf of the property owner.
                </li>
                <li>
                  <strong>"Agent":</strong> A licensed real estate agent, broker, or management company who lists properties on behalf of clients.
                </li>
                <li>
                  <strong>"Tenant":</strong> A user searching for residential or commercial rental accommodation in Kenya through NestList.
                </li>
                <li>
                  <strong>"Listing":</strong> A property advertisement, including descriptions, photos, amenities, rent details, and contact numbers, posted on NestList.
                </li>
                <li>
                  <strong>"Listing Fee":</strong> The mandatory, non-refundable one-time fee paid to NestList to process, verify, and publish a listing for a duration of 30 days.
                </li>
                <li>
                  <strong>"M-Pesa":</strong> The electronic mobile money transfer service operated by Safaricom PLC in Kenya.
                </li>
                <li>
                  <strong>"M-Pesa Code":</strong> The unique 10-character transaction reference code generated by Safaricom PLC upon a successful payment (e.g., QBG582Y78X).
                </li>
                <li>
                  <strong>"Active Listing":</strong> A listing that has been paid for, manually verified by our administration team, and is actively visible to tenants on the public search engine of NestList.
                </li>
              </ul>
            </div>
          </section>

          {/* SECTION 3 - PLATFORM DESCRIPTION */}
          <section id="platform-desc" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Platform Description
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">What NestList IS:</h4>
              <p>
                NestList is an online marketplace connecting property owners, managers, and caretakers with prospective tenants seeking rental houses in Kenya. We provide a platform for listing rental properties and facilitate communications, inquiries, and matching services.
              </p>
              <p>
                NestList currently operates in and supports property listings across major metropolitan areas, including <strong>Nairobi, Kiambu, Nakuru, Kisumu, and Mombasa</strong>, with ongoing expansions designed to cover all 47 counties of the Republic of Kenya.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">What NestList is NOT:</h4>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>We are not a property management company and do not manage physical estates.</li>
                <li>We are not real estate agents, brokers, or legal advocates for any user.</li>
                <li>We do not own, build, or possess any of the listed properties advertised on our platform.</li>
                <li>We do not guarantee the physical condition, quality, construction integrity, cleanliness, safety, or availability of any advertised property.</li>
                <li>We do not collect rent payments, security deposits, utility payments, or service charges on behalf of landlords.</li>
                <li>We are not a party to, nor do we facilitate or enforce, any lease agreements, rent contracts, tenancy regulations, or legal obligations between landlords and tenants.</li>
              </ul>

              {/* Highlight box */}
              <div className="bg-[#F0FDF4] border border-[#A7F3D0] border-l-4 border-l-[#1E6B4A] rounded-xl p-4 my-5 text-sm text-[#065F46] leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-emerald-950">
                  <HelpCircle className="h-4 w-4 text-[#1E6B4A]" /> Marketplace Nature Warning
                </span>
                NestList operates strictly as an advertising marketplace. All negotiations, physical viewings, written tenancy agreements, and deposit or rent transactions are solely the responsibility of the landlord and the tenant. NestList accepts zero liability for tenancy disputes, loss of money, or property damages.
              </div>
            </div>
          </section>

          {/* SECTION 4 - USER ACCOUNTS AND REGISTRATION */}
          <section id="accounts" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                4
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                User Accounts and Registration
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">4.1 Account Creation</h4>
              <p>
                To post property listings or send detailed inquiries, you must create an account. By registering on NestList, you confirm that:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>You are an adult of at least 18 years of age.</li>
                <li>The contact information and name provided are fully accurate, complete, and truthful.</li>
                <li>You are a resident, citizen of Kenya, or have legal authority to operate and execute transactions within Kenya.</li>
                <li>You will protect your account login credentials, use a strong password, and keep your password strictly confidential.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">4.2 Account Roles</h4>
              <p>NestList defines four account roles, each with specific features:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li><strong>Landlord:</strong> Allowed to create property listings, edit their details, upload pictures, and pay listing fees via M-Pesa.</li>
                <li><strong>Caretaker:</strong> Property managers who can post property listings and communicate with tenants on behalf of owners.</li>
                <li><strong>Agent:</strong> Real estate professionals who list and manage property advertisements for multiple third-party clients.</li>
                <li><strong>Tenant:</strong> Users seeking housing who can browse properties, save listings, setup search alerts, and send inquiries.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">4.3 Account Security</h4>
              <p>
                You are fully responsible for all actions, uploads, listings, payments, and messages sent under your account. If you believe your account has been compromised, you must immediately contact NestList support at <strong>gardisonkirui11@gmail.com</strong> or call <strong>+254715185037</strong>.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">4.4 One Account Per Person</h4>
              <p>
                Each person or legal entity is allowed to maintain exactly one active account on our platform. Setting up multiple fake, duplicate, or proxy accounts is strictly prohibited and will result in the immediate suspension or deletion of all related profiles.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">4.5 Account Verification</h4>
              <p>
                To maintain the integrity of our marketplace and prevent fraud, NestList reserves the right to request proof of verification at any time. This includes asking for:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>A copy or number of your Kenyan National ID Card or Passport.</li>
                <li>Official proof of property ownership (e.g., land title, utility bill, county rates receipt).</li>
                <li>A valid real estate agent license or corporate registration details.</li>
              </ul>
              <p>
                Failure to provide this requested verification within 48 hours of notification will lead to immediate account suspension and temporary removal of your listings.
              </p>
            </div>
          </section>

          {/* SECTION 5 - LISTING FEES AND PAYMENTS */}
          <section id="fees" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                5
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Listing Fees and Payments
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">5.1 Listing Fee Schedule</h4>
              <p>
                To publish a rental advertisement on NestList, a landlord, caretaker, or agent must pay a standard listing fee based on the property's size and type. These hardcoded fee limits are as follows:
              </p>

              {/* Standard Fee Schedule Table */}
              <div className="overflow-x-auto my-4 border border-gray-200 rounded-lg shadow-xs">
                <table className="min-w-full bg-white divide-y divide-gray-200 text-sm">
                  <thead className="bg-[#1E6B4A] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Property Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Listing Fee (KES)</th>
                      <th className="px-4 py-3 text-left font-semibold">Visibility Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-stone-700">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">Single Room</td>
                      <td className="px-4 py-2.5">KES 100</td>
                      <td className="px-4 py-2.5">30 Days</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">Bedsitter</td>
                      <td className="px-4 py-2.5">KES 200</td>
                      <td className="px-4 py-2.5">30 Days</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">Studio Apartment</td>
                      <td className="px-4 py-2.5">KES 250</td>
                      <td className="px-4 py-2.5">30 Days</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">1 Bedroom</td>
                      <td className="px-4 py-2.5">KES 500</td>
                      <td className="px-4 py-2.5">30 Days</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">2 Bedroom</td>
                      <td className="px-4 py-2.5">KES 700</td>
                      <td className="px-4 py-2.5">30 Days</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">3 Bedroom</td>
                      <td className="px-4 py-2.5">KES 1,000</td>
                      <td className="px-4 py-2.5">30 Days</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">4 Bedroom</td>
                      <td className="px-4 py-2.5">KES 1,200</td>
                      <td className="px-4 py-2.5">30 Days</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">5+ Bedroom</td>
                      <td className="px-4 py-2.5">KES 1,500</td>
                      <td className="px-4 py-2.5">30 Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">5.2 What the Listing Fee Includes</h4>
              <p>Paying a listing fee unlocks the following benefits:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>One unique listing visible to all prospective tenants browsing NestList.</li>
                <li>30 full days of active listing visibility on our index.</li>
                <li>Instant tenant inquiry notifications delivered via SMS alerts and emails.</li>
                <li>Comprehensive dashboard metrics to manage photos, status, and price updates.</li>
                <li>Responsive technical administration support for listing issues.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">5.3 Payment Method</h4>
              <p>
                All listing fees on NestList are collected exclusively through Safaricom M-Pesa using our official merchant payment configuration:
              </p>
              <ul className="list-none pl-4 space-y-1 text-[#0F1A14] font-mono text-sm bg-gray-50 p-3 rounded-lg border border-gray-150">
                <li>🏦 <strong>Paybill Number:</strong> 247247</li>
                <li>🔑 <strong>Account Number:</strong> 0715185037</li>
                <li>💰 <strong>Amount:</strong> Must match the precise KES listing fee above</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">5.4 Payment Verification</h4>
              <p>
                Once you make the payment on your phone, you will copy the M-Pesa transaction reference code (e.g., QBG582Y78X) received in your SMS and input it on our platform.
              </p>
              <p>
                Our administrators manually verify each code against our incoming payment statements to prevent errors or fraud. Listings go live immediately after verification. The verification process is highly active during our core business hours (<strong>8:00 AM to 8:00 PM, Monday to Sunday</strong>) and typically takes less than 30 minutes. Once active, you will receive an automated SMS confirmation.
              </p>

              {/* Warning box */}
              <div className="bg-[#FEF3C7] border border-[#FDE68A] border-l-4 border-l-[#D97706] rounded-xl p-4 my-5 text-sm text-[#92400E] leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                  <AlertTriangle className="h-4 w-4 text-[#D97706]" /> Strict Non-Refundable Policy
                </span>
                <strong>ALL LISTING FEES ARE 100% NON-REFUNDABLE.</strong> Once a payment is submitted and a listing is verified or activated, we will issue zero refunds regardless of how quickly your house is rented, if you remove the listing early, if you change your mind, or if you make an error in your posting.
              </div>

              <p>
                Refunds will only be considered under highly limited, exceptional circumstances, specifically:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Accidental double payments for the exact same property within 24 hours.</li>
                <li>Payments made for the wrong property size where the difference can be adjusted.</li>
                <li>A confirmed, proven system error on NestList's server side.</li>
              </ul>
              <p>
                To lodge a refund query under these exceptions, please contact our financial desk at <strong>gardisonkirui11@gmail.com</strong> with your transaction receipt.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">5.6 Listing Renewal</h4>
              <p>
                After 30 days, your listing expires automatically and is hidden from search results. To keep the listing active, you must renew it by submitting a fresh M-Pesa payment for another 30-day term.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">5.7 Featured Listings</h4>
              <p>
                Premium options, featured placements, or target marketing promotions may be offered to landlords periodically. These optional services will carry separate costs and terms that will be detailed upon selection.
              </p>
            </div>
          </section>

          {/* SECTION 6 - M-PESA PAYMENT POLICY */}
          <section id="mpesa" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                6
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                M-Pesa Payment Policy
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <p>
                Since M-Pesa is our primary transaction medium in Kenya, we maintain strict requirements and security checks for mobile money usage.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">6.1 How M-Pesa Payments Work</h4>
              <p>To process your listing payment, follow these simple steps:</p>
              <ol className="list-decimal pl-6 space-y-1 text-gray-600 text-sm">
                <li>Open your Sim ToolKit or Safaricom M-Pesa App.</li>
                <li>Select <strong>Lipa Na M-Pesa</strong>, then choose <strong>Paybill</strong>.</li>
                <li>Enter Business Number: <strong>247247</strong>.</li>
                <li>Enter Account Number: <strong>0715185037</strong>.</li>
                <li>Enter the exact amount corresponding to your property type (e.g., KES 500 for a 1 Bedroom).</li>
                <li>Input your private M-Pesa PIN and press Send/Confirm.</li>
                <li>Wait for Safaricom to deliver the confirmation SMS.</li>
                <li>Copy the unique 10-character code from the SMS and submit it on the NestList payment page.</li>
              </ol>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">6.2 Confirmation Code Requirements</h4>
              <p>
                M-Pesa transaction codes (e.g., QBG582Y78X) must be submitted exactly as received. Codes are case-sensitive and must be written in capital letters. Each unique M-Pesa code can only be submitted once. System tracking prevents multiple claims on a single transaction.
              </p>

              {/* Danger box */}
              <div className="bg-[#FEF2F2] border border-[#FECACA] border-l-4 border-l-[#DC2626] rounded-xl p-4 my-5 text-sm text-[#991B1B] leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-red-950">
                  <AlertOctagon className="h-4 w-4 text-[#DC2626]" /> Fraudulent Payment Submission Penalties
                </span>
                Submitting falsified, fabricated, guessed, or already used M-Pesa transaction codes constitutes criminal fraud. In the event of fraudulent submissions, NestList will instantly freeze your account, delete all associated listings without refund, block your phone number/IP address, and refer your details directly to Safaricom's fraud team and the Directorate of Criminal Investigations (DCI) for prosecution under the Computer Misuse and Cybercrimes Act 2018.
              </div>

              {/* Danger box */}
              <div className="bg-[#FEF2F2] border border-[#FECACA] border-l-4 border-l-[#DC2626] rounded-xl p-4 my-5 text-sm text-[#991B1B] leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-red-950">
                  <Shield className="h-4 w-4 text-[#DC2626]" /> Safety Warning: Never Disclose Your M-Pesa PIN
                </span>
                NestList will <strong>NEVER</strong> ask you for your M-Pesa PIN, bank password, or OTP code under any circumstances. If anyone claiming to represent NestList contacts you asking for your PIN or credentials, hang up immediately. Report such incidents to Safaricom support at <strong>100</strong> or contact us directly.
              </div>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">6.5 Payment Disputes</h4>
              <p>
                If your M-Pesa code was rejected or if you encountered issues during payment, please lodge a payment dispute within <strong>7 days</strong> by email to <strong>gardisonkirui11@gmail.com</strong>. Include:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 text-sm">
                <li>Your mobile number used to send the payment.</li>
                <li>The exact date, time, and paid amount.</li>
                <li>The Safaricom M-Pesa transaction code.</li>
                <li>A clear screenshot of the M-Pesa confirmation message.</li>
              </ul>
              <p>
                We will audit the payment and provide a formal response or manually activate your listing within 3 business days.
              </p>
            </div>
          </section>

          {/* SECTION 7 - LISTING RULES AND STANDARDS */}
          <section id="listing-rules" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                7
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Listing Rules and Standards
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <p>
                To maintain a safe, premium, and trustworthy database for house hunters in Kenya, all property advertisements must adhere to strict guidelines.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">7.1 Listing Accuracy</h4>
              <p>
                Every listing you post must be current, available, and complete. You must list the exact physical location, actual monthly rent, required security deposits, utility arrangements, and existing amenities.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">7.2 Prohibited Listing Content</h4>
              <p>
                Landlords and agents are strictly forbidden from posting:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Properties they do not own or are not legally authorized to lease.</li>
                <li>Properties that have already been rented or are unavailable for viewings.</li>
                <li>Exaggerated, deceitful, or false descriptions of house conditions.</li>
                <li>Bait-and-switch pricing (e.g., listing a 2-bedroom rent as KES 15,000 to attract clicks when the actual rent is KES 25,000).</li>
                <li>Generic stock photos, flyers, banners, social media screenshots, graphic designs, or marketing posters.</li>
                <li>Photos showing people's faces, personal credentials, or legal documents.</li>
                <li>Copyrighted images downloaded from other sites without original ownership.</li>
                <li>discriminatory, derogatory, offensive, or racially biased content.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">7.3 One Listing Per Property</h4>
              <p>
                Duplicate listings for the exact same physical property address are banned. Any landlord posting multiple duplicate entries of a single house to manipulate search results will have those duplicates deleted instantly without refund.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">7.4 Photo Requirements and Formats</h4>
              <p>Listings must showcase real pictures of the actual rental property, specifically capturing:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li>The main living room space.</li>
                <li>Bedrooms, showing ventilation and wardrobes.</li>
                <li>The kitchen, sinks, and kitchen counters.</li>
                <li>Bathrooms, showers, and washrooms.</li>
                <li>The building's main compound, gate, or exterior facade.</li>
              </ul>
              <p className="text-xs text-gray-500 font-medium">
                Limits: Maximum 8 photos per listing. Maximum file size: 5MB per photo. Accepted file formats: JPG, PNG, and WebP.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">7.5 Discretionary Listing Removal</h4>
              <p>
                NestList administrators retain absolute discretion to suspend, modify, or permanently remove any listing that violates these rules without warning or refund.
              </p>
            </div>
          </section>

          {/* SECTION 8 - LANDLORD OBLIGATIONS */}
          <section id="landlord-obligations" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                8
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Landlord Obligations
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <p>
                Landlords, caretakers, and authorized agents who list houses on NestList agree to fulfill the following professional duties:
              </p>
              
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">8.1 Habitability and Safety</h4>
              <p>
                By publishing an active listing, you warrant that the property is habitable, structurally sound, safe, and clean. You must guarantee access to clean water, reliable drainage, electrical connections, and proper ventilation as required under Kenyan sanitation laws.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">8.2 Professional Response to Inquiries</h4>
              <p>Landlords agree to:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Respond to tenant SMS, calls, or inquiries within 48 hours.</li>
                <li>Provide honest, transparent viewing arrangements during reasonable daylight hours.</li>
                <li>Refrain from discriminating against any prospective tenant based on tribe, race, religion, gender, marital status, or physical disability, in full compliance with the Constitution of Kenya 2010.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">8.3 Accurate Pricing Tenet</h4>
              <p>
                The rent price specified on NestList must be the actual final monthly rate. You must not increase the advertised price or demand hidden administrative charges when contacted by prospective tenants.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">8.4 Compliance with Kenyan Legislation</h4>
              <p>
                Landlords are legally required to operate in strict conformity with Kenyan housing statutes, including the Landlord and Tenant Act, the Rent Restriction Act, county planning bylaws, and standard National Construction Authority (NCA) guidelines.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">8.5 Immediate Notification of Tenant Matching</h4>
              <p>
                When a listed house is successfully rented, or if it becomes unavailable, the landlord must immediately log into their dashboard and mark the listing as rented or delete it. This prevents prospective tenants from wasting resources and time calling about occupied houses.
              </p>
            </div>
          </section>

          {/* SECTION 9 - TENANT RIGHTS AND CONDUCT */}
          <section id="tenant-rights" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                9
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Tenant Rights and Conduct
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">9.1 Free Browsing Environment</h4>
              <p>
                Prospective tenants have the absolute right to browse all properties, inspect locations, and contact listed owners or managers completely free of charge. NestList does not charge browsing fees or subscription taxes to house-seeking tenants.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">9.2 Respectful Inquiry Conduct</h4>
              <p>
                When communicating with landlords or caretakers, tenants must act in good faith, use respectful language, and avoid spamming listed phone numbers with multiple copy-pasted messages or fake viewing appointments.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">9.3 Due Diligence and Protection</h4>
              <p>
                Because NestList is an open advertising marketplace and does not physically verify property ownership, tenants must exercise maximum caution to protect themselves against offline scams.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Always physically inspect the rental house and confirm its exact address before paying any money.</li>
                <li>Never send rental deposits, utility payments, or reservation fees before visiting the property.</li>
                <li>Ensure a written lease contract is signed by both parties prior to transferring funds.</li>
                <li>Avoid listings carrying suspiciously low prices that do not match current area rates.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">9.4 Tenancy Contracts</h4>
              <p>
                Tenant agreements are entirely independent legal relationships between tenants and landlords. NestList is not a mediator, witness, or legal guarantor, and accepts no legal obligations for tenant-landlord disputes.
              </p>

              {/* Highlight box */}
              <div className="bg-[#F0FDF4] border border-[#A7F3D0] border-l-4 border-l-[#1E6B4A] rounded-xl p-4 my-5 text-sm text-[#065F46] leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-emerald-950">
                  <ShieldCheck className="h-4 w-4 text-[#1E6B4A]" /> zero-Fee Protection for Tenants
                </span>
                <strong>NestList is 100% free for tenants.</strong> We do not charge registration fees, viewing commission taxes, or rent-finder penalties to tenants. If anyone claiming to represent NestList demands money to take you for a viewing or secure a house, do not pay them. Report their details immediately to <strong>gardisonkirui11@gmail.com</strong>.
              </div>
            </div>
          </section>

          {/* SECTION 10 - PROHIBITED ACTIVITIES */}
          <section id="prohibited" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                10
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Prohibited Activities
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <p>
                To safeguard our community, the following activities are strictly banned. Engaging in them will lead to immediate account termination, deletion of your postings, and severe legal consequences.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">10.1 Fraudulent Conduct</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Submitting fake or guessed M-Pesa transaction codes to our administrative desk.</li>
                <li>Advertising houses you do not legally own or do not have written consent to represent.</li>
                <li>Impersonating NestList workers, landlords, licensed agents, or other users.</li>
                <li>Creating multiple fake accounts to list duplicate advertisements or spam reviews.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">10.2 Scamming and Extortion</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Extracting "viewing fees", security deposits, or rent payments for properties that do not exist, or houses that are already leased.</li>
                <li>Collecting payments from tenants and then refusing to give access to the physical property.</li>
                <li>Any systemic attempt to deceive, defraud, or extort funds from house seekers in Kenya.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">10.3 Technical System Abuse</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Attempting to hack, bypass, scrape, flood, or disrupt our web servers.</li>
                <li>Using automatic crawlers, posting bots, or indexing spiders to clone listings.</li>
                <li>Trying to bypass payment systems or access other users' accounts.</li>
                <li>Uploading malware, trojans, viruses, or hazardous code to our servers.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">10.4 Offensive and Hazardous Content</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Posting pictures or statements containing explicit sexual imagery, vulgar language, or racist speech.</li>
                <li>Harassing, threatening, or stalking other users, landlords, or tenants.</li>
                <li>Sharing other users' confidential personal contact details without their written consent.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">10.5 Regulatory Violations</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                <li>Using NestList to list properties for unlawful purposes or without landlord consent.</li>
                <li>Any other action that directly or indirectly violates the laws of the Republic of Kenya.</li>
              </ul>

              {/* Danger box */}
              <div className="bg-[#FEF2F2] border border-[#FECACA] border-l-4 border-l-[#DC2626] rounded-xl p-4 my-5 text-sm text-[#991B1B] leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-red-950">
                  <AlertOctagon className="h-4 w-4 text-[#DC2626]" /> Zero Tolerance for Cybercrime and Fraud
                </span>
                Fraud, financial scams, system hacking, and identity impersonation are criminal offenses in Kenya. NestList maintains a zero-tolerance policy. We will actively cooperate with the Directorate of Criminal Investigations (DCI), cybercrime units, and Safaricom investigators to provide user IP logs, phone numbers, and payment details to ensure the arrest and prosecution of anyone who uses our platform for fraud.
              </div>
            </div>
          </section>

          {/* SECTION 11 - INTELLECTUAL PROPERTY */}
          <section id="intellectual-property" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                11
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Intellectual Property
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">11.1 Proprietary Ownership</h4>
              <p>
                The trademark "NestList", our custom logo, website layouts, style setups, software architectures, databases, code files, and promotional materials are owned exclusively by <strong>Nestlist Rental Platforms Limited</strong>. You are strictly forbidden from copying, downloading, modifying, or using our proprietary assets without our express written permission.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">11.2 Your Content and License</h4>
              <p>
                By uploading photos, text, descriptions, and amenities to NestList, you retain original ownership of your content. However, you grant NestList an irrevocable, royalty-free, worldwide, non-exclusive license to display, modify, resize, translate, distribute, and promote your uploaded content across our channels, websites, and marketing campaigns.
              </p>
              <p>
                You warrant that you possess all intellectual property rights to the photos and descriptions you upload and that they do not infringe any third-party copyrights.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">11.3 Reporting Copyright Infringements</h4>
              <p>
                If you believe any content or photos published on NestList infringe your personal copyright, please notify our team immediately at <strong>gardisonkirui11@gmail.com</strong> with specific listing links and proof of original copyright.
              </p>
            </div>
          </section>

          {/* SECTION 12 - DISCLAIMERS AND LIABILITY */}
          <section id="disclaimers" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                12
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Disclaimers and Liability
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">12.1 Platform Provided "As Is"</h4>
              <p>
                NestList is provided on an "as is" and "as available" basis without warranties of any kind. We do not guarantee that the portal will be fully available 24 hours a day, error-free, uninterrupted, secure, or free from server glitches. We will make reasonable commercial efforts to ensure website reliability and fix system bugs promptly.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">12.2 Advertised Accuracy Disclaimer</h4>
              <p>
                NestList does not inspect properties or verify the truthfulness of landlord descriptions. We are not liable for inaccurate listing prices, rented properties left active on the platform, or differences between physical property conditions and uploaded photos.
              </p>

              {/* Warning box */}
              <div className="bg-[#FEF3C7] border border-[#FDE68A] border-l-4 border-l-[#D97706] rounded-xl p-4 my-5 text-sm text-[#92400E] leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                  <AlertTriangle className="h-4 w-4 text-[#D97706]" /> Limitation of Liability Under Kenyan Law
                </span>
                To the maximum extent permitted by Kenyan law, Nestlist Rental Platforms Limited, its directors, and employees shall not be liable for any indirect, special, incidental, or consequential damages resulting from your use of NestList. This includes losses resulting from financial fraud, offline rental deposits paid to scammers, tenancy breach issues, landlord disputes, or county rate problems.
              </div>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">12.4 Safety Diligence Notice</h4>
              <p>
                We highly recommend that all users perform comprehensive offline diligence. Tenants must never transfer rent or booking fees prior to seeing the house physically. Report any landlord who pressures you to send deposit money immediately.
              </p>
            </div>
          </section>

          {/* SECTION 13 - DISPUTE RESOLUTION */}
          <section id="disputes" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                13
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Dispute Resolution
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">13.1 Disputes Between Landlords and Tenants</h4>
              <p>
                Tenancy conflicts, deposit refund disputes, property damages, or rent default issues are solely the responsibility of the tenant and the landlord. NestList is not an arbitrator, mediator, or legal representative, and does not interfere in offline tenancy conflicts.
              </p>
              <p>
                For official rental and housing disputes in Kenya, we suggest contacting:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600 text-sm">
                <li>The Business Premises Rent Tribunal or Rent Restriction Tribunal in your locality.</li>
                <li>The County Government Housing Department.</li>
                <li>Your local county lands and housing department offices.</li>
                <li>A qualified, registered advocate of the High Court of Kenya.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">13.2 Disputes with NestList</h4>
              <p>
                If you have an issue, query, or conflict with NestList as a business, please follow this resolution path:
              </p>
              <p>
                <strong>Step 1:</strong> Email us at <strong>gardisonkirui11@gmail.com</strong>. We commit to investigating and resolving all customer complaints within 7 business days.
              </p>
              <p>
                <strong>Step 2:</strong> If we fail to resolve the conflict within 30 days, any dispute arising from these terms will be governed by the laws of Kenya and will be subjected exclusively to the jurisdiction of the courts of Kenya.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">13.3 Payment and Listing Fee Claims</h4>
              <p>
                All claims regarding transaction issues, M-Pesa failures, or manual verification queries must be logged within 7 days of the payment. Log payment claims with full receipt evidence at <strong>gardisonkirui11@gmail.com</strong>.
              </p>
            </div>
          </section>

          {/* SECTION 14 - ACCOUNT SUSPENSION AND TERMINATION */}
          <section id="suspension" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                14
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Account Suspension and Termination
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              
              <h4 className="text-base font-bold text-[#1E6B4A] mt-4 mb-2">14.1 Grounds for Account Suspension</h4>
              <p>
                NestList retains the absolute right to suspend, freeze, or delete your account immediately, without warning or liability, if you:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 text-sm">
                <li>Submit fabricated, stolen, or duplicate M-Pesa transaction codes.</li>
                <li>Advertise properties you do not represent or post fraudulent listings.</li>
                <li>Engage in financial scams, extortion, or viewing fee collection scams.</li>
                <li>Harass, abuse, stalk, or send offensive messages to other users or administrators.</li>
                <li>Violate any clause written in these Terms of Service.</li>
                <li>Are suspected of criminal activities under the Laws of Kenya.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">14.2 Consequence of Account Suspension</h4>
              <p>When an account is suspended:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 text-sm">
                <li>All of your active listings are deleted immediately from the public portal.</li>
                <li>You lose access to your profile dashboard, saved alerts, and user histories.</li>
                <li>No refunds will be processed for any unused active listing days.</li>
                <li>Your details will be shared with the DCI if financial fraud is suspected.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">14.3 Appeals Procedure</h4>
              <p>
                If you believe your account was suspended in error, you can submit an appeal by emailing <strong>gardisonkirui11@gmail.com</strong>. State your registered email and attach transaction screenshots or property ownership documentation. Appeals are reviewed and answered within 5 business days.
              </p>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">14.4 Voluntary Deletion</h4>
              <p>
                You can delete your account at any time by contacting our support line. Please note that active listings will be removed, no refunds will be provided for remaining days, and financial records are legally retained for up to 7 years to comply with tax and AML regulations.
              </p>
            </div>
          </section>

          {/* SECTION 15 - CHANGES TO THESE TERMS */}
          <section id="changes" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                15
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Changes to These Terms
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <p>
                NestList reserves the right to modify or replace these Terms of Service at any time. When we make major, material updates to these terms, we will:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li>Change the "Last Updated" date at the top of this document.</li>
                <li>Deliver an email notice to all registered account owners.</li>
                <li>Display a visible warning banner across the NestList homepage.</li>
                <li>Give at least 7 days' advance notice before the modified terms become active.</li>
              </ul>
              <p>
                If you continue accessing NestList after the 7-day notification period, you are bound by the modified terms. If you do not agree with the updated terms, you must stop using the platform and delete your account before they take effect.
              </p>
            </div>
          </section>

          {/* SECTION 16 - GOVERNING LAW */}
          <section id="governing-law" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                16
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Governing Law
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <p>
                These Terms of Service are governed by, construed, and enforced strictly in accordance with the laws of the Republic of Kenya.
              </p>
              <p className="font-semibold text-[#0F1A14]">
                Any legal actions, user data requests, or payment reviews will comply with:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-gray-600 text-sm">
                <li>The Constitution of Kenya 2010.</li>
                <li>The Data Protection Act 2019 (governing user data subjects).</li>
                <li>The Consumer Protection Act 2012.</li>
                <li>The Kenya Information and Communications Act (KICA).</li>
                <li>The Computer Misuse and Cybercrimes Act 2018 (handling payment fraud and system hacking).</li>
                <li>The Landlord and Tenant legislation and local county bylaws.</li>
              </ul>
              <p>
                Any legal actions or disputes related to these terms or platform operations must be filed exclusively in the courts of the Republic of Kenya.
              </p>
            </div>
          </section>

          {/* SECTION 17 - CONTACT INFORMATION */}
          <section id="contact" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1E6B4A] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                17
              </div>
              <h2 className="font-serif text-2xl text-[#0F1A14]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Contact Information
              </h2>
            </div>
            <div className="h-px bg-gradient-to-r from-[#1E6B4A] to-transparent mb-5" />
            <div className="text-[15px] text-gray-700 leading-[1.85] space-y-4">
              <p>
                If you have questions, feedback, administrative inquiries, or legal concerns regarding these terms, please contact our physical or virtual office:
              </p>
              
              <div className="bg-stone-50 border border-[#E2EAE6] rounded-xl p-5 space-y-2">
                <p className="font-bold text-[#0F1A14]">Nestlist Rental Platforms Limited</p>
                <p className="text-gray-600 text-sm">Business Registration: BN-P7SEPZD3</p>
                <p className="text-gray-600 text-sm">Nairobi, Kenya</p>
                <p className="text-gray-600 text-sm flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-[#1E6B4A]" />
                  <a href="mailto:gardisonkirui11@gmail.com" className="text-[#1E6B4A] hover:underline font-medium">gardisonkirui11@gmail.com</a>
                </p>
                <p className="text-gray-600 text-sm flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-[#1E6B4A]" />
                  <a href="tel:+254715185037" className="text-[#1E6B4A] hover:underline font-medium">+254 715 185037</a>
                </p>
                <p className="text-gray-600 text-sm flex items-center gap-1.5">
                  <span className="text-emerald-700 font-bold font-mono">WA:</span>
                  <a href="https://wa.me/254715185037" target="_blank" rel="noopener noreferrer" className="text-[#1E6B4A] underline hover:text-[#0A4D2E] font-medium">
                    Click here to Chat on WhatsApp
                  </a>
                </p>
              </div>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">Committed Response Times</h4>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 text-sm">
                <li><strong>General inquiries:</strong> Answered within 2 business days.</li>
                <li><strong>Payment/M-Pesa disputes:</strong> Handled within 3 business days.</li>
                <li><strong>Account suspension appeals:</strong> Settled within 5 business days.</li>
                <li><strong>Official legal notices:</strong> Answered within 14 business days.</li>
              </ul>

              <h4 className="text-base font-bold text-[#1E6B4A] mt-6 mb-2">Kenyan Regulatory Oversight Bodies</h4>
              <p className="text-sm">
                If your issues remain unresolved, you may report to:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 text-sm">
                <li><strong>Communications Authority of Kenya (CA):</strong> <a href="https://ca.go.ke" target="_blank" rel="noreferrer" className="text-[#1E6B4A] hover:underline">ca.go.ke</a></li>
                <li><strong>Office of the Data Protection Commissioner (ODPC):</strong> <a href="https://odpc.go.ke" target="_blank" rel="noreferrer" className="text-[#1E6B4A] hover:underline">odpc.go.ke</a></li>
                <li><strong>Directorate of Criminal Investigations (DCI Fraud):</strong> <a href="https://dci.go.ke" target="_blank" rel="noreferrer" className="text-[#1E6B4A] hover:underline">dci.go.ke</a></li>
                <li><strong>Competition Authority of Kenya (Consumer Protection):</strong> <a href="https://competition.go.ke" target="_blank" rel="noreferrer" className="text-[#1E6B4A] hover:underline">competition.go.ke</a></li>
              </ul>
            </div>
          </section>

        </div>

      </div>

      {/* COMPONENT 3 — Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center bg-[#1E6B4A] hover:bg-[#0A4D2E] text-white rounded-full w-11 h-11 shadow-lg cursor-pointer transition-transform hover:scale-110"
          style={{ boxShadow: "0 4px 12px rgba(30,107,74,0.3)" }}
          title="Back to Top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
