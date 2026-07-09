import { createElement } from '../../utils/dom.js';
import { createBackIcon, createChevronIcon, createAdminIcon } from '../navbar/icons.js';
import { createSettingsOption } from '../navbar/settingsHelpers.js';
import { AuthApi } from '../../api/auth.api.js';
import { createDefaultAdminTools } from './AdminToolRegistry.js';

export function createAdminToolsPanel({ onOpen, tools = createDefaultAdminTools() } = {}) {
  const adminOption = createElement('div', { className: 'admin-option-container' },
    createSettingsOption('Admin tools', () => checkAdminAndOpenAdmin(), createAdminIcon())
  );

  const adminToolsGrid = createElement('div', { className: 'admin-tools-grid' });

  const toolViewPanels = tools.map((tool) => {
    const viewPanel = createElement('div', { className: 'admin-tool-view' },
      createElement('div', { className: 'admin-view-header' },
        createElement('button', {
          className: 'admin-view-back-button',
          type: 'button',
          onClick: () => {
            viewPanel.hidden = true;
            adminToolsPanel.hidden = false;
          }
        }, createBackIcon(), tool.label),
      ),
      tool.element
    );
    viewPanel.hidden = true;

    const card = createElement('button', {
      className: 'admin-tool-card',
      type: 'button',
      onClick: () => {
        adminToolsPanel.hidden = true;
        viewPanel.hidden = false;
        tool.load?.();
      }
    },
      createElement('div', { className: 'admin-tool-card-icon' }, tool.icon),
      createElement('div', { className: 'admin-tool-card-info' },
        createElement('span', { className: 'admin-tool-card-title' }, tool.label),
        createElement('span', { className: 'admin-tool-card-desc' }, tool.description)
      ),
      createChevronIcon()
    );

    adminToolsGrid.appendChild(card);

    return viewPanel;
  });

  const adminToolsPanel = createElement('div', { className: 'admin-tools-panel' },
    createElement('h2', { className: 'admin-tools-title' }, 'Admin tools'),
    adminToolsGrid
  );

  const adminPanel = createElement('div', {
    className: 'settings-panel settings-panel-admin',
    dataset: { view: 'admin' }
  },
    adminToolsPanel,
    ...toolViewPanels
  );

  const checkAdminAndOpenAdmin = async () => {
    try {
      const data = await AuthApi.getCurrentUser();
      if (data?.user?.isAdmin !== true) return;
      onOpen?.();
    } catch (error) {
      console.error('Admin check failed:', error);
    }
  };

  const loadAdminVisibility = async () => {
    try {
      const data = await AuthApi.getCurrentUser();
      const isAdmin = data?.user?.isAdmin === true;
      adminOption.hidden = !isAdmin;
    } catch (error) {
      console.error('Could not load admin visibility:', error);
      adminOption.hidden = true;
    }
  };

  return {
    adminPanel,
    adminOption,
    loadAdminVisibility,
    checkAdminAndOpenAdmin
  };
}
