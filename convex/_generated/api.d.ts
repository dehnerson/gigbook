/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountCleanup from "../accountCleanup.js";
import type * as auth from "../auth.js";
import type * as bands from "../bands.js";
import type * as chordShapes from "../chordShapes.js";
import type * as importAction from "../importAction.js";
import type * as importDrafts from "../importDrafts.js";
import type * as importModels from "../importModels.js";
import type * as jam from "../jam.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_cascade from "../lib/cascade.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_home from "../lib/home.js";
import type * as lib_mail from "../lib/mail.js";
import type * as lib_membership from "../lib/membership.js";
import type * as lib_ownership from "../lib/ownership.js";
import type * as lib_songs from "../lib/songs.js";
import type * as lib_users from "../lib/users.js";
import type * as setlists from "../setlists.js";
import type * as songs from "../songs.js";
import type * as users from "../users.js";
import type * as versions from "../versions.js";
import type * as wipe from "../wipe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountCleanup: typeof accountCleanup;
  auth: typeof auth;
  bands: typeof bands;
  chordShapes: typeof chordShapes;
  importAction: typeof importAction;
  importDrafts: typeof importDrafts;
  importModels: typeof importModels;
  jam: typeof jam;
  "lib/access": typeof lib_access;
  "lib/ai": typeof lib_ai;
  "lib/cascade": typeof lib_cascade;
  "lib/crypto": typeof lib_crypto;
  "lib/errors": typeof lib_errors;
  "lib/home": typeof lib_home;
  "lib/mail": typeof lib_mail;
  "lib/membership": typeof lib_membership;
  "lib/ownership": typeof lib_ownership;
  "lib/songs": typeof lib_songs;
  "lib/users": typeof lib_users;
  setlists: typeof setlists;
  songs: typeof songs;
  users: typeof users;
  versions: typeof versions;
  wipe: typeof wipe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  auth: import("@convex-dev/auth/_generated/component.js").ComponentApi<"auth">;
  authPassword: import("@convex-dev/auth/components/password/_generated/component.js").ComponentApi<"authPassword">;
  authEmail: import("@convex-dev/auth/components/email/_generated/component.js").ComponentApi<"authEmail">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  authGoogle: import("@convex-dev/auth/components/google/_generated/component.js").ComponentApi<"authGoogle">;
};
