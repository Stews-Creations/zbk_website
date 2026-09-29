// Convert supplied Mineways OBJ/MTL files into self-contained, cropped, textured GLBs.
// Read-only inputs; no source model, sidecar or original texture is modified.
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import sharp from 'sharp';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const inputDir = process.argv[2];
const selected = process.argv[3];
if (!inputDir) throw new Error('Usage: node --max-old-space-size=8192 scripts/prepare-models.mjs INPUT_DIRECTORY [de|nacht]');
const crops = JSON.parse(await readFile(new URL('./model-crops.json', import.meta.url), 'utf8'));
await mkdir('public/models', { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

class StreamArray {
  constructor() { this.chunks = []; this.current = new Float32Array(262144); this.offset = 0; this.length = 0; }
  push(...values) { for (const value of values) { if (this.offset === this.current.length) { this.chunks.push(this.current); this.current = new Float32Array(262144); this.offset = 0; } this.current[this.offset++] = value; this.length++; } }
  array() { const out = new Float32Array(this.length); let at = 0; for (const chunk of this.chunks) { out.set(chunk, at); at += chunk.length; } out.set(this.current.subarray(0, this.offset), at); this.chunks = []; this.current = new Float32Array(0); return out; }
}

for (const name of selected ? [selected] : ['nacht', 'de']) {
  const crop = crops[name];
  if (!crop) throw new Error(`Unknown model: ${name}`);
  console.log(`Preparing ${name}: ${crop.description}`);
  const materialSource = await readFile(path.join(inputDir, `${name}.mtl`), 'utf8');
  const materials = new Map(); let current;
  for (const line of materialSource.split(/\r?\n/)) {
    if (line.startsWith('newmtl ')) { current = { name: line.slice(7).trim() }; materials.set(current.name, current); }
    else if (line.startsWith('map_Kd ') && current) current.texture = line.slice(7).trim();
    else if (line.startsWith('map_d ') && current) current.alpha = true;
  }
  const tile = 64, padding = 2, cell = tile + padding * 2;
  const cols = Math.ceil(Math.sqrt(materials.size));
  const atlasSize = 2 ** Math.ceil(Math.log2(cols * cell));
  const composites = []; let tileIndex = 0;
  for (const mat of materials.values()) {
    const x = tileIndex % cols * cell, y = Math.floor(tileIndex / cols) * cell;
    mat.tile = { x: x + padding, y: y + padding };
    if (!mat.texture) throw new Error(`Material ${mat.name} has no diffuse texture.`);
    const texturePath = path.resolve(inputDir, mat.texture);
    const meta = await sharp(texturePath).metadata();
    // Mineways normally exports individual square tiles. Animated strips use frame one.
    let texture = sharp(texturePath);
    if (meta.height > meta.width && meta.height % meta.width === 0) texture = texture.extract({ left: 0, top: 0, width: meta.width, height: meta.width });
    const data = await texture.resize(tile, tile, { kernel: 'nearest' }).ensureAlpha().extend({ top: padding, bottom: padding, left: padding, right: padding, extendWith: 'copy' }).png().toBuffer();
    composites.push({ input: data, left: x, top: y }); tileIndex++;
  }
  const atlas = await sharp({ create: { width: atlasSize, height: atlasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composites).png().toBuffer();
  const doc = new Document();
  doc.getRoot().getAsset().generator = 'ZBK Mineways display-copy pipeline';
  const buffer = doc.createBuffer();
  const texture = doc.createTexture('Minecraft block atlas').setMimeType('image/png').setImage(atlas);
  const material = doc.createMaterial('Minecraft blocks').setBaseColorTexture(texture).setRoughnessFactor(1).setMetallicFactor(0).setDoubleSided(true).setAlphaMode('MASK').setAlphaCutoff(.4);
  material.getBaseColorTextureInfo().setMagFilter(9728).setMinFilter(9986).setWrapS(33071).setWrapT(33071);
  const positions = new StreamArray(), normals = new StreamArray(), texcoords = new StreamArray();
  let vertices, vertexCount = 0, uv = [], normal = [], faces = 0, retainedFaces = 0, excludedFaces = 0, hiddenMaterialFaces = 0;
  const retainedMaterials = new Set();
  const inside = (i) => {
    for (let d = 0; d < 3; d++) if (vertices[i * 3 + d] < crop.min[d] || vertices[i * 3 + d] > crop.max[d]) return false;
    return true;
  };
  const reader = createInterface({ input: createReadStream(path.join(inputDir, `${name}.obj`)), crlfDelay: Infinity });
  for await (const line of reader) {
    if (line.startsWith('# ') && line.includes(' vertices,')) {
      vertices = new Float32Array(Number(line.match(/^# (\d+) vertices,/)[1]) * 3);
    } else if (line.startsWith('v ')) {
      const values = line.slice(2).trim().split(/\s+/);
      if (!vertices) throw new Error('Expected a Mineways vertex-count header.');
      vertices[vertexCount * 3] = +values[0]; vertices[vertexCount * 3 + 1] = +values[1]; vertices[vertexCount * 3 + 2] = +values[2]; vertexCount++;
    } else if (line.startsWith('vt ')) {
      const values = line.slice(3).trim().split(/\s+/); uv.push([+values[0], +values[1]]);
    } else if (line.startsWith('vn ')) {
      normal.push(line.slice(3).trim().split(/\s+/).map(Number));
    } else if (line.startsWith('usemtl ')) current = materials.get(line.slice(7).trim());
    else if (line.startsWith('f ')) {
      faces++;
      const tokens = line.slice(2).trim().split(/\s+/);
      const indices = tokens.map(token => Number(token.split('/')[0]) - 1);
      if (!indices.every(inside)) continue;
      if (!current) throw new Error('Face has no material.');
      if ((crop.hiddenMaterials || []).includes(current.name)) { hiddenMaterialFaces++; continue; }
      if ((crop.exclude || []).some(rule => (rule.material === '*' || current.name === rule.material) && indices.every(i => [0, 1, 2].every(d => vertices[i * 3 + d] >= rule.min[d] && vertices[i * 3 + d] <= rule.max[d])))) { excludedFaces++; continue; }
      retainedFaces++;
      retainedMaterials.add(current.name);
      const corners = tokens.map(token => token.split('/').map(value => Number(value) - 1));
      for (let corner = 1; corner < corners.length - 1; corner++) {
        for (const [v, t, n] of [corners[0], corners[corner], corners[corner + 1]]) {
          positions.push(vertices[v * 3], vertices[v * 3 + 1], vertices[v * 3 + 2]);
          normals.push(...normal[n]);
          const coords = uv[t];
          if (coords[0] < -.001 || coords[0] > 1.001 || coords[1] < -.001 || coords[1] > 1.001) throw new Error('UV repeats beyond one tile; atlas needs repeat splitting.');
          texcoords.push((current.tile.x + coords[0] * tile) / atlasSize, (current.tile.y + (1 - coords[1]) * tile) / atlasSize);
        }
      }
    }
  }
  // Mineways omits surfaces touching solid blocks. Restore explicitly identified
  // roof contact faces after removing temporary pillars from this display copy.
  const surfacePatches = crop.surfacePatches || [];
  for (const patch of surfacePatches) {
    const mat = materials.get(patch.material);
    if (!mat || patch.corners.length !== 4 || patch.uv.length !== 4) throw new Error('Invalid surface patch');
    for (const corner of [0, 1, 2, 0, 2, 3]) {
      positions.push(...patch.corners[corner]);
      normals.push(...patch.normal);
      texcoords.push((mat.tile.x + patch.uv[corner][0] * tile) / atlasSize, (mat.tile.y + (1 - patch.uv[corner][1]) * tile) / atlasSize);
    }
    retainedMaterials.add(patch.material);
  }
  console.log(`${name}: kept ${retainedFaces.toLocaleString()} / ${faces.toLocaleString()} faces; restored ${surfacePatches.length} contact surfaces.`);
  const triangles = positions.length / 9;
  const prim = doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(positions.array()).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals.array()).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(texcoords.array()).setBuffer(buffer));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  const node = doc.createNode(name).setMesh(mesh);
  doc.createScene(name).addChild(node);
  vertices = null; uv = null; normal = null;
  await doc.transform(weld(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 16, quantizeTexcoord: 16 }));
  await io.write(`public/models/${name}.glb`, doc);
  const bytes = (await stat(`public/models/${name}.glb`)).size;
  if ((crop.hiddenMaterials || []).some(material => retainedMaterials.has(material))) throw new Error('Hidden resource-pack material remained in the display model.');
  const report = { model: name, inputVertices: vertexCount, inputFaces: faces, retainedFaces, excludedFaces, hiddenMaterialFaces, restoredSurfaceFaces: surfacePatches.length, triangles, bytes, crop, atlasSize, materials: materials.size, drawCalls: 1, sourcePreserved: true };
  await writeFile(`public/models/${name}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`${name}: ${(bytes / 1048576).toFixed(2)} MB GLB; ${triangles.toLocaleString()} triangles; one material/draw call.`);
}
