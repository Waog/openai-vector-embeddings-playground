// Deterministic PCA (Principal Component Analysis) projection to 2D, used
// only for the scatter plot visualization. The similarity matrix and
// rankings always use the original high-dimensional embeddings; this module
// is never used for anything except plotting.
//
// Implementation note ("dual PCA" trick):
// Embeddings can have hundreds or thousands of dimensions (d), while the
// number of inputs (n) in this tool is typically small (tens). Computing the
// classic d x d covariance matrix would be expensive (O(n * d^2)). Instead we
// compute the much smaller n x n Gram matrix G = X * X^T (O(n^2 * d)), whose
// eigenvectors/eigenvalues relate directly to the principal components:
//   - G and the covariance matrix share the same non-zero eigenvalues.
//   - If u_k is an eigenvector of G with eigenvalue lambda_k, then the
//     projected coordinate of each sample on principal component k is
//     simply `u_k[i] * sqrt(lambda_k)` — no need to ever build the
//     d-dimensional loading vectors.
// Eigenvectors are found via power iteration with a fixed number of
// iterations and a fixed (non-random) starting vector, so results are
// deterministic and reproducible for the same input embeddings. This is an
// approximation in the sense that power iteration converges rather than
// solving exactly, but with enough iterations it is effectively exact for
// visualization purposes.

export interface Point2D {
  x: number;
  y: number;
}

const POWER_ITERATION_STEPS = 200;

/** Multiply an n x n matrix by an n-vector. */
function matVecMul(matrix: number[][], vector: number[]): number[] {
  const n = matrix.length;
  const result = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    const row = matrix[i];
    for (let j = 0; j < n; j++) {
      sum += row[j] * vector[j];
    }
    result[i] = sum;
  }
  return result;
}

function vectorNorm(vector: number[]): number {
  let sumOfSquares = 0;
  for (const value of vector) sumOfSquares += value * value;
  return Math.sqrt(sumOfSquares);
}

function normalize(vector: number[]): number[] {
  const n = vectorNorm(vector);
  if (n === 0) return vector.slice();
  return vector.map((v) => v / n);
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Find the dominant eigenvector/eigenvalue of a symmetric matrix via power
 * iteration, starting from a fixed deterministic vector so results are
 * reproducible.
 */
function dominantEigenvector(matrix: number[][]): {
  vector: number[];
  eigenvalue: number;
} {
  const n = matrix.length;
  // Deterministic starting vector: alternating small values avoid accidental
  // orthogonality to the true eigenvector (which an all-equal vector like
  // [1,1,...,1] could suffer from in symmetric edge cases).
  let vector = normalize(
    Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : 0.5)),
  );

  for (let step = 0; step < POWER_ITERATION_STEPS; step++) {
    const next = matVecMul(matrix, vector);
    const nextNorm = vectorNorm(next);
    if (nextNorm === 0) {
      // Matrix (or remaining variance) is zero; no meaningful direction left.
      return { vector, eigenvalue: 0 };
    }
    vector = next.map((v) => v / nextNorm);
  }

  // Rayleigh quotient gives the eigenvalue for the converged eigenvector.
  const eigenvalue = dot(vector, matVecMul(matrix, vector));
  return { vector, eigenvalue };
}

/** Subtract the contribution of a known eigenvector from a symmetric matrix. */
function deflate(
  matrix: number[][],
  eigenvector: number[],
  eigenvalue: number,
): number[][] {
  const n = matrix.length;
  const deflated: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      deflated[i][j] =
        matrix[i][j] - eigenvalue * eigenvector[i] * eigenvector[j];
    }
  }
  return deflated;
}

/**
 * Project a set of embeddings down to 2D coordinates (PC1, PC2) using PCA.
 * Requires at least 2 embeddings; callers should show a message instead of
 * calling this when fewer inputs are available.
 */
export function projectTo2D(embeddings: number[][]): Point2D[] {
  const n = embeddings.length;
  if (n < 2) {
    return embeddings.map(() => ({ x: 0, y: 0 }));
  }

  const dimensions = embeddings[0].length;

  // Center the data: subtract the per-dimension mean across all samples.
  const mean = new Array<number>(dimensions).fill(0);
  for (const vector of embeddings) {
    for (let d = 0; d < dimensions; d++) mean[d] += vector[d] / n;
  }
  const centered = embeddings.map((vector) =>
    vector.map((value, d) => value - mean[d]),
  );

  // Gram matrix G[i][j] = dot(centered[i], centered[j]).
  const gram: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const value = dot(centered[i], centered[j]);
      gram[i][j] = value;
      gram[j][i] = value;
    }
  }

  const { vector: u1, eigenvalue: lambda1 } = dominantEigenvector(gram);
  const gramDeflated = deflate(gram, u1, lambda1);
  const { vector: u2, eigenvalue: lambda2 } = dominantEigenvector(gramDeflated);

  const sigma1 = Math.sqrt(Math.max(lambda1, 0));
  const sigma2 = Math.sqrt(Math.max(lambda2, 0));

  return Array.from({ length: n }, (_, i) => ({
    x: u1[i] * sigma1,
    y: u2[i] * sigma2,
  }));
}
