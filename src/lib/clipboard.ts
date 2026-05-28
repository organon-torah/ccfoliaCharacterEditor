import type { Character, CharacterClipboardData, CharacterFace, CharacterParam, CharacterStatus } from "../types/character";

const DEFAULT_CHARACTER: Character = {
  name: "",
  memo: "",
  initiative: 0,
  externalUrl: "",
  status: [],
  params: [],
  iconUrl: null,
  faces: [],
  x: 0,
  y: 0,
  angle: 0,
  width: 4,
  height: 4,
  active: true,
  secret: false,
  invisible: false,
  hideStatus: false,
  color: "#888888",
  commands: "",
  owner: null
};

export class ClipboardDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipboardDataError";
  }
}

export function parseClipboardJson(input: string): CharacterClipboardData {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    throw new ClipboardDataError("JSONの構文が正しくありません。");
  }

  if (!isRecord(parsed)) {
    throw new ClipboardDataError("ルートはオブジェクトである必要があります。");
  }

  if (parsed.kind !== "character") {
    throw new ClipboardDataError('kind は "character" である必要があります。');
  }

  if (!isRecord(parsed.data)) {
    throw new ClipboardDataError("data はオブジェクトである必要があります。");
  }

  return {
    ...(parsed as Record<string, unknown>),
    kind: "character",
    data: normalizeCharacterData(parsed.data)
  };
}

export function normalizeCharacterData(data: Partial<Character>): Character {
  return {
    ...DEFAULT_CHARACTER,
    ...data,
    name: toStringValue(data.name, DEFAULT_CHARACTER.name),
    memo: toStringValue(data.memo, DEFAULT_CHARACTER.memo),
    initiative: toNumberValue(data.initiative, DEFAULT_CHARACTER.initiative),
    externalUrl: toStringValue(data.externalUrl, DEFAULT_CHARACTER.externalUrl),
    status: normalizeStatusArray(data.status),
    params: normalizeParamArray(data.params),
    iconUrl: toNullableString(data.iconUrl),
    faces: normalizeFaceArray(data.faces),
    x: toNumberValue(data.x, DEFAULT_CHARACTER.x),
    y: toNumberValue(data.y, DEFAULT_CHARACTER.y),
    angle: toNumberValue(data.angle, DEFAULT_CHARACTER.angle),
    width: toNumberValue(data.width, DEFAULT_CHARACTER.width),
    height: toNumberValue(data.height, DEFAULT_CHARACTER.height),
    active: toBooleanValue(data.active, DEFAULT_CHARACTER.active),
    secret: toBooleanValue(data.secret, DEFAULT_CHARACTER.secret),
    invisible: toBooleanValue(data.invisible, DEFAULT_CHARACTER.invisible),
    hideStatus: toBooleanValue(data.hideStatus, DEFAULT_CHARACTER.hideStatus),
    color: normalizeColor(data.color),
    commands: toStringValue(data.commands, DEFAULT_CHARACTER.commands),
    owner: toNullableString(data.owner)
  };
}

export function serializeClipboardJson(character: Character): string {
  return JSON.stringify(
    {
      kind: "character",
      data: character
    },
    null,
    2
  );
}

export function createEmptyCharacter(): Character {
  return normalizeCharacterData({ name: "新しいキャラクター" });
}

function normalizeStatusArray(value: unknown): CharacterStatus[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      ...record,
      label: toStringValue(record.label, ""),
      value: toNumberValue(record.value, 0),
      max: toNumberValue(record.max, 0)
    };
  });
}

function normalizeParamArray(value: unknown): CharacterParam[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      ...record,
      label: toStringValue(record.label, ""),
      value: toStringValue(record.value, "")
    };
  });
}

function normalizeFaceArray(value: unknown): CharacterFace[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      ...record,
      iconUrl: toNullableString(record.iconUrl),
      label: toStringValue(record.label, "")
    };
  });
}

function normalizeColor(value: unknown): string {
  const color = toStringValue(value, DEFAULT_CHARACTER.color);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_CHARACTER.color;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" ? value : null;
}

function toNumberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toBooleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
