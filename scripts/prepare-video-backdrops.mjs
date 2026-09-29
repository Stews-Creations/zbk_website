import sharp from 'sharp';
// Bake the blur once: video playback never needs a full-screen CSS blur pass.
for (const [map, image] of [['de', 'de-castle'], ['nacht', 'nacht-exterior']]) {
  await sharp(`public/images/${image}-1600.webp`).resize(1280).blur(14).modulate({ brightness: .45, saturation: .7 }).webp({ quality: 75 }).toFile(`public/images/${map}-video-backdrop.webp`);
}
