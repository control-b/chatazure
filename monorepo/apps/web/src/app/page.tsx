import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import MessagingSection from "@/components/landing/MessagingSection";
import DocumentSection from "@/components/landing/DocumentSection";
import ESignSection from "@/components/landing/ESignSection";
import GeofencingSection from "@/components/landing/GeofencingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  // Server-first fallback markup to guarantee visible content even if client JS fails
  // This mirrors the hero headline and CTA in simple static markup
  // Client components below will enhance with animations when available
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-black">
      <noscript>
        <div style={{ color: 'white', padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>
            Connect your fleet like never before
          </h1>
          <p style={{ fontSize: 18, opacity: 0.85, marginBottom: 24 }}>
            Real-time messaging, document management, e-signing, and geofencing built specifically for trucking and logistics teams.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/signin" style={{
              background: 'linear-gradient(90deg,#06b6d4,#2563eb)',
              color: 'white', padding: '12px 20px', borderRadius: 16, fontWeight: 700
            }}>Start Free Trial</a>
            <a href="#messaging" style={{
              border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '12px 20px', borderRadius: 16
            }}>Watch Demo</a>
          </div>
        </div>
      </noscript>
      <Navbar />
      <HeroSection />
      <MessagingSection />
      <DocumentSection />
      <ESignSection />
      <GeofencingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
