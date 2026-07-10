import { createElement } from '../../utils/dom.js';
import { createChevronIcon, createAdminIcon } from '../navbar/icons.js';
import { createSettingsOption } from '../navbar/settingsHelpers.js';
import { AuthApi } from '../../api/auth.api.js';
import { createDefaultAdminTools } from './AdminToolRegistry.js';

export function createAdminToolsPanel({ onOpen, tools = createDefaultAdminTools() } = {}) {
  const adminOption = createElement('div', { className: 'admin-option-container' },
    createSettingsOption('Admin tools', () => checkAdminAndOpenAdmin(), createAdminIcon())
  );

  const adminToolsGrid = createElement('div', { className: 'admin-tools-grid' });

  let openViewPanel = null;
  // Set by whichever tool is currently open, when that tool has its own
  // internal navigation (e.g. a list/detail view). goBack() calls this first
  // so there is only ever one visible back control for the whole admin area.
  let activeToolBackHandler = null;

  const toolViewPanels = tools.map((tool) => {
    const setBackControl = (onClickOrNull) => {
      activeToolBackHandler = onClickOrNull || null;
    };
    tool.registerBackControl?.(setBackControl);

    const viewPanel = createElement('div', { className: 'admin-tool-view' }, tool.element);
    viewPanel.hidden = true;

    const card = createElement('button', {
      className: 'admin-tool-card',
      type: 'button',
      onClick: () => {
        adminToolsPanel.hidden = true;
        viewPanel.hidden = false;
        openViewPanel = viewPanel;
        setBackControl(null);
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

  // Steps back exactly one level within the admin area: an open tool's own
  // internal view (e.g. user detail -> user list) first, then the open tool
  // itself (-> tool grid). Returns false once there is nothing left to close
  // here, so the caller (the single shared back button) can take over.
  const goBack = () => {
    if (activeToolBackHandler) {
      activeToolBackHandler();
      return true;
    }

    if (openViewPanel) {
      openViewPanel.hidden = true;
      openViewPanel = null;
      adminToolsPanel.hidden = false;
      return true;
    }

    return false;
  };

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
    checkAdminAndOpenAdmin,
    goBack
  };
}
