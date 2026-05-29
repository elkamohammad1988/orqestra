/**
 * Reusable validation primitives for auth + account fields.
 *
 * These are intentionally permissive — we let Supabase's own validation
 * be the strict source of truth (it's the system of record). Our job at
 * this layer is to fail fast on obviously-malformed input so we don't
 * waste a round-trip to Supabase for a typo, and to bound string sizes
 * so a hostile client can't burn DB rows with megabyte-long emails.
 */

import { z } from "zod";

// 254 is the RFC-5321 limit on the full address (local-part + @ + domain).
// 3 is the absolute minimum (a@b).
export const EmailSchema = z
  .string()
  .trim()
  .min(3, "Please enter your email.")
  .max(254, "Email is too long.")
  .email("Please enter a valid email.");

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

export const NameSchema = z
  .string()
  .trim()
  .min(1, "Please enter a name.")
  .max(80, "Name is too long.");

export const NoteSchema = z
  .string()
  .trim()
  .max(500, "Note is too long.");
