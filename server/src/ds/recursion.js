/**
 * Kumpulan fungsi rekursif untuk penelusuran pohon wilayah dan pencarian rute alternatif graph.
 *
 * Fungsi di aplikasi:
 *   1. aggregate(): menjumlahkan kapasitas, tempat tidur terisi, dan antrean dari tingkat Unit -> RS -> Kota -> Wilayah.
 *   2. findPath(): mencari jalur hierarki (breadcrumb) dari akar ke simpul tertentu.
 *   3. countNodes() & flatten(): utilitas statistik dan serialisasi pohon.
 *   4. allSimplePaths(): mencari semua jalur sederhana alternatif antar-RS (backtracking rekursif).
 * Alasan dipilih:
 *   Struktur pohon dan eksplorasi cabang rute bersifat rekursif alami sehingga kode ringkas dan mudah dibaca.
 * Kelebihan & keterbatasan:
 *   (+) Sangat jelas untuk struktur bertingkat dan backtracking.
 *   (-) allSimplePaths berpotensi eksponensial pada graph besar, sehingga dibatasi oleh maxHops (default 12).
 */

/**
 * Agregasi postorder rekursif dari daun ke akar.
 * Kompleksitas: O(n) terhadap jumlah simpul pohon.
 */
export function aggregate(node, leafFn, combineFn) {
  if (!node) return null;
  if (!node.children || node.children.length === 0) {
    return leafFn(node);
  }
  const childValues = node.children.map((child) => aggregate(child, leafFn, combineFn));
  return combineFn(childValues, node);
}

/**
 * Mencari jalur dari akar ke simpul dengan id === targetId (untuk breadcrumb).
 * Mengembalikan array TreeNode [root, ..., target] atau [] jika tidak ditemukan.
 * Kompleksitas: O(n).
 */
export function findPath(treeOrNode, targetId) {
  const root = treeOrNode && 'root' in treeOrNode ? treeOrNode.root : treeOrNode;
  if (!root) return [];

  function dfs(curr) {
    if (curr.id === targetId) return [curr];
    for (const child of curr.children || []) {
      const subPath = dfs(child);
      if (subPath.length > 0) {
        return [curr, ...subPath];
      }
    }
    return [];
  }

  return dfs(root);
}

/** Menghitung jumlah simpul secara rekursif. Kompleksitas: O(n). */
export function countNodes(node) {
  if (!node) return 0;
  let total = 1;
  for (const child of node.children || []) {
    total += countNodes(child);
  }
  return total;
}

/** Meratakan pohon menjadi array simpul (preorder rekursif). Kompleksitas: O(n). */
export function flatten(node) {
  if (!node) return [];
  const result = [node];
  for (const child of node.children || []) {
    result.push(...flatten(child));
  }
  return result;
}

/**
 * Mencari semua jalur sederhana (tanpa mengulang simpul) antar dua simpul di Graph
 * menggunakan backtracking rekursif, mengabaikan edge yang ditutup.
 * Dibatasi maxHops (default 12) agar tetap aman dan cepat.
 */
export function allSimplePaths(graph, fromId, toId, maxHops = 12) {
  if (!graph || !graph.hasNode(fromId) || !graph.hasNode(toId)) {
    return [];
  }

  const results = [];
  const visited = new Set([fromId]);
  const currentPath = [fromId];

  function backtrack(currId, hops) {
    if (currId === toId) {
      results.push(currentPath.slice());
      return;
    }
    if (hops >= maxHops) return;

    const adj = graph.neighbors(currId);
    for (const { to } of adj) {
      if (visited.has(to)) continue;
      visited.add(to);
      currentPath.push(to);
      backtrack(to, hops + 1);
      currentPath.pop();
      visited.delete(to);
    }
  }

  backtrack(fromId, 0);
  return results;
}
