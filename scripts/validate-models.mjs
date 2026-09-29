import { readFile, stat } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const name of ['de', 'nacht']) {
  const file = `public/models/${name}.glb`;
  const report = JSON.parse(await readFile(`public/models/${name}.json`, 'utf8'));
  const doc = await io.read(file);
  const root = doc.getRoot();
  if (root.listTextures().length !== 1 || !root.listTextures()[0].getImage()?.length) throw new Error(`${name}: missing embedded texture atlas`);
  let triangles = 0;
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
    triangles += prim.getIndices().getCount() / 3;
    for (const attribute of prim.listAttributes()) for (const value of attribute.getArray()) if (!Number.isFinite(value)) throw new Error(`${name}: invalid geometry`);
  }
  if (triangles !== report.triangles) throw new Error(`${name}: geometry/report mismatch`);
  if ((await stat(file)).size !== report.bytes) throw new Error(`${name}: file size/report mismatch`);
  if (!report.hiddenMaterialFaces) throw new Error(`${name}: expected invisible glass removal`);
  const patches = report.crop.surfacePatches || [];
  if ((report.restoredSurfaceFaces || 0) !== patches.length) throw new Error(`${name}: missing restored roof surfaces`);
  if (triangles !== (report.retainedFaces + patches.length) * 2) throw new Error(`${name}: expected source quads plus restored surfaces`);
  for (const patch of patches) {
    if (patch.corners.length !== 4 || patch.uv.length !== 4 || [...patch.corners.flat(), ...patch.uv.flat(), ...patch.normal].some(value => !Number.isFinite(value))) throw new Error(`${name}: invalid roof patch`);
    const [a, b, c] = patch.corners;
    const u = b.map((v, i) => v - a[i]), v = c.map((p, i) => p - a[i]);
    const cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    if (cross.reduce((sum, component, i) => sum + component * patch.normal[i], 0) <= 0) throw new Error(`${name}: roof patch winding disagrees with normal`);
  }
  if (report.bytes > 15 * 1024 * 1024) throw new Error(`${name}: exceeds the 15 MB per-model delivery budget`);
  console.log(`Passed ${name}: decoded ${triangles.toLocaleString()} triangles, embedded atlas, ${report.hiddenMaterialFaces} invisible-glass faces removed.`);
}
