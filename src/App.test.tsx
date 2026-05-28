import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("loads the sample JSON and reflects edits in the output", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "読み込む" }));
    await user.clear(screen.getByLabelText("名前"));
    await user.type(screen.getByLabelText("名前"), "Chicken Prime");

    expect(getOutputValue()).toContain('"name": "Chicken Prime"');
  });

  it("shows a validation message for invalid JSON", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("入力JSON"));
    fireEvent.change(screen.getByLabelText("入力JSON"), { target: { value: "{" } });
    await user.click(screen.getByRole("button", { name: "読み込む" }));

    expect(screen.getByText("JSONの構文が正しくありません。")).toBeInTheDocument();
  });

  it("adds and reorders status rows", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "追加" })[0]);
    await user.type(screen.getAllByLabelText("ラベル")[0], "HP");
    await user.clear(screen.getByLabelText("現在値"));
    await user.type(screen.getByLabelText("現在値"), "8");

    expect(getOutputValue()).toContain('"label": "HP"');
    expect(getOutputValue()).toContain('"value": 8');
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
});

function getOutputValue() {
  return (screen.getByLabelText("出力JSON") as HTMLTextAreaElement).value;
}
