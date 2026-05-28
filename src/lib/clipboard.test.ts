import { describe, expect, it } from "vitest";
import { createEmptyCharacter, parseClipboardJson, serializeClipboardJson } from "./clipboard";

describe("clipboard helpers", () => {
  it("parses the minimum CCFOLIA character JSON", () => {
    const parsed = parseClipboardJson('{ "kind": "character", "data": { "name": "Chicken" } }');

    expect(parsed.kind).toBe("character");
    expect(parsed.data.name).toBe("Chicken");
    expect(parsed.data.status).toEqual([]);
  });

  it("preserves unknown character fields while normalizing known fields", () => {
    const parsed = parseClipboardJson(
      JSON.stringify({
        kind: "character",
        data: {
          name: "Investigator",
          extraField: "kept",
          status: [{ label: "HP", value: 10, max: 12, note: "temporary" }],
          params: [{ label: "SAN", value: "55" }],
          faces: [{ label: "angry", iconUrl: "https://example.com/angry.png" }]
        }
      })
    );

    expect(parsed.data.extraField).toBe("kept");
    expect(parsed.data.status?.[0].note).toBe("temporary");
    expect(parsed.data.params?.[0].value).toBe("55");
    expect(parsed.data.faces?.[0].label).toBe("angry");
  });

  it("rejects invalid JSON and unsupported clipboard kinds", () => {
    expect(() => parseClipboardJson("{")).toThrow("JSONの構文");
    expect(() => parseClipboardJson(JSON.stringify({ kind: "item", data: {} }))).toThrow('kind は "character"');
  });

  it("serializes a character as CCFOLIA clipboard data", () => {
    const character = createEmptyCharacter();
    character.name = "Serialized";

    expect(JSON.parse(serializeClipboardJson(character))).toEqual({
      kind: "character",
      data: expect.objectContaining({ name: "Serialized" })
    });
  });
});
