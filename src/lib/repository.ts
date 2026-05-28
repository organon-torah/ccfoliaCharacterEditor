import type { Character } from "../types/character";

export interface CharacterRepository {
  getCurrent(): Promise<Character | null>;
  saveCurrent(character: Character): Promise<void>;
}

export class MemoryCharacterRepository implements CharacterRepository {
  private current: Character | null = null;

  async getCurrent(): Promise<Character | null> {
    return this.current;
  }

  async saveCurrent(character: Character): Promise<void> {
    this.current = structuredClone(character);
  }
}
