/**
 * jsdom does not implement HTMLDialogElement.showModal/close (its
 * implementation is an empty subclass). Real focus containment is validated
 * with Playwright against Storybook; this polyfill only toggles the `open`
 * attribute, spec-compliant in the parts the component relies on.
 */
if (
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal !== 'function'
) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void {
    if (this.open) {
      throw new DOMException('The dialog is already open.', 'InvalidStateError')
    }
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void {
    this.removeAttribute('open')
  }
}

export {}
