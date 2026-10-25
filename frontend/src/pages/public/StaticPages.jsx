// pages/public/StaticPages.jsx
// WHAT THIS FILE IS: the simple text pages linked from the footer - About, Help and FAQ,
// Privacy, Contact - plus the "page not found" page.
// WHAT IT DOES: each is a short, readable page. The Privacy text is generic starter text
// and must be reviewed by the project team before real use. The Contact page uses an
// email link only, so it never pretends to send a message it cannot send.

import { Link } from "react-router-dom";
import { settings } from "../../config/settings";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Mail, MapPin } from "../../lib/icons";
import ContentPage, { ContentSection } from "../../components/layout/ContentPage";
import Button from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/Feedback";

export function AboutPage() {
  return (
    <ContentPage
      title="About UploadHub"
      intro={`UploadHub is a student project at the ${settings.institution}. It replaces paper filing and scattered storage with one place for department files.`}
    >
      <ContentSection title="The problem">
        <p>
          Paper records get lost or damaged and take time to find. Files kept on personal drives and chat apps are spread out, and nobody can say who opened or changed
          a document.
        </p>
      </ContentSection>
      <ContentSection title="What UploadHub does">
        <p>
          Everyone gets their own workspace for files and folders. Departments get a shared space run by one Admin, who decides who joins and what each member can do.
          Files can be shared with a link that expires, and every important action is recorded in an audit trail.
        </p>
      </ContentSection>
      <ContentSection title="Who it is for">
        <p>
          Students and staff who need to keep files safe and find them fast, and department Admins who need to know who can reach what.
        </p>
      </ContentSection>
      <div className="flex flex-wrap gap-3">
        <Button to="/signup/user">Create a User account</Button>
        <Button to="/signup/admin" variant="secondary">
          Register as an Admin
        </Button>
      </div>
    </ContentPage>
  );
}

const FAQ = [
  {
    q: "Should I sign up as a User or an Admin?",
    a: "Choose User if you want a personal workspace and may join a department. Choose Admin if you are creating a department and will manage its members. Each department has one Admin.",
  },
  {
    q: "Do I need a department to use UploadHub?",
    a: "No. Every account has its own workspace. A department is optional and only adds access to that department's shared files.",
  },
  {
    q: "How do I join a department?",
    a: "Open Department in your menu, search by name or code, and send a request. You can have one pending request at a time and cancel it. The Admin approves or rejects it. A hidden department can be joined by typing its code.",
  },
  {
    q: "What can I do once I am a member?",
    a: "Members can download department files. The Admin can also allow uploading, creating folders, sharing links and managing files, member by member.",
  },
  {
    q: "Can I leave a department?",
    a: "Yes, at any time. Your own files stay in your workspace. You can request to join again later.",
  },
  {
    q: "How much storage do I get?",
    a: "Your own workspace has a fixed limit, shown on your dashboard. Department storage is counted separately, so downloading department files never uses your own space.",
  },
  {
    q: "How do share links work?",
    a: "Create a link from a file or folder and choose when it expires. You can revoke it at any time. File links work for anyone with the link. Folder links need the person to sign in.",
  },
  {
    q: "Can I get a deleted file back?",
    a: "No. Deleting is permanent, so you are asked to confirm first.",
  },
  {
    q: "I forgot my password.",
    a: "Use Forgot your password on the sign-in page. The reset link works once and expires quickly.",
  },
];

export function HelpPage() {
  return (
    <ContentPage title="Help and FAQ" intro="Quick answers to common questions.">
      <div className="divide-y divide-line rounded-2xl border border-line bg-white shadow-soft">
        {FAQ.map((item) => (
          <details key={item.q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
              {item.q}
              <span aria-hidden="true" className="text-xl leading-none text-leaf-700 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-muted">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="text-muted">
        Still stuck? <Link className="font-semibold text-leaf-800 underline-offset-2 hover:underline" to="/contact">Contact us</Link>.
      </p>
    </ContentPage>
  );
}

export function PrivacyPage() {
  return (
    <ContentPage title="Privacy" intro="How UploadHub treats your information, in plain language.">
      <InlineAlert tone="warning" title="Starter text">
        This page is generic starter text written for a student project. It must be reviewed and approved before UploadHub is used with real people's data.
      </InlineAlert>
      <ContentSection title="What we keep">
        <p>
          Your name, email address and a scrambled (hashed) version of your password. Your files and folders, with their names, sizes and dates. A record of important
          actions, such as uploads, downloads, sharing and membership changes.
        </p>
      </ContentSection>
      <ContentSection title="Who can see it">
        <p>
          Your own workspace is private to you. Department files are visible only to approved members of that department. Share links show a file only to people who have
          the link, until it expires or is revoked. A department Admin can see the audit trail for their own department only.
        </p>
      </ContentSection>
      <ContentSection title="Your choices">
        <p>
          You can edit your name and photo, change your password and choose which notifications you get. You can delete your files at any time. Ask the project team if you
          want your account removed.
        </p>
      </ContentSection>
    </ContentPage>
  );
}

export function ContactPage() {
  return (
    <ContentPage title="Contact" intro="Questions about UploadHub? Get in touch.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <Mail className="h-5 w-5 text-leaf-700" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-ink">Email</h2>
          <a className="mt-1 block break-all text-leaf-800 underline-offset-2 hover:underline" href={`mailto:${settings.contactEmail}`}>
            {settings.contactEmail}
          </a>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <MapPin className="h-5 w-5 text-leaf-700" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-ink">Where</h2>
          <p className="mt-1 text-muted">{settings.institution}</p>
        </div>
      </div>
      <InlineAlert tone="info">The email address above is a placeholder. The project team should replace it in src/config/settings.js before launch.</InlineAlert>
    </ContentPage>
  );
}

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-6xl font-extrabold text-leaf-300">404</p>
      <h1 className="mt-4 text-3xl font-extrabold text-ink">This page does not exist</h1>
      <p className="mt-2 text-muted">The link may be old or mistyped. Head back to the home page.</p>
      <Button to="/" className="mt-6">
        Go to home
      </Button>
    </div>
  );
}
