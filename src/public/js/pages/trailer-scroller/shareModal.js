import { createElement } from '../../utils/dom.js';
import { appStore } from '../../store/app.store.js';
import { openModal } from '../../utils/modal.js';

export function bindShareModal(ctx) {
  ctx.closeShareModal = () => {
    const modal = ctx.shareModalHandle;
    ctx.shareModalHandle = null;
    ctx.shareModal = null;
    modal?.close();
  };

  ctx.copyShareUrl = async url => {
    try {
      await navigator.clipboard.writeText(url);
      appStore.showToast('Link kopiert', 'success');
    } catch {
      appStore.showToast('Link konnte nicht kopiert werden', 'error');
    }
  };

  ctx.openShareModal = trailer => {
    ctx.closeShareModal();

    const shareUrl = ctx.getTrailerShareUrl(trailer);

    const urlInput = createElement('input', {
      className: 'trailer-share-url',
      type: 'text',
      value: shareUrl,
      readonly: true,
      onFocus: (event) => event.target.select()
    });

    const nativeShareButton = navigator.share
      ? createElement('button', {
        className: 'trailer-share-button trailer-share-native',
        type: 'button',
        onClick: async () => {
          try {
            await navigator.share({ title: trailer.title, text: `Trailer ansehen: ${trailer.title}`, url: shareUrl });
            ctx.closeShareModal();
          } catch {
            // User canceled or platform rejected the share request.
          }
        }
      }, 'Teilen')
      : null;

    const copyButton = createElement('button', {
      className: 'trailer-share-button trailer-share-copy',
      type: 'button',
      onClick: () => ctx.copyShareUrl(shareUrl)
    }, 'Kopieren');

    const modalContent = createElement('div', {
      className: 'trailer-share-content',
      'aria-labelledby': 'trailer-share-title'
    },
      createElement('button', {
        className: 'trailer-share-close',
        type: 'button',
        'aria-label': 'Teilen schließen',
        onClick: ctx.closeShareModal
      }, '×'),
      createElement('h3', { className: 'trailer-share-title', id: 'trailer-share-title' }, 'Trailer teilen'),
      createElement('p', { className: 'trailer-share-text' }, trailer.title),
      urlInput,
      createElement('div', { className: 'trailer-share-options' },
        copyButton,
        nativeShareButton || createElement('button', {
          className: 'trailer-share-button trailer-share-native',
          type: 'button',
          onClick: () => ctx.copyShareUrl(shareUrl)
        }, 'Teilen')
      )
    );

    ctx.shareModal = createElement('div', { className: 'trailer-share-backdrop' }, modalContent);

    // Inside the scroller's container, which styles it; openModal adds focus
    // handling, Escape, the backdrop click and closing with the page.
    ctx.container.appendChild(ctx.shareModal);
    ctx.shareModalHandle = openModal({
      overlay: ctx.shareModal,
      dialog: modalContent,
      initialFocus: urlInput,
      lockScroll: false,
      onClose: () => ctx.closeShareModal()
    });
    urlInput.select();
  };

  return ctx;
}
