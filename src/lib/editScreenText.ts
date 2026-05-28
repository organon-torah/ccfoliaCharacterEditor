import { normalizeCharacterData } from "./clipboard";
import type { Character, CharacterParam, CharacterStatus } from "../types/character";

const SECTION_TITLES = new Set([
  "立ち絵・差分",
  "ステータス",
  "パラメータ",
  "チャットパレット",
  "ステータスを非公開にする",
  "秘匿NPC・敵キャラクターなど",
  "発言時キャラクターを表示しない",
  "盤面キャラクター一覧に表示しない"
]);

const STATUS_HELP_TEXT = "HPやMPなどのキャラクターに連動して変動するステータスを設定します。";
const PARAM_HELP_TEXT = "キャラクターに対してめったに変動しないパラメータを設定します。";
const COMMAND_HELP_TEXT = "1d100 などのダイスコマンドやキャラクターに紐づくチャットコマンドを改行区切りで登録します。";

export class EditScreenTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditScreenTextError";
  }
}

export function parseEditScreenText(input: string): Character {
  const rawLines = input.replace(/\r\n?/g, "\n").split("\n");
  const allLines = rawLines.map((line) => line.trim());
  const lines = extractEditScreenLines(allLines);

  if (lines.length === 0) {
    throw new EditScreenTextError("CCFOLIAのキャラクター編集画面テキストとして読み取れませんでした。");
  }

  const statusStart = findLine(lines, "ステータス");
  const paramStart = findLine(lines, "パラメータ");
  const commandStart = findLine(lines, "チャットパレット");

  const data: Partial<Character> = {
    name: readAfter(lines, "名前") ?? "",
    initiative: toNumber(readAfter(lines, "イニシアティブ"), 0),
    memo: parseMemo(lines),
    width: toNumber(readAfter(lines, "駒サイズ"), 4),
    x: toNumber(readAfter(lines, "x"), 0),
    y: toNumber(readAfter(lines, "y"), 0),
    externalUrl: readAfter(lines, "参照URL") ?? "",
    status: parseStatuses(sliceBetween(lines, statusStart, paramStart)),
    params: parseParams(sliceBetween(lines, paramStart, commandStart)),
    commands: parseCommands(lines, commandStart)
  };

  return normalizeCharacterData(data);
}

function extractEditScreenLines(lines: string[]): string[] {
  const editScreenStart = findLastLine(lines, "キャラクター編集");

  if (editScreenStart < 0) {
    return [];
  }

  return lines.slice(editScreenStart);
}

function parseMemo(lines: string[]): string {
  const initiativeIndex = findLine(lines, "イニシアティブ");
  const widthIndex = findLine(lines, "駒サイズ");

  if (initiativeIndex < 0 || widthIndex < 0 || initiativeIndex + 2 >= widthIndex) {
    return "";
  }

  return lines.slice(initiativeIndex + 2, widthIndex).join("\n").trim();
}

function parseStatuses(lines: string[]): CharacterStatus[] {
  const sectionLines = compactSectionLines(lines, STATUS_HELP_TEXT);
  const statuses: CharacterStatus[] = [];
  let index = 0;

  while (index < sectionLines.length) {
    if (sectionLines[index] !== "ラベル") {
      index += 1;
      continue;
    }

    const label = sectionLines[index + 1] ?? "";
    const currentIndex = findNext(sectionLines, "現在値", index + 2);
    const maxIndex = findNext(sectionLines, "最大値", currentIndex + 1);

    if (currentIndex < 0 || maxIndex < 0) {
      break;
    }

    statuses.push({
      label,
      value: toNumber(sectionLines[currentIndex + 1], 0),
      max: toNumber(sectionLines[maxIndex + 1], 0)
    });
    index = maxIndex + 2;
  }

  return statuses;
}

function parseParams(lines: string[]): CharacterParam[] {
  const sectionLines = compactSectionLines(lines, PARAM_HELP_TEXT);
  const params: CharacterParam[] = [];
  let index = 0;

  while (index < sectionLines.length) {
    if (sectionLines[index] !== "ラベル") {
      index += 1;
      continue;
    }

    const labelCandidate = sectionLines[index + 1] ?? "";
    const label = labelCandidate === "値" ? "" : labelCandidate;
    const valueMarkerStart = labelCandidate === "値" ? index + 1 : index + 2;
    const valueIndex = findNext(sectionLines, "値", valueMarkerStart);

    if (valueIndex < 0) {
      break;
    }

    const valueCandidate = sectionLines[valueIndex + 1] ?? "";
    const value = valueCandidate === "ラベル" ? "" : valueCandidate;
    params.push({ label, value });
    index = valueCandidate === "ラベル" ? valueIndex + 1 : valueIndex + 2;
  }

  return params;
}

function parseCommands(lines: string[], commandStart: number): string {
  if (commandStart < 0) {
    return "";
  }

  const end = firstExistingIndex(lines, commandStart + 1, [
    "ステータスを非公開にする",
    "秘匿NPC・敵キャラクターなど",
    "発言時キャラクターを表示しない",
    "盤面キャラクター一覧に表示しない"
  ]);
  const commandLines = lines.slice(commandStart + 1, end < 0 ? lines.length : end);

  return commandLines
    .filter((line, index) => !(index === 0 && line === COMMAND_HELP_TEXT))
    .join("\n")
    .trim();
}

function compactSectionLines(lines: string[], helpText: string): string[] {
  return lines.filter((line) => line !== "" && line !== helpText && !SECTION_TITLES.has(line));
}

function sliceBetween(lines: string[], start: number, end: number): string[] {
  if (start < 0) {
    return [];
  }

  return lines.slice(start + 1, end < 0 ? lines.length : end);
}

function readAfter(lines: string[], label: string): string | undefined {
  const index = findLine(lines, label);
  return index >= 0 ? lines[index + 1] : undefined;
}

function findLine(lines: string[], label: string): number {
  return lines.findIndex((line) => line === label);
}

function findLastLine(lines: string[], label: string): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index] === label) {
      return index;
    }
  }

  return -1;
}

function findNext(lines: string[], label: string, start: number): number {
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index] === label) {
      return index;
    }
  }

  return -1;
}

function firstExistingIndex(lines: string[], start: number, labels: string[]): number {
  const indexes = labels.map((label) => findNext(lines, label, start)).filter((index) => index >= 0);
  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function toNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
