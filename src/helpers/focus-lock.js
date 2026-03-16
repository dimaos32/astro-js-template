import { KeyCode } from '@/const/keyCode';

const FOCUS_LOCK_DELAY_MS = 100; // ms

let focusableElements = null;
let focusedElement = null;

const selectors = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',
  'select:not([disabled]):not([aria-hidden])',
  'textarea:not([disabled]):not([aria-hidden])',
  'button:not([disabled]):not([aria-hidden])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex^="-"])',
];

function lockFocus(element, startFocus = true) {
  if (focusedElement !== null) {
    unlockFocus(false);
  }

  if (!element) {
    return;
  }

  focusedElement = document.activeElement;
  focusableElements = element.querySelectorAll(selectors.join(','));

  if (focusableElements.length === 0) {
    return;
  }

  setTimeout(() => {
    focusedElement?.blur();

    if (startFocus) {
      focusableElements[0].focus();
    }

    document.addEventListener('keydown', keydownHandler);
  }, FOCUS_LOCK_DELAY_MS);
}

function unlockFocus(returnFocus = true) {
  if (returnFocus && focusedElement) {
    focusedElement.focus();
  }

  focusedElement = null;
  focusableElements = null;
  document.removeEventListener('keydown', keydownHandler);
}

function keydownHandler(event) {
  const isTabPressed = event.key === KeyCode.Tab;

  if (!isTabPressed) {
    return;
  }

  if (event.shiftKey && document.activeElement === focusableElements[0]) {
    event.preventDefault();
    focusableElements[focusableElements.length - 1].focus();
    return;
  }

  if (
    !event.shiftKey &&
    document.activeElement === focusableElements[focusableElements.length - 1]
  ) {
    event.preventDefault();
    focusableElements[0].focus();
  }
}

export { lockFocus, unlockFocus };
