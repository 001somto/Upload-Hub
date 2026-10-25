// pages/shared/FilesPage.jsx
// WHAT THIS FILE IS: a screen that holds the file manager under a title.
// WHAT IT DOES: used for "My files" (Users), "My workspace" (Admins) and "Department files"
// (Admins). The `scope` says which space to show: "independent" or "department".

import FileBrowser from "../../components/files/FileBrowser";
import PageHeader from "../../components/ui/PageHeader";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function FilesPage({ scope, title, description }) {
  useDocumentTitle(title);
  return (
    <div>
      <PageHeader title={title} description={description} />
      <FileBrowser scope={scope} />
    </div>
  );
}
