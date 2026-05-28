import { useMemo, useState } from "react";
import { createEmptyCharacter, parseClipboardJson, serializeClipboardJson } from "./lib/clipboard";
import type { Character, CharacterFace, CharacterParam, CharacterStatus } from "./types/character";

const SAMPLE_JSON = JSON.stringify({ kind: "character", data: { name: "Chicken" } }, null, 2);

type CopyState = "idle" | "success" | "error";

export function App() {
  const [inputJson, setInputJson] = useState(SAMPLE_JSON);
  const [character, setCharacter] = useState<Character>(() => createEmptyCharacter());
  const [parseMessage, setParseMessage] = useState("サンプルJSONを読み込めます。");
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const outputJson = useMemo(() => serializeClipboardJson(character), [character]);

  function loadJson() {
    try {
      const parsed = parseClipboardJson(inputJson);
      setCharacter(parsed.data as Character);
      setParseMessage("JSONを読み込みました。");
      setCopyState("idle");
    } catch (error) {
      setParseMessage(error instanceof Error ? error.message : "JSONを読み込めませんでした。");
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(outputJson);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }

  function updateField<K extends keyof Character>(key: K, value: Character[K]) {
    setCharacter((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">CCFOLIA Clipboard API</p>
          <h1>Character Editor</h1>
        </div>
        <a className="doc-link" href="https://docs.ccfolia.com/developer-api/clipboard-api" target="_blank" rel="noreferrer">
          公式仕様
        </a>
      </header>

      <div className="workspace">
        <section className="io-pane" aria-label="JSON入出力">
          <div className="panel-block">
            <div className="section-heading">
              <h2>入力JSON</h2>
              <button type="button" onClick={loadJson}>
                読み込む
              </button>
            </div>
            <textarea
              className="code-area"
              value={inputJson}
              onChange={(event) => setInputJson(event.target.value)}
              spellCheck={false}
              aria-label="入力JSON"
            />
            <p className={parseMessage.includes("必要") || parseMessage.includes("正しく") ? "message error" : "message"}>
              {parseMessage}
            </p>
          </div>

          <div className="panel-block output-block">
            <div className="section-heading">
              <h2>出力JSON</h2>
              <button type="button" onClick={copyOutput}>
                コピー
              </button>
            </div>
            <textarea className="code-area output" value={outputJson} readOnly spellCheck={false} aria-label="出力JSON" />
            {copyState === "success" && <p className="message success">クリップボードにコピーしました。</p>}
            {copyState === "error" && <p className="message error">コピーに失敗しました。出力JSONを手動でコピーしてください。</p>}
          </div>
        </section>

        <CharacterForm character={character} updateField={updateField} />
      </div>
    </main>
  );
}

type CharacterFormProps = {
  character: Character;
  updateField: <K extends keyof Character>(key: K, value: Character[K]) => void;
};

function CharacterForm({ character, updateField }: CharacterFormProps) {
  return (
    <section className="form-pane" aria-label="キャラクター編集フォーム">
      <div className="form-grid">
        <TextField label="名前" value={character.name} onChange={(value) => updateField("name", value)} />
        <NumberField label="イニシアティブ" value={character.initiative} onChange={(value) => updateField("initiative", value)} />
        <TextField label="外部URL" value={character.externalUrl} onChange={(value) => updateField("externalUrl", value)} />
        <TextField label="オーナー" value={character.owner ?? ""} onChange={(value) => updateField("owner", value || null)} />
        <label className="field">
          <span>色</span>
          <input type="color" value={character.color} onChange={(event) => updateField("color", event.target.value)} />
        </label>
      </div>

      <label className="field full">
        <span>メモ</span>
        <textarea value={character.memo} onChange={(event) => updateField("memo", event.target.value)} />
      </label>

      <Notice />

      <div className="form-grid compact">
        <TextField label="アイコンURL" value={character.iconUrl ?? ""} onChange={(value) => updateField("iconUrl", value || null)} />
        <NumberField label="X" value={character.x} onChange={(value) => updateField("x", value)} />
        <NumberField label="Y" value={character.y} onChange={(value) => updateField("y", value)} />
        <NumberField label="角度" value={character.angle} onChange={(value) => updateField("angle", value)} />
        <NumberField label="幅" value={character.width} onChange={(value) => updateField("width", value)} />
        <NumberField label="高さ" value={character.height} onChange={(value) => updateField("height", value)} />
      </div>

      <div className="toggles">
        <CheckboxField label="アクティブ" checked={character.active} onChange={(value) => updateField("active", value)} />
        <CheckboxField label="秘匿" checked={character.secret} onChange={(value) => updateField("secret", value)} />
        <CheckboxField label="非表示" checked={character.invisible} onChange={(value) => updateField("invisible", value)} />
        <CheckboxField label="ステータス非公開" checked={character.hideStatus} onChange={(value) => updateField("hideStatus", value)} />
      </div>

      <StatusEditor items={character.status} onChange={(items) => updateField("status", items)} />
      <ParamEditor items={character.params} onChange={(items) => updateField("params", items)} />
      <FaceEditor items={character.faces} onChange={(items) => updateField("faces", items)} />

      <label className="field full">
        <span>チャットパレット</span>
        <textarea className="commands-area" value={character.commands} onChange={(event) => updateField("commands", event.target.value)} />
      </label>
    </section>
  );
}

function Notice() {
  return (
    <div className="notice">
      CCFOLIA側の仕様により、iconUrl / faces[].iconUrl は外部データとして設定できません。x / y / active は既定値が優先されます。
    </div>
  );
}

function StatusEditor({ items, onChange }: { items: CharacterStatus[]; onChange: (items: CharacterStatus[]) => void }) {
  return (
    <ArraySection title="ステータス" onAdd={() => onChange([...items, { label: "", value: 0, max: 0 }])}>
      {items.map((item, index) => (
        <div className="array-row" key={index}>
          <TextField label="ラベル" value={item.label} onChange={(value) => updateArrayItem(items, onChange, index, { ...item, label: value })} />
          <NumberField label="現在値" value={item.value} onChange={(value) => updateArrayItem(items, onChange, index, { ...item, value })} />
          <NumberField label="最大値" value={item.max} onChange={(value) => updateArrayItem(items, onChange, index, { ...item, max: value })} />
          <RowActions index={index} length={items.length} onChange={(nextIndex) => onChange(moveItem(items, index, nextIndex))} onRemove={() => onChange(removeItem(items, index))} />
        </div>
      ))}
    </ArraySection>
  );
}

function ParamEditor({ items, onChange }: { items: CharacterParam[]; onChange: (items: CharacterParam[]) => void }) {
  return (
    <ArraySection title="パラメータ" onAdd={() => onChange([...items, { label: "", value: "" }])}>
      {items.map((item, index) => (
        <div className="array-row two-col" key={index}>
          <TextField label="ラベル" value={item.label} onChange={(value) => updateArrayItem(items, onChange, index, { ...item, label: value })} />
          <TextField label="値" value={item.value} onChange={(value) => updateArrayItem(items, onChange, index, { ...item, value })} />
          <RowActions index={index} length={items.length} onChange={(nextIndex) => onChange(moveItem(items, index, nextIndex))} onRemove={() => onChange(removeItem(items, index))} />
        </div>
      ))}
    </ArraySection>
  );
}

function FaceEditor({ items, onChange }: { items: CharacterFace[]; onChange: (items: CharacterFace[]) => void }) {
  return (
    <ArraySection title="差分表情" onAdd={() => onChange([...items, { label: "", iconUrl: null }])}>
      {items.map((item, index) => (
        <div className="array-row two-col" key={index}>
          <TextField label="ラベル" value={item.label} onChange={(value) => updateArrayItem(items, onChange, index, { ...item, label: value })} />
          <TextField label="アイコンURL" value={item.iconUrl ?? ""} onChange={(value) => updateArrayItem(items, onChange, index, { ...item, iconUrl: value || null })} />
          <RowActions index={index} length={items.length} onChange={(nextIndex) => onChange(moveItem(items, index, nextIndex))} onRemove={() => onChange(removeItem(items, index))} />
        </div>
      ))}
    </ArraySection>
  );
}

function ArraySection({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <section className="array-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <button type="button" onClick={onAdd}>
          追加
        </button>
      </div>
      <div className="array-list">{children}</div>
    </section>
  );
}

function RowActions({ index, length, onChange, onRemove }: { index: number; length: number; onChange: (nextIndex: number) => void; onRemove: () => void }) {
  return (
    <div className="row-actions">
      <button type="button" onClick={() => onChange(index - 1)} disabled={index === 0} aria-label="上へ移動">
        ↑
      </button>
      <button type="button" onClick={() => onChange(index + 1)} disabled={index === length - 1} aria-label="下へ移動">
        ↓
      </button>
      <button type="button" onClick={onRemove}>
        削除
      </button>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function updateArrayItem<T>(items: T[], onChange: (items: T[]) => void, index: number, item: T) {
  onChange(items.map((current, currentIndex) => (currentIndex === index ? item : current)));
}

function removeItem<T>(items: T[], index: number): T[] {
  return items.filter((_, currentIndex) => currentIndex !== index);
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
