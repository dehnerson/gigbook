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
import type * as bands from "../bands.js";
import type * as chordShapes from "../chordShapes.js";
import type * as http from "../http.js";
import type * as importAction from "../importAction.js";
import type * as importDrafts from "../importDrafts.js";
import type * as importModels from "../importModels.js";
import type * as jam from "../jam.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_cascade from "../lib/cascade.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_songs from "../lib/songs.js";
import type * as lib_users from "../lib/users.js";
import type * as migrations from "../migrations.js";
import type * as setlists from "../setlists.js";
import type * as songs from "../songs.js";
import type * as users from "../users.js";
import type * as versions from "../versions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountCleanup: typeof accountCleanup;
  bands: typeof bands;
  chordShapes: typeof chordShapes;
  http: typeof http;
  importAction: typeof importAction;
  importDrafts: typeof importDrafts;
  importModels: typeof importModels;
  jam: typeof jam;
  "lib/access": typeof lib_access;
  "lib/ai": typeof lib_ai;
  "lib/cascade": typeof lib_cascade;
  "lib/crypto": typeof lib_crypto;
  "lib/errors": typeof lib_errors;
  "lib/songs": typeof lib_songs;
  "lib/users": typeof lib_users;
  migrations: typeof migrations;
  setlists: typeof setlists;
  songs: typeof songs;
  users: typeof users;
  versions: typeof versions;
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

export declare const components: {};
