export type CharacterClipboardData = {
  kind: "character";
  data: Partial<Character>;
};

export type CharacterStatus = {
  label: string;
  value: number;
  max: number;
  [key: string]: unknown;
};

export type CharacterParam = {
  label: string;
  value: string;
  [key: string]: unknown;
};

export type CharacterFace = {
  iconUrl: string | null;
  label: string;
  [key: string]: unknown;
};

export type Character = {
  name: string;
  memo: string;
  initiative: number;
  externalUrl: string;
  status: CharacterStatus[];
  params: CharacterParam[];
  iconUrl: string | null;
  faces: CharacterFace[];
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  active: boolean;
  secret: boolean;
  invisible: boolean;
  hideStatus: boolean;
  color: string;
  commands: string;
  owner: string | null;
  [key: string]: unknown;
};
