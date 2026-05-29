/**
 * (editor) route group — full-screen layout for the workflow editor.
 *
 * Why a separate route group?
 *  The (dashboard) layout wraps every page with the sidebar and topbar.
 *  The editor needs the whole viewport. Next.js doesn't let nested layouts
 *  "escape" their parent — so we put the editor pages under their own
 *  route group with its own minimal layout. Same URL space, different
 *  chrome.
 *
 *  /workflows         → (dashboard)/workflows/page.tsx       (with shell)
 *  /workflows/[id]    → (editor)/workflows/[id]/page.tsx     (full-screen)
 *
 * The MobileEditorGate intercepts narrow viewports and shows a friendly
 * "use a laptop" interstitial instead of half-mounting React Flow.
 */

import { MobileEditorGate } from "@/components/flow/mobile-gate";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden">
      <MobileEditorGate>{children}</MobileEditorGate>
    </div>
  );
}
