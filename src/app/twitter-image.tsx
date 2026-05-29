import { renderOgCard } from "@/lib/og";

// Twitter renders summary_large_image at the same 1200×630 the OG spec
// uses, so we share the renderer and just re-declare literal Next exports.
export const runtime = "edge";
export const alt =
  "Orqestra — Visual orchestration for production AI workflows";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return renderOgCard();
}
