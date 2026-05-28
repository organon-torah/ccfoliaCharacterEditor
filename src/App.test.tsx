import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("loads the sample JSON and reflects edits in the output", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("入力JSON"), {
      target: {
        value: JSON.stringify({ kind: "character", data: { name: "Chicken" } })
      }
    });
    await user.click(getJsonLoadButton());
    await user.click(screen.getByRole("button", { name: "すべて選択" }));
    await user.click(screen.getByRole("button", { name: "すべて上書き" }));
    await user.clear(screen.getByLabelText("名前"));
    await user.type(screen.getByLabelText("名前"), "Chicken Prime");

    expect(getOutputValue()).toContain('"name": "Chicken Prime"');
  });

  it("starts with an empty JSON input and shows a placeholder example", () => {
    render(<App />);

    expect(screen.getByLabelText("入力JSON")).toHaveValue("");
    expect(screen.getByPlaceholderText(/SampleName/)).toBeInTheDocument();
  });

  it("resets the current character from the output area", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("名前"));
    await user.type(screen.getByLabelText("名前"), "Changed");
    await user.click(screen.getByRole("button", { name: "リセット" }));

    expect(screen.getByRole("dialog", { name: "リセットしますか？" })).toBeInTheDocument();
    expect(screen.getByLabelText("名前")).toHaveValue("Changed");
    await user.click(screen.getByRole("button", { name: "リセットする" }));

    expect(screen.getByLabelText("名前")).toHaveValue("新しいキャラクター");
    expect(getOutputValue()).toContain('"name": "新しいキャラクター"');
    expect(screen.queryByRole("dialog", { name: "リセットしますか？" })).not.toBeInTheDocument();
  });

  it("reviews import differences before applying selected fields", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("名前"));
    await user.type(screen.getByLabelText("名前"), "Current");
    await user.clear(screen.getByLabelText("入力JSON"));
    fireEvent.change(screen.getByLabelText("入力JSON"), {
      target: {
        value: JSON.stringify({
          kind: "character",
          data: {
            name: "Imported",
            memo: "Imported memo"
          }
        })
      }
    });
    await user.click(getJsonLoadButton());

    expect(screen.getByRole("dialog", { name: "差分を確認" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "名前" })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "名前" }));
    await user.click(screen.getByRole("button", { name: "選択項目を上書き" }));

    expect(screen.getByLabelText("名前")).toHaveValue("Imported");
    expect(screen.getByLabelText("メモ")).toHaveValue("");
  });

  it("does not overwrite color when imported JSON omits color", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("色"), { target: { value: "#123456" } });
    fireEvent.change(screen.getByLabelText("入力JSON"), {
      target: {
        value: JSON.stringify({
          kind: "character",
          data: {
            name: "Imported without color"
          }
        })
      }
    });
    await user.click(getJsonLoadButton());

    expect(screen.getByRole("dialog", { name: "差分を確認" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "色" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "すべて上書き" }));

    expect(screen.getByLabelText("色")).toHaveValue("#123456");
  });

  it("reviews status and params as individual differences", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "追加" })[0]);
    await user.type(screen.getAllByLabelText("ラベル")[0], "HP");
    await user.clear(screen.getByLabelText("現在値"));
    await user.type(screen.getByLabelText("現在値"), "8");
    await user.clear(screen.getByLabelText("最大値"));
    await user.type(screen.getByLabelText("最大値"), "20");
    fireEvent.change(screen.getByLabelText("入力JSON"), {
      target: {
        value: JSON.stringify({
          kind: "character",
          data: {
            status: [
              { label: "HP", value: 12, max: 20 },
              { label: "MP", value: 5, max: 9 }
            ],
            params: [{ label: "器用B", value: "2" }],
            commands: "2d6"
          }
        })
      }
    });
    await user.click(getJsonLoadButton());

    expect(screen.getByRole("checkbox", { name: "ステータス: HP" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "ステータス: MP" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "パラメータ: 器用B" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "チャットパレット" })).not.toBeChecked();
    const statusGroup = screen.getByLabelText("ステータス");
    const paramGroup = screen.getByLabelText("パラメータ");
    const commandRow = screen.getByRole("checkbox", { name: "チャットパレット" }).closest(".diff-row");
    expect(Boolean(statusGroup.compareDocumentPosition(paramGroup) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(paramGroup.compareDocumentPosition(commandRow as Element) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
    const hpDiff = screen.getByRole("checkbox", { name: "ステータス: HP" }).closest(".diff-row") as HTMLElement;
    expect(within(hpDiff).getByText("12")).toHaveClass("diff-changed");
    expect(within(hpDiff).getAllByText("20")[0]).not.toHaveClass("diff-changed");
    await user.click(screen.getByRole("checkbox", { name: "ステータス: MP" }));
    await user.click(screen.getByRole("button", { name: "選択項目を上書き" }));

    expect(getOutputValue()).toContain('"label": "HP"');
    expect(getOutputValue()).toContain('"value": 8');
    expect(getOutputValue()).toContain('"label": "MP"');
    expect(getOutputValue()).toContain('"value": 5');
    expect(getOutputValue()).not.toContain('"label": "器用B"');
  });

  it("can apply all import differences at once", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("入力JSON"), {
      target: {
        value: JSON.stringify({
          kind: "character",
          data: {
            name: "Imported all",
            memo: "All memo"
          }
        })
      }
    });
    await user.click(getJsonLoadButton());
    await user.click(screen.getByRole("button", { name: "すべて上書き" }));

    expect(screen.getByLabelText("名前")).toHaveValue("Imported all");
    expect(screen.getByLabelText("メモ")).toHaveValue("All memo");
  });

  it("shows a notice dialog when an import has no differences", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("入力JSON"), {
      target: {
        value: getOutputValue()
      }
    });
    await user.click(getJsonLoadButton());

    const dialog = screen.getByRole("dialog", { name: "差分はありません" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("JSONに現在のデータとの差分はありません。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog", { name: "差分はありません" })).not.toBeInTheDocument();
  });

  it("shows a validation message for invalid JSON", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("入力JSON"));
    fireEvent.change(screen.getByLabelText("入力JSON"), { target: { value: "{" } });
    await user.click(getJsonLoadButton());

    expect(screen.getByText("JSONの構文が正しくありません。")).toBeInTheDocument();
  });

  it("adds and reorders status rows", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "追加" })[0]);
    await user.type(screen.getAllByLabelText("ラベル")[0], "HP");
    await user.clear(screen.getByLabelText("現在値"));
    await user.type(screen.getByLabelText("現在値"), "8");
    await user.click(screen.getAllByRole("button", { name: "追加" })[0]);
    await user.type(screen.getAllByLabelText("ラベル")[1], "MP");

    expect(getOutputValue()).toContain('"label": "HP"');
    expect(getOutputValue()).toContain('"value": 8');

    const hpHandle = screen.getByLabelText("HPをドラッグして並べ替え");
    const mpHandle = screen.getByLabelText("MPをドラッグして並べ替え");
    const hpRow = hpHandle.closest(".array-row");
    const mpRow = mpHandle.closest(".array-row");

    fireEvent.dragStart(hpHandle);
    expect(hpRow).toHaveClass("is-dragging");
    fireEvent.dragOver(mpRow as Element);
    fireEvent.dragEnter(mpRow as Element);
    expect(mpRow).toHaveClass("is-drop-after");
    fireEvent.drop(mpRow as Element);

    expect(getOutputValue().indexOf('"label": "MP"')).toBeLessThan(getOutputValue().indexOf('"label": "HP"'));
  });

  it("inserts status and parameter references into the command palette", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "追加" })[0]);
    await user.type(screen.getAllByLabelText("ラベル")[0], "HP");
    await user.click(screen.getAllByRole("button", { name: "追加" })[1]);
    await user.type(screen.getAllByLabelText("ラベル")[1], "器用B");

    await user.click(screen.getByRole("button", { name: "ステータス{HP}" }));
    await user.click(screen.getByRole("button", { name: "パラメータ{器用B}" }));

    expect(screen.getByLabelText("チャットパレット")).toHaveValue("{HP}{器用B}");
    expect(getOutputValue()).toContain('"commands": "{HP}{器用B}"');
  });

  it("copies the output JSON to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "コピー" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"kind": "character"'));
    expect(screen.getByText("クリップボードにコピーしました。")).toBeInTheDocument();
  });

  it("saves the current character through a save dialog when supported", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({ write, close })
    });
    const user = userEvent.setup();
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: showSaveFilePicker
    });
    render(<App />);

    await user.clear(screen.getByLabelText("名前"));
    await user.type(screen.getByLabelText("名前"), "Min/Net");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: "Min_Net.ccfolia-character.json"
      })
    );
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"kind": "character"'));
    expect(close).toHaveBeenCalled();
    expect(await screen.findByText("指定した場所にローカルファイルを保存しました。")).toBeInTheDocument();
  });

  it("falls back to downloading the local JSON file when save dialog is unavailable", async () => {
    const createObjectURL = vi.fn(() => "blob:character-json");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL
    });
    render(<App />);

    await user.clear(screen.getByLabelText("名前"));
    await user.type(screen.getByLabelText("名前"), "Min/Net");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:character-json");
    expect(screen.getByText("ブラウザのダウンロード先にローカルファイルを保存しました。")).toBeInTheDocument();
    click.mockRestore();
  });

  it("loads a local JSON file through the import review flow", async () => {
    const file = new File([JSON.stringify({ kind: "character", data: { name: "Loaded file" } })], "loaded.ccfolia-character.json", {
      type: "application/json"
    });
    const user = userEvent.setup();
    render(<App />);

    await user.upload(screen.getByLabelText("ローカルファイルを読み込む"), file);

    expect(await screen.findByRole("dialog", { name: "差分を確認" })).toBeInTheDocument();
    expect(screen.getByText("ファイル「loaded.ccfolia-character.json」を読み込みました。差分を確認してください。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "すべて上書き" }));
    expect(screen.getByLabelText("名前")).toHaveValue("Loaded file");
  });

  it("selects the output JSON when clipboard copy fails", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) }
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "コピー" }));

    expect(screen.getByText("コピーに失敗しました。出力JSONを手動でコピーしてください。")).toBeInTheDocument();
    expect(screen.getByLabelText("出力JSON")).toHaveFocus();
  });
});

function getOutputValue() {
  return (screen.getByLabelText("出力JSON") as HTMLTextAreaElement).value;
}

function getJsonLoadButton() {
  return within(screen.getByLabelText("JSON入出力").querySelector(".panel-block") as HTMLElement).getByRole("button", { name: "読み込む" });
}
