import { createElement } from '../../../utils/dom.js';
import { RequestsApi } from '../../../api/requests.api.js';

export function createAdminRequestItem(request, onChange) {
  return createElement('div', { className: 'request-item request-item-admin' },
    createElement('div', { className: 'request-item-info request-item-info-admin' },
      createElement('span', { className: 'request-item-title' }, request.title || `TMDB: ${request.tmdb_id}`),
      createElement('span', { className: 'request-item-detail' },
        `${request.username} — ${request.tmdb_type} — ${request.status}`)
    ),
    createElement('div', { className: 'request-item-right request-admin-actions' },
      createElement('button', {
        className: 'request-admin-action request-approve',
        type: 'button',
        title: 'Anfrage genehmigen',
        onClick: async (e) => {
          e.stopPropagation();
          try {
            await RequestsApi.approveRequest(request.id);
            onChange();
          } catch (error) {
            console.error('Failed to approve request:', error);
          }
        }
      }, 'Genehmigen'),
      createElement('button', {
        className: 'request-admin-action request-reject',
        type: 'button',
        title: 'Anfrage ablehnen',
        onClick: async (e) => {
          e.stopPropagation();
          try {
            await RequestsApi.rejectRequest(request.id);
            onChange();
          } catch (error) {
            console.error('Failed to reject request:', error);
          }
        }
      }, 'Ablehnen')
    )
  );
}
