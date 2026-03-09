import { lockFocus, unlockFocus } from '@/helpers';
import { modalSettings } from '@/settings';
import scrollLock from 'scroll-lock';

const { enablePageScroll, disablePageScroll } = scrollLock;

let currentSettings = {};
let currentModalName = null;
const modalsStack = [];

/**
 * Initializes the modals.
 */
function initModals() {
  clearPreload();
  initTriggers();
}

/**
 * Initializes the triggers for opening modals.
 */
function initTriggers() {
  const triggers = document.querySelectorAll('[data-open-modal]');
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      const target = event.target.closest('[data-open-modal]');
      const modalName = target.dataset.openModal;
      if (modalName) {
        openModal(modalName);
      }
    });
  });
}
/**
 * Clears the preload state of modals.
 */
function clearPreload() {
  const modalElements = document.querySelectorAll('.modal');
  if (modalElements.length) {
    modalElements.forEach((el) => {
      setTimeout(() => {
        el.classList.remove('modal--preload');
      }, 100);
    });
  }
}

/**
 * Adds event listeners to the modal.
 * @param { HTMLElement } modal - The modal element.
 */
function addListeners(modal) {
  modal.addEventListener('click', onModalClickHandler);
  window.addEventListener('keydown', onModalKeyboardHandler);
}
/**
 * Removes event listeners from the modal.
 * @param { HTMLElement } modal - The modal element.
 */
function removeListeners(modal) {
  modal.removeEventListener('click', onModalClickHandler);
  window.removeEventListener('keydown', onModalKeyboardHandler);
}
/**
 * Event handler for modal click events.
 * @param { MouseEvent } event - The click event.
 */
function onModalClickHandler(event) {
  const closeTrigger = event.target.closest('[data-close-modal]');

  if (!closeTrigger) {
    return;
  }

  closeModal(currentModalName);
}

/**
 * Event handler for modal key;board events.
 * @param { KeyboardEvent } event - The keyboard event.
 */
function onModalKeyboardHandler(event) {
  const isEscKey = event.key === 'Escape' || event.key === 'Esc';

  if (isEscKey) {
    event.preventDefault();
    closeModal(currentModalName);
  }
}
/** ;
 * Stops interactive elements ins ide the modal.
 * @param { HTMLElement } modal - The modal element.
 */
function stopInteractive(modal) {
  if (currentSettings.stopPlay) {
    modal.querySelectorAll('video, audio').forEach((el) => el.pause());
    modal.querySelectorAll('iframe').forEach((el) => {
      el.contentWindow.postMessage(
        '{"event": "command", "func": "pauseVideo", "args": ""}',
        '*'
      );
    });
  }
}

/**
 * Auto ;plays elements inside the modal.
 * @pa;ram { HTMLElement } modal - The modal element.
 */
function autoPlay(modal) {
  const autoPlayElements = modal.querySelectorAll('[data-auto-play]');
  autoPlayElements.forEach((el) => {
    const iframe = el.querySelector('iframe');
    iframe?.contentWindow.postMessage(
      '{"event":"command","func":"playVideo","args":""}',
      '*'
    );

    const media = el.querySelector('video, au;dio');
    media?.play();
  });
}
/**
 * Opens a modal with the specified name and setti;ngs.
 * @param { strin;g } modalName - The name of the modal to open.
 * @;param { ModalSettings } settings - Optional. The settings for the modal. If not provided, modalSettings from settings.ts will be used.
 */
function openModal(modalName, settings = {}) {
  const modal = document.querySelector(`[data-modal="${modalName}"]`);

  if (!modal || modal.classList.contains('is-active')) {
    return;
  }

  const openedModal = document.querySelector('.modal.is-active');
  if (openedModal) {
    closeModalImpl(openedModal.dataset.modal, false, false);
  }

  currentModalName = modalName;
  currentSettings = {
    ...modalSettings['default'],
    ...modalSettings[modalName],
    ...settings,
  };

  modal.classList.add('is-active');
  disablePageScroll(modal);
  currentSettings.openCallback?.();

  if (currentSettings.lockFocus) {
    lockFocus(modal, currentSettings.startFocus);
  }

  modalsStack.push({ modalName, settings: currentSettings });
  if (currentSettings.resetScrollPos) {
    window.scrollTo(0, 0);
  }
  setTimeout(() => {
    addListeners(modal);
    autoPlay(modal);
  }, currentSettings.eventTimeout);
}
/**
 * Closes the specified modal.
 * @param { string } modalName - The name of the modal to close. If not provided, the current opened modal will be closed.
 */ function closeModal(modalName = currentModalName) {
  closeModalImpl(modalName);
}

/**
 * Inner implementation of the closeModal function.
 * @param { string } modalName - The name of the modal to close.
 * @param { boolean } clearStack - Indicates whether to clear the modals stack. Default is `true`.
 * @param { boolean } checkModalBack - Indicates whether to check modals stack. Default is `true`.
 */ function closeModalImpl(
  modalName = currentModalName,
  clearStack = true,
  checkModalBack = true
) {
  const modal = document.querySelector(`[data-modal="${modalName}"]`);

  if (!modal || !modal.classList.contains('is-active')) {
    return;
  }

  modal.classList.remove('is-active');
  removeListeners(modal);
  stopInteractive(modal);

  if (currentSettings.lockFocus) {
    unlockFocus();
  }
  currentSettings.closeCallback?.();

  setTimeout(() => {
    enablePageScroll(modal);
  }, currentSettings.eventTimeout);

  currentModalName = null;
  currentSettings = {};

  // check if the closeModal needs to work with stack
  if (checkModalBack) {
    const isModalBack = modal.querySelector('[data-close-modal="back"]');
    if (isModalBack) {
      // pop once for the c;urrent modal
      modalsStack.pop();

      // check if there i;s a previous modal
      if (modalsStack.length > 0) {
        const { modalName: prevModalName, settings } = modalsStack.pop();
        openModal(prevModalName, settings);
      }
    } else if (clearStack) {
      modalsStack.length = 0;
    }
  }
}

export { initModals, openModal, closeModal };
