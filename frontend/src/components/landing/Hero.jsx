// components/landing/Hero.jsx
// WHAT THIS FILE IS: the first thing visitors see on the landing page.
// WHAT IT DOES: a clear headline, short plain explanation and the four ways in (create a
// User account, register as an Admin, or sign in as either). On the right is a layered
// picture of the app with small floating status cards. The text and picture rise in once
// when the page loads, and the cards drift gently. Both are switched off automatically
// for visitors who ask their device for reduced motion (see index.css).

import { Link } from "react-router-dom";
import { ArrowRight, Building2, User } from "../../lib/icons";
import Button from "../ui/Button";
import { FilesScreen, FloatingApproved, FloatingShare, FloatingUpload, WindowFrame } from "./Illustrations";

// A tiny helper: an element that rises in after `delay` milliseconds.
function Rise({ delay = 0, className = "", children }) {
  return (
    <div className={`animate-rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(60rem_34rem_at_85%_-8%,#c8e6c9_0%,transparent_62%),radial-gradient(40rem_28rem_at_-5%_30%,#eaf6ec_0%,transparent_60%)]">
      {/* Soft decorative shapes. They carry no meaning and are hidden from screen readers. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-40 h-72 w-72 animate-float-slow rounded-full bg-leaf-300/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-10 top-10 h-40 w-40 animate-float rounded-[2rem] bg-leaf-400/15 blur-2xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <Rise>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] text-leaf-950 sm:text-5xl lg:text-6xl">
              Every department file, in one safe place.
            </h1>
          </Rise>
          <Rise delay={120}>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              UploadHub gives departments at the University of Nigeria, Nsukka one home for their records. Upload from your phone or laptop, organise in folders, share with a
              link that expires, and see who did what.
            </p>
          </Rise>
          <Rise delay={240} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/signup/user" size="lg" icon={User}>
              Create a User account
            </Button>
            <Button to="/signup/admin" size="lg" variant="secondary" icon={Building2}>
              Register as an Admin
            </Button>
          </Rise>
          <Rise delay={320}>
            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              Already registered?
              <Link to="/signin/user" className="inline-flex items-center gap-1 font-semibold text-leaf-800 underline-offset-2 hover:underline">
                User sign in <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link to="/signin/admin" className="inline-flex items-center gap-1 font-semibold text-leaf-800 underline-offset-2 hover:underline">
                Admin sign in <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </p>
          </Rise>
        </div>

        {/* The layered picture of the app. */}
        <Rise delay={200} className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div aria-hidden="true" className="absolute inset-x-6 -bottom-5 top-8 rounded-[2rem] bg-leaf-600/10 blur-sm" />
          <WindowFrame className="relative">
            <FilesScreen />
          </WindowFrame>
          <div className="pointer-events-none absolute -left-3 top-6 hidden animate-float sm:block lg:-left-10">
            <FloatingUpload />
          </div>
          <div className="pointer-events-none absolute -bottom-6 right-2 hidden animate-float-slow sm:block lg:-right-4">
            <FloatingShare />
          </div>
          <div className="pointer-events-none absolute -right-2 -top-6 hidden animate-float-slow md:block lg:-right-6">
            <FloatingApproved />
          </div>
        </Rise>
      </div>
    </section>
  );
}
