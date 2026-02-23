#!/usr/bin/env node
// Remove light gray/white background from logo - make transparent
const sharp = require("sharp");
const path = require("path");

const input = path.join(__dirname, "../public/logo-vista-lagoa-orig.png");
const output = path.join(__dirname, "../public/logo-vista-lagoa.png");

async function main() {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const threshold = 220; // pixels with R,G,B all above this → transparent
  const tolerance = 30;  // R,G,B must be within this of each other (gray)

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const isLight = r >= threshold && g >= threshold && b >= threshold;
    const isGray = Math.max(r, g, b) - Math.min(r, g, b) <= tolerance;

    if (isLight && isGray) {
      data[i + 3] = 0;
    }
  }

  await sharp(Buffer.from(data), {
    raw: { width, height, channels },
  })
    .png()
    .toFile(output);

  console.log("Logo com fundo transparente salvo em:", output);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
