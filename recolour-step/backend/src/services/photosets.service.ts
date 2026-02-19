import fs from "node:fs";
import path from "node:path";

const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function isImage(file: string) {
  return imageExts.has(path.extname(file).toLowerCase());
}

function isReferenceImage(file: string) {
  const name = file.toLowerCase();
  return (
    name.includes("block") ||
    name.includes("reference") ||
    name.includes("dots") ||
    name.includes("cloud") ||
    name.includes("dancer")
  );
}

export type Photoset = {
  id: string;
  name: string;
  referenceImage: string | null;
  productPhotos: string[];
};

export function readPhotosets(assetsDir: string): Photoset[] {
  if (!fs.existsSync(assetsDir)) return [];

  const ticketDirs = fs
    .readdirSync(assetsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.toLowerCase().startsWith("ticket"));

  return ticketDirs.map((dir) => {
    const folderPath = path.join(assetsDir, dir.name);
    const files = fs.readdirSync(folderPath);

    let referenceImage: string | null = null;
    const productPhotos: string[] = [];

    for (const file of files) {
      const url = `/assets/${encodeURIComponent(dir.name)}/${encodeURIComponent(file)}`;

      if (!isImage(file)) continue;

      if (isReferenceImage(file)) referenceImage = url;
      else productPhotos.push(url);
    }

    return {
      id: dir.name,
      name: dir.name,
      referenceImage,
      productPhotos: productPhotos.sort(),
    };
  });
}
