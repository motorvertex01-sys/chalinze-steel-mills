import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("Both migration URLs must use HTTPS.");
  }
  return url.origin;
}

function ask(question) {
  return new Promise((resolve) => {
    const readline = createInterface({ input: stdin, output: stdout });
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

function askSecret(question) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run this migration from an interactive terminal so passwords can be entered without echo.");
  }
  return new Promise((resolve, reject) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    let value = "";
    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Migration cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          value = value.slice(0, -1);
          stdout.write("\b \b");
          continue;
        }
        value += character;
        stdout.write("*");
      }
    };
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
    };
    stdin.on("data", onData);
  });
}

async function requestJson(base, route, { method = "GET", cookie, body } = {}) {
  const headers = new Headers();
  if (cookie) headers.set("Cookie", cookie);
  if (method !== "GET") headers.set("Origin", base);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(new URL(route, base), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${route} failed (${response.status}): ${result?.error ?? "Unexpected response."}`);
  return result;
}

async function signIn(base, email, password) {
  const response = await fetch(new URL("/api/admin/login", base), {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result.authenticated) throw new Error(`Could not authenticate to ${base}.`);
  const setCookie = response.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0];
  if (!cookie) throw new Error(`The administrator session from ${base} did not include a cookie.`);
  return cookie;
}

async function authenticatedJson(base, route, cookie) {
  return requestJson(base, route, { cookie });
}

async function migrateMedia(source, destination, destinationCookie, urlMap, url) {
  if (!url.startsWith("/uploads/") || urlMap.has(url)) return urlMap.get(url) ?? url;
  const response = await fetch(new URL(url, source));
  if (!response.ok) throw new Error(`Could not download source media ${url} (${response.status}).`);
  const contentType = response.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const filename = url.split("/").at(-1) || "media";
  const form = new FormData();
  const blob = new Blob([await response.arrayBuffer()], { type: contentType });
  const field = /\.(?:mp4|webm)$/i.test(filename) ? "media" : "photo";
  form.append(field, blob, filename);
  const route = field === "photo" ? "/api/admin/upload" : "/api/admin/manufacturing/media";
  const uploaded = await fetch(new URL(route, destination), {
    method: "POST",
    headers: { Cookie: destinationCookie, Origin: destination },
    body: form,
  });
  const result = await uploaded.json().catch(() => null);
  if (!uploaded.ok) throw new Error(`Could not upload ${url} to Cloudflare (${uploaded.status}): ${result?.error ?? "Unexpected response."}`);
  const nextUrl = result.photo_url ?? result.media_url;
  if (typeof nextUrl !== "string") throw new Error(`Cloudflare returned no media URL for ${url}.`);
  urlMap.set(url, nextUrl);
  return nextUrl;
}

async function remapContentMedia(source, destination, sourceCookie, destinationCookie, urlMap, content) {
  if (!content || typeof content !== "object" || !content.media) return content;
  const copy = structuredClone(content);
  if (typeof copy.media.heroImage === "string") {
    copy.media.heroImage = await migrateMedia(source, destination, destinationCookie, urlMap, copy.media.heroImage);
  }
  if (typeof copy.media.heroVideo === "string") {
    copy.media.heroVideo = await migrateMedia(source, destination, destinationCookie, urlMap, copy.media.heroVideo);
  }
  if (copy.media.stageImages && typeof copy.media.stageImages === "object") {
    for (const [stage, url] of Object.entries(copy.media.stageImages)) {
      if (typeof url === "string") {
        copy.media.stageImages[stage] = await migrateMedia(source, destination, destinationCookie, urlMap, url);
      }
    }
  }
  return copy;
}

async function importContentState(base, cookie, route, key, state, remap) {
  const published = await remap(state.published);
  const draft = await remap(state.draft);
  const emptyPublishedConfig = key === "site configuration" &&
    published?.home && !Object.values(published.home).some((value) => typeof value === "string" && value.trim()) &&
    (!published.navigation || published.navigation.length === 0) &&
    (!published.pages || Object.keys(published.pages).length === 0);
  if (emptyPublishedConfig) {
    if (draft?.home && Object.values(draft.home).some((value) => typeof value === "string" && value.trim())) {
      await requestJson(base, route, { method: "PUT", cookie, body: draft });
      stdout.write("Imported the unpublished site configuration draft; keeping the built-in public defaults.\n");
    } else {
      stdout.write("Render has no customized site configuration; retaining the new site's built-in defaults.\n");
    }
    return;
  }
  await requestJson(base, route, { method: "PUT", cookie, body: published });
  await requestJson(base, `${route}/publish`, { method: "POST", cookie });
  if (JSON.stringify(draft) !== JSON.stringify(published)) {
    await requestJson(base, route, { method: "PUT", cookie, body: draft });
  }
  stdout.write(`Imported ${key} published content${JSON.stringify(draft) !== JSON.stringify(published) ? " and draft" : ""}.\n`);
}

async function main() {
  if (!process.argv.includes("--apply")) {
    throw new Error("This legacy API migration changes destination content and creates sign-in sessions. Review its limitations and rerun with --apply only after verified backups.");
  }
  const source = normalizeBaseUrl(process.argv[2] || await ask("Render source URL: "));
  const destination = normalizeBaseUrl(process.argv[3] || await ask("Cloudflare Worker destination URL: "));
  const sourceEmail = await ask("Render administrator email: ");
  const sourcePassword = await askSecret("Render administrator password (hidden): ");
  const destinationEmail = await ask("Cloudflare administrator email: ");
  const destinationPassword = await askSecret("Cloudflare administrator password (hidden): ");

  stdout.write("Signing in to both services...\n");
  const [sourceCookie, destinationCookie] = await Promise.all([
    signIn(source, sourceEmail, sourcePassword),
    signIn(destination, destinationEmail, destinationPassword),
  ]);
  stdout.write("Reading current site content from Render...\n");
  const [sourceProfiles, siteConfig, manufacturing] = await Promise.all([
    authenticatedJson(source, "/api/admin/profiles", sourceCookie),
    authenticatedJson(source, "/api/admin/site-config", sourceCookie),
    authenticatedJson(source, "/api/admin/manufacturing", sourceCookie),
  ]);
  if (!Array.isArray(sourceProfiles)) throw new Error("Render returned an invalid profile list.");
  const destinationProfiles = await authenticatedJson(destination, "/api/admin/profiles", destinationCookie);
  if (!Array.isArray(destinationProfiles)) throw new Error("Cloudflare returned an invalid profile list.");
  const mediaMap = new Map();
  const usedDestinationIds = new Set();
  let migrated = 0;

  for (const sourceProfile of sourceProfiles) {
    const photoUrl = await migrateMedia(source, destination, destinationCookie, mediaMap, sourceProfile.photo_url || "");
    const input = {
      section: sourceProfile.section,
      placement: sourceProfile.placement,
      name: sourceProfile.name,
      title: sourceProfile.title,
      biography: sourceProfile.biography,
      background: sourceProfile.background,
      qualifications: sourceProfile.qualifications,
      responsibilities: sourceProfile.responsibilities,
      photo_url: photoUrl,
      is_vacant: Boolean(sourceProfile.is_vacant),
      status: sourceProfile.status,
      sort_order: sourceProfile.sort_order,
    };
    const target = destinationProfiles.find((profile) => profile.id === sourceProfile.id) ??
      destinationProfiles.find((profile) => profile.name === sourceProfile.name && !usedDestinationIds.has(profile.id));
    const saved = target
      ? await requestJson(destination, `/api/admin/profiles/${encodeURIComponent(target.id)}`, { method: "PUT", cookie: destinationCookie, body: input })
      : await requestJson(destination, "/api/admin/profiles", { method: "POST", cookie: destinationCookie, body: input });
    usedDestinationIds.add(saved.id);
    migrated += 1;
  }

  stdout.write(`Imported ${migrated} leadership profiles.\n`);

  const migrateContent = (content) => remapContentMedia(source, destination, sourceCookie, destinationCookie, mediaMap, content);
  await importContentState(destination, destinationCookie, "/api/admin/site-config", "site configuration", siteConfig, migrateContent);
  await importContentState(destination, destinationCookie, "/api/admin/manufacturing", "manufacturing content", manufacturing, migrateContent);

  stdout.write("\nMigration finished. Review the Cloudflare site and admin dashboard before changing your public domain.\n");
  stdout.write("Profile/site content and referenced uploaded media were copied. Legacy audit and undo/redo history are not copied.\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
});
