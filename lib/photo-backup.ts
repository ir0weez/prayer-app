import { Image } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.8;
const PHOTO_DIRECTORY = "prayercircle-backup-photos";

export type EmbeddedPhoto = {
  originalUri: string;
  base64: string;
  mimeType: "image/jpeg";
};

export type EmbeddedPhotos = Record<string, EmbeddedPhoto>;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function isFileUri(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("file://");
}

function collectPhotoUris(value: unknown, output: Set<string>): void {
  if (isFileUri(value)) {
    output.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectPhotoUris(item, output));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectPhotoUris(item, output));
  }
}

function parseStorageValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function hashUri(uri: string): string {
  let hash = 2166136261;
  for (let index = 0; index < uri.length; index += 1) {
    hash ^= uri.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function getImageDimensions(uri: string): Promise<{ width: number; height: number } | null> {
  try {
    return await new Promise((resolve) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), () => resolve(null));
    });
  } catch {
    return null;
  }
}

async function embedPhoto(uri: string): Promise<EmbeddedPhoto | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;

    const dimensions = await getImageDimensions(uri);
    const actions: ImageManipulator.Action[] = [];
    if (dimensions) {
      const longestEdge = Math.max(dimensions.width, dimensions.height);
      if (longestEdge > MAX_IMAGE_EDGE) {
        const scale = MAX_IMAGE_EDGE / longestEdge;
        actions.push({
          resize: {
            width: Math.max(1, Math.round(dimensions.width * scale)),
            height: Math.max(1, Math.round(dimensions.height * scale)),
          },
        });
      }
    }

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!result.base64) return null;

    return { originalUri: uri, base64: result.base64, mimeType: "image/jpeg" };
  } catch (error) {
    // One unreadable or unsupported photo must not prevent the rest of the backup.
    console.warn("PrayerCircle photo backup skipped an image", uri, error);
    return null;
  }
}

export async function createPhotoBackup(storage: Record<string, string | null>): Promise<EmbeddedPhotos> {
  const uris = new Set<string>();
  Object.values(storage).forEach((value) => {
    if (typeof value === "string") collectPhotoUris(parseStorageValue(value), uris);
  });

  const embedded: EmbeddedPhotos = {};
  for (const uri of uris) {
    const photo = await embedPhoto(uri);
    if (photo) embedded[uri] = photo;
  }
  return embedded;
}

function rewritePhotoUris(value: unknown, replacements: Record<string, string>): unknown {
  if (typeof value === "string") return replacements[value] ?? value;
  if (Array.isArray(value)) return value.map((item) => rewritePhotoUris(item, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewritePhotoUris(item, replacements)]));
  }
  return value;
}

export async function restorePhotoBackup(
  storage: Record<string, string | null>,
  photos: unknown,
): Promise<Record<string, string | null>> {
  if (!photos || typeof photos !== "object" || Array.isArray(photos) || !FileSystem.documentDirectory) {
    return storage;
  }

  const replacements: Record<string, string> = {};
  const directory = `${FileSystem.documentDirectory}${PHOTO_DIRECTORY}/`;
  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  } catch {
    return storage;
  }

  for (const [originalUri, candidate] of Object.entries(photos as Record<string, unknown>)) {
    if (
      !isFileUri(originalUri) ||
      !candidate ||
      typeof candidate !== "object" ||
      typeof (candidate as { base64?: unknown }).base64 !== "string"
    ) {
      continue;
    }

    try {
      const filename = `photo-${hashUri(originalUri)}.jpg`;
      const destination = `${directory}${filename}`;
      await FileSystem.writeAsStringAsync(destination, (candidate as { base64: string }).base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      replacements[originalUri] = destination;
    } catch (error) {
      // Preserve the original URI if this individual attachment cannot be restored.
      console.warn("PrayerCircle photo restore skipped an image", originalUri, error);
    }
  }

  if (Object.keys(replacements).length === 0) return storage;

  const restored: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(storage)) {
    if (typeof value !== "string") {
      restored[key] = value;
      continue;
    }
    const parsed = parseStorageValue(value);
    const rewritten = rewritePhotoUris(parsed, replacements);
    restored[key] = typeof parsed === "string" ? (rewritten as string) : JSON.stringify(rewritten);
  }
  return restored;
}

export function getPhotoBackupPayload(photos: EmbeddedPhotos): EmbeddedPhotos | undefined {
  return Object.keys(photos).length > 0 ? photos : undefined;
}

export type PhotoBackupJsonValue = JsonValue;
