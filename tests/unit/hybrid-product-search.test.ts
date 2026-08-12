import { describe, expect, it } from "vitest";
import {
  combineHybridScore,
  cosineSimilarity,
  isHybridHit,
  lexicalMatchScore,
  orderProductsByRankedIds,
  parseEmbeddingVector,
  rankHybridCandidates,
} from "@/features/catalog/domain/hybrid-product-search";

describe("cosineSimilarity", () => {
  it("liefert 1 für identische Vektoren", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("liefert 0 für orthogonale Vektoren", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("liefert 0 bei Längenmismatch oder leeren Vektoren", () => {
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity([], [1])).toBe(0);
  });
});

describe("parseEmbeddingVector", () => {
  it("parst gültige Float-Arrays", () => {
    expect(parseEmbeddingVector([0.1, -0.2, 0])).toEqual([0.1, -0.2, 0]);
  });

  it("lehnt ungültige Werte ab", () => {
    expect(parseEmbeddingVector(null)).toBeNull();
    expect(parseEmbeddingVector([1, "x"])).toBeNull();
    expect(parseEmbeddingVector([Number.NaN])).toBeNull();
  });
});

describe("lexicalMatchScore", () => {
  const product = {
    id: "p1",
    title: "Katzenhöhle Premium",
    slug: "katzenhoehle-premium",
    subtitle: "Mit Sisal",
  };

  it("bewertet Titel-Treffer höher als Dokumenttext", () => {
    const titleHit = lexicalMatchScore(product, "höhle");
    const docHit = lexicalMatchScore(product, "kratzen", "Ideal zum Kratzen und Ruhen");
    expect(titleHit).toBeGreaterThan(docHit);
    expect(docHit).toBeGreaterThan(0);
  });

  it("gibt 0 ohne Treffer", () => {
    expect(lexicalMatchScore(product, "baumhaus")).toBe(0);
  });
});

describe("combineHybridScore / isHybridHit", () => {
  it("kombiniert gewichtet und boostet Doppel-Signale", () => {
    const both = combineHybridScore(0.85, 0.5);
    const onlyLex = combineHybridScore(0.85, 0);
    expect(both).toBeGreaterThan(onlyLex);
  });

  it("erkennt semantische Treffer ohne Lexik", () => {
    expect(
      isHybridHit({ lexicalScore: 0, semanticScore: 0.4, hybridScore: 0.25 }),
    ).toBe(true);
    expect(
      isHybridHit({ lexicalScore: 0, semanticScore: 0.1, hybridScore: 0.05 }),
    ).toBe(false);
  });
});

describe("rankHybridCandidates", () => {
  const products = [
    {
      id: "nest",
      title: "Kuschelhöhle",
      slug: "kuschelhoehle",
      subtitle: null as string | null,
    },
    {
      id: "kratz",
      title: "Kratztonne",
      slug: "kratztonne",
      subtitle: "Sisal",
    },
    {
      id: "liege",
      title: "Fensterliege",
      slug: "fensterliege",
      subtitle: null as string | null,
    },
  ];

  const nestVec = [1, 0, 0];
  const kratzVec = [0, 1, 0];
  const liegeVec = [0.2, 0.2, 0.96];
  const embeddingsByProductId = new Map([
    ["nest", nestVec],
    ["kratz", kratzVec],
    ["liege", liegeVec],
  ]);

  it("rankt semantische Synonyme ohne Lexik-Treffer nach vorn", () => {
    // Query-Embedding nahe an „nest“ (Kuschelhöhle) — Query „Schlafplatz Katze“ trifft Titel nicht
    const queryEmbedding = [0.98, 0.05, 0.02];
    const { mode, ranked } = rankHybridCandidates({
      products,
      query: "Schlafplatz Katze",
      embeddingsByProductId,
      queryEmbedding,
      minSemantic: 0.5,
      minHybrid: 0.15,
    });

    expect(mode).toBe("hybrid");
    expect(ranked[0]?.productId).toBe("nest");
    expect(ranked.some((r) => r.productId === "nest" && r.semanticHit)).toBe(true);
    expect(ranked.every((r) => r.productId !== "kratz" || r.semanticScore < 0.5)).toBe(true);
  });

  it("bevorzugt starke Lexik-Treffer gegenüber schwacher Semantik", () => {
    const queryEmbedding = [0.1, 0.95, 0.1]; // nah an kratz
    const { ranked } = rankHybridCandidates({
      products,
      query: "Fensterliege",
      embeddingsByProductId,
      queryEmbedding,
    });

    expect(ranked[0]?.productId).toBe("liege");
    expect(ranked[0]?.lexicalHit).toBe(true);
  });

  it("fällt ohne Query-Embedding auf lexikalisches Ranking zurück", () => {
    const { mode, ranked } = rankHybridCandidates({
      products,
      query: "kratz",
      embeddingsByProductId,
      queryEmbedding: null,
    });

    expect(mode).toBe("lexical_fallback");
    expect(ranked.map((r) => r.productId)).toEqual(["kratz"]);
    expect(ranked[0]?.semanticScore).toBe(0);
  });

  it("ordnet Produkte stabil nach Rank-IDs", () => {
    const ordered = orderProductsByRankedIds(products, ["liege", "nest", "missing"]);
    expect(ordered.map((p) => p.id)).toEqual(["liege", "nest"]);
  });
});
