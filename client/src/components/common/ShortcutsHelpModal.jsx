import React from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, X } from 'lucide-react';
import { Modal } from './Modal.jsx';

export function ShortcutsHelpModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  const shortcutGroups = [
    {
      title: t('shortcuts.navigation', 'Navigation & Search'),
      items: [
        { keys: ['Ctrl', 'K'], altKey: '/', description: t('shortcuts.commandPalette', 'Open Command Palette & Search') },
        { keys: ['?'], description: t('shortcuts.showHelp', 'Show this keyboard shortcuts guide') },
        { keys: ['Esc'], description: t('shortcuts.closeModal', 'Close open modal, palette, or menu') },
      ],
    },
    {
      title: t('shortcuts.appControls', 'App Controls & Appearance'),
      items: [
        { keys: ['Ctrl', 'B'], description: t('shortcuts.toggleSidebar', 'Toggle sidebar expanded / collapsed') },
        { keys: ['Ctrl', 'D'], description: t('shortcuts.toggleTheme', 'Cycle Light, Dark, and System theme') },
        { keys: ['Ctrl', 'L'], description: t('shortcuts.toggleLanguage', 'Toggle between Khmer and English') },
      ],
    },
    {
      title: t('shortcuts.printing', 'Documents & Actions'),
      items: [
        { keys: ['Ctrl', 'P'], description: t('shortcuts.printPage', 'Print active report, invoice, or page') },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-primary" />
          <span>{t('shortcuts.title', 'Keyboard Shortcuts')}</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-6 py-2">
        {shortcutGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2.5">
            <h4 className="text-xs font-bold text-content-muted uppercase tracking-wider">
              {group.title}
            </h4>
            <div className="space-y-2 bg-surface-subtle border border-border rounded-xl p-3">
              {group.items.map((item, iIdx) => (
                <div
                  key={iIdx}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <span className="text-content-primary font-medium">
                    {item.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, kIdx) => (
                      <React.Fragment key={kIdx}>
                        {kIdx > 0 && <span className="text-content-muted">+</span>}
                        <kbd className="px-2 py-0.5 rounded bg-surface border border-border font-mono font-bold text-[11px] text-content-primary shadow-sm">
                          {k}
                        </kbd>
                      </React.Fragment>
                    ))}
                    {item.altKey && (
                      <>
                        <span className="text-content-muted mx-1">{t('common.or', 'or')}</span>
                        <kbd className="px-2 py-0.5 rounded bg-surface border border-border font-mono font-bold text-[11px] text-content-primary shadow-sm">
                          {item.altKey}
                        </kbd>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
export default ShortcutsHelpModal;