import { renderOgCard } from "@/lib/og";

// Next's static analyzer needs these as literal exports — declaring them
// here rather than re-exporting from a helper module.
export const runtime = "edge";
export const alt =
  "Orqestra — Visual orchestration for production AI workflows";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgCard();
}
