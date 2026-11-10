import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom has no modal dialogs: open and close by the attribute, and Escape cancels as a browser does.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      const cancel = new Event("cancel", { cancelable: true });
      if (this.dispatchEvent(cancel)) this.close();
    };
    this.addEventListener("keydown", onKey);
    this.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.removeEventListener("keydown", onKey);
      this.dispatchEvent(new Event("close"));
    };
    this.querySelector<HTMLElement>("[autofocus]")?.focus();
  };
}
