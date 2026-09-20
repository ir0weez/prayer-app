import { beforeEach, describe, expect, it, vi } from "vitest";

const { fileSystem, manipulateAsync } = vi.hoisted(() => ({
  fileSystem: {
    documentDirectory: "file:///new-app/",
    EncodingType: { Base64: "base64" },
    getInfoAsync: vi.fn(),
    makeDirectoryAsync: vi.fn(),
    writeAsStringAsync: vi.fn(),
  },
  manipulateAsync: vi.fn(),
}));

vi.mock("expo-file-system/legacy", () => fileSystem);
vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync,
}));
vi.mock("react-native", () => ({
  Image: {
    getSize: (_uri: string, success: (width: number, height: number) => void) => success(2400, 1200),
  },
}));

import { createPhotoBackup, getPhotoBackupPayload, restorePhotoBackup } from "./photo-backup";

describe("photo backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileSystem.getInfoAsync.mockResolvedValue({ exists: true });
    manipulateAsync.mockResolvedValue({ base64: "encoded-photo" });
  });

  it("embeds local photos found inside JSON storage and downsizes them", async () => {
    const storage = {
      people: JSON.stringify([{ name: "Alex", photoUri: "file:///old/avatar.png" }]),
      profile: JSON.stringify({ photoUri: "file:///old/avatar.png" }),
    };

    const photos = await createPhotoBackup(storage);

    expect(photos["file:///old/avatar.png"]).toMatchObject({
      originalUri: "file:///old/avatar.png",
      base64: "encoded-photo",
      mimeType: "image/jpeg",
    });
    expect(manipulateAsync).toHaveBeenCalledWith(
      "file:///old/avatar.png",
      [{ resize: { width: 1600, height: 800 } }],
      { compress: 0.8, format: "jpeg", base64: true },
    );
  });

  it("restores embedded photos and rewrites every matching URI", async () => {
    const storage = {
      people: JSON.stringify([
        { photoUri: "file:///old/avatar.png" },
        { photoUri: "file:///old/avatar.png" },
      ]),
    };

    const restored = await restorePhotoBackup(storage, {
      "file:///old/avatar.png": {
        originalUri: "file:///old/avatar.png",
        base64: "encoded-photo",
        mimeType: "image/jpeg",
      },
    });

    const destination = fileSystem.writeAsStringAsync.mock.calls[0][0] as string;
    expect(destination).toMatch(/^file:\/\/\/new-app\/prayercircle-backup-photos\/photo-[0-9a-f]+\.jpg$/);
    expect(fileSystem.writeAsStringAsync).toHaveBeenCalledWith(destination, "encoded-photo", { encoding: "base64" });
    expect(JSON.parse(restored.people as string)).toEqual([
      { photoUri: destination },
      { photoUri: destination },
    ]);
  });

  it("leaves old backups without embedded photos unchanged", async () => {
    const storage = { people: JSON.stringify([{ photoUri: "file:///old/avatar.png" }]) };
    await expect(restorePhotoBackup(storage, undefined)).resolves.toEqual(storage);
    expect(fileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });

  it("omits the photos field when no image could be embedded", () => {
    expect(getPhotoBackupPayload({})).toBeUndefined();
  });
});
