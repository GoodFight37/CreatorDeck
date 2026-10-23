import { describe, expect, it } from "vitest";
import { validateTexts, paintTexts } from "./meme-editor";

const box = { id: "1", text: "Bonjour\nCreatorDeck", x: 50, y: 5, size: 7, color: "#ffffff" };
describe("local meme text", () => {
  it("rejects invalid coordinates, colors and oversized text", () => {
    expect(() => validateTexts([box])).not.toThrow();
    for (const changed of [{ x: NaN }, { y: 101 }, { size: 0 }, { color: "red" }, { text: "x".repeat(2001) }]) {
      expect(() => validateTexts([{ ...box, ...changed }])).toThrow();
    }
    expect(() => validateTexts(Array(21).fill(box))).toThrow();
  });
  it("wraps text and paints an outline on every line without mutating the boxes", () => {
    const calls: string[] = [];
    const context = { measureText: (text: string) => ({ width: text.length * 20 }),
      strokeText: (text: string) => calls.push("outline:" + text), fillText: (text: string) => calls.push(text) };
    const before = JSON.stringify(box);
    paintTexts(context as unknown as CanvasRenderingContext2D, 100, 100, [box]);
    expect(calls.length).toBeGreaterThan(4);
    expect(calls[0]).toContain("outline:");
    expect(JSON.stringify(box)).toBe(before);
  });
  it("keeps an edge-positioned caption inside the image", () => {
    const positions: [number, number][] = [];
    const context = { measureText: () => ({ width: 40 }),
      strokeText: (_text: string, x: number, y: number) => positions.push([x, y]), fillText: () => {} };
    paintTexts(context as unknown as CanvasRenderingContext2D, 100, 100, [{ ...box, text: "Hello", x: 0, y: 100 }]);
    expect(positions[0][0]).toBeGreaterThanOrEqual(20);
    expect(positions[0][1]).toBeLessThan(100);
  });
});
