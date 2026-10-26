// pages/shared/SharePage.jsx
// WHAT THIS FILE IS: the page a share link opens (/share/<link id>). Anyone with the link
// can open it, even without an account.
// WHAT IT DOES: asks the backend about the link EVERY time it is opened (the backend
// re-checks that it is still valid, not expired and not revoked). Then it shows:
//   a file link    -> the file's name, type and size, and a Download button
//   a folder link  -> only for signed-in people; others see a sign-in gate
//   expired / revoked / unknown links -> a clear explanation
// A single-file link never lists folders or other files.
// STATUS: PROVISIONAL endpoint (api.shares.open). Folder link contents still need
// agreeing with the backend teammate.

import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth, homePathFor } from "../../context/AuthContext";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { api } from "../../lib/api";
import { formatBytes } from "../../lib/format";
import { CircleX, Clock, Download, File, Folder, Lock } from "../../lib/icons";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import Logo from "../../components/ui/Logo";

function Message({ icon: Icon, tone, title, children }) {
  return (
    <div className="text-center">
      <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
      <div className="mt-2 text-muted">{children}</div>
    </div>
  );
}

export default function SharePage() {
  useDocumentTitle("Shared with you");
  const { linkId } = useParams();
  const location = useLocation();
  const { status: authStatus, user } = useAuth();
  const result = useApiData(() => api.shares.open(linkId), [linkId, authStatus]);
  const signedIn = authStatus === "signedIn" && user;
  const from = { from: location.pathname };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-leaf-100/70 to-paper px-4 py-10">
      <Link to="/" aria-label="UploadHub home">
        <Logo />
      </Link>

      <main className="mt-10 w-full max-w-md">
        <Card className="!p-8">
          <DataBoundary result={result} feature="This share link" rows={2}>
            {(link) => {
              if (link.state === "expired")
                return (
                  <Message icon={Clock} tone="bg-amber-50 text-amber-700" title="This link has expired">
                    <p>Ask the person who shared it to send you a new link.</p>
                  </Message>
                );
              if (link.state === "revoked")
                return (
                  <Message icon={CircleX} tone="bg-red-50 text-red-600" title="This link was turned off">
                    <p>The person who shared it has revoked it. Ask them for a new link if you still need the file.</p>
                  </Message>
                );
              if (link.state === "notFound")
                return (
                  <Message icon={CircleX} tone="bg-red-50 text-red-600" title="Link not found">
                    <p>Check that you copied the whole link.</p>
                  </Message>
                );
              if (link.state === "requiresSignIn" && !signedIn)
                return (
                  <Message icon={Lock} tone="bg-leaf-100 text-leaf-700" title="Sign in to open this">
                    <p>The person who shared this wants viewers to create an account.</p>
                    <div className="mt-6 grid gap-2">
                      <Button to="/signin/user" state={from}>
                        Sign in
                      </Button>
                      <Button to="/signup/user" variant="secondary" state={from}>
                        Create a User account
                      </Button>
                    </div>
                  </Message>
                );

              // An active link. A folder link only reaches here for a signed-in person.
              const isFolder = link.targetType === "folder";
              return (
                <div>
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-700">
                      {isFolder ? <Folder className="h-7 w-7" aria-hidden="true" /> : <File className="h-7 w-7" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <h1 className="break-words text-xl font-extrabold text-ink">{link.name}</h1>
                      <p className="text-sm text-muted">
                        {isFolder ? "Shared folder" : [link.contentType || "File", link.size != null ? formatBytes(link.size) : null].filter(Boolean).join(" - ")}
                      </p>
                    </div>
                  </div>

                  {isFolder ? (
                    <div className="mt-6">
                      <p className="text-sm text-muted">Shared folders open inside your UploadHub workspace.</p>
                      <Button to={homePathFor(user ? user.role : "user")} className="mt-4 w-full">
                        Open UploadHub
                      </Button>
                    </div>
                  ) : (
                    <>
                      {link.downloadUrl ? (
                        <Button href={link.downloadUrl} icon={Download} size="lg" className="mt-6 w-full">
                          Download
                        </Button>
                      ) : (
                        <p className="mt-6 text-sm text-muted">Download is not available right now. Try again in a moment.</p>
                      )}
                      {!signedIn ? (
                        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
                          Want somewhere safe for your own files?{" "}
                          <Link className="font-semibold text-leaf-800 hover:underline" to="/signup/user">
                            Create a free UploadHub account
                          </Link>
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              );
            }}
          </DataBoundary>
        </Card>
      </main>
    </div>
  );
}
