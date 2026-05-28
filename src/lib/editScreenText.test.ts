import { describe, expect, it } from "vitest";
import { parseEditScreenText } from "./editScreenText";

const SAMPLE_EDIT_SCREEN_TEXT = `キャラクター編集

名前
ミネット
イニシアティブ
0
【PL】りん
フロウライト／女／7歳
駒サイズ
4
x
-388
y
153
参照URL
https://charasheet.vampire-blood.net/5249702
立ち絵・差分
発言時にメッセージボックスに表示される画像を設定します。例えば、「＠笑顔」とラベルに設定した場合、発言時に「…@笑顔」のように付け加えることで差分を切り替えます。
ラベル
@通常
ラベル
@発光
ステータス
HPやMPなどのキャラクターに連動して変動するステータスを設定します。{ラベル名}のように発言するとチャットから現在値を参照することができます。
ラベル
HP
現在値
64
最大値
93
ラベル
MP
現在値
70
最大値
179
パラメータ
キャラクターに対してめったに変動しないパラメータを設定します。{ラベル名}のように発言するとチャットから値を参照することができます。
ラベル
器用B
値
2
ラベル
値
ラベル
コンジャラー魔力
値
{コンジャラー}+{知力B}
チャットパレット
1d100 などのダイスコマンドやキャラクターに紐づくチャットコマンドを改行区切りで登録します。
2d6+{コンジャラー魔力}+1　操霊魔法行使

2d6　平目
ステータスを非公開にする
秘匿NPC・敵キャラクターなど

発言時キャラクターを表示しない
駒自体を立ち絵のように見せる場合

盤面キャラクター一覧に表示しない
GM駒などステータス管理が必要ないもの`;

describe("parseEditScreenText", () => {
  it("imports core character fields from copied CCFOLIA edit screen text", () => {
    const character = parseEditScreenText(SAMPLE_EDIT_SCREEN_TEXT);

    expect(character.name).toBe("ミネット");
    expect(character.initiative).toBe(0);
    expect(character.memo).toContain("【PL】りん");
    expect(character.width).toBe(4);
    expect(character.x).toBe(-388);
    expect(character.y).toBe(153);
    expect(character.externalUrl).toBe("https://charasheet.vampire-blood.net/5249702");
  });

  it("imports statuses, params, and commands", () => {
    const character = parseEditScreenText(SAMPLE_EDIT_SCREEN_TEXT);

    expect(character.status).toEqual([
      { label: "HP", value: 64, max: 93 },
      { label: "MP", value: 70, max: 179 }
    ]);
    expect(character.params).toEqual([
      { label: "器用B", value: "2" },
      { label: "", value: "" },
      { label: "コンジャラー魔力", value: "{コンジャラー}+{知力B}" }
    ]);
    expect(character.commands).toBe("2d6+{コンジャラー魔力}+1　操霊魔法行使\n\n2d6　平目");
  });

  it("ignores noisy room text before the character edit screen", () => {
    const noisyCopiedText = `0.8
2
A

0

ルームチャット
GM - 2026/01/05
名前
これはチャットログ側のノイズ
ステータス
HP : 1 → 2
チャットパレット
この行は取り込まない

マイキャラクター一覧

${SAMPLE_EDIT_SCREEN_TEXT}

ナナ
メッセージを入力
Dicebot engine : BCDice@3.16.1`;

    const character = parseEditScreenText(noisyCopiedText);

    expect(character.name).toBe("ミネット");
    expect(character.status).toEqual([
      { label: "HP", value: 64, max: 93 },
      { label: "MP", value: 70, max: 179 }
    ]);
    expect(character.params[0]).toEqual({ label: "器用B", value: "2" });
    expect(character.commands).toBe("2d6+{コンジャラー魔力}+1　操霊魔法行使\n\n2d6　平目");
  });

  it("rejects unrelated pasted text", () => {
    expect(() => parseEditScreenText("名前\nミネット")).toThrow("CCFOLIAのキャラクター編集画面テキスト");
  });
});
