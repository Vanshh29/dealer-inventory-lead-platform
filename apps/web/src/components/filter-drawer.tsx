'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { MenuIcon, CloseIcon } from './icons';

/**
 * Filters as a sidebar on large screens and as a slide-in drawer on phones, opened by the
 * three-line button. One copy of the form lives in the page (no duplicated ids); only the
 * CSS around it changes. Without JavaScript a <noscript> rule shows it inline again, so the
 * GET form still works.
 */
export function FilterDrawer({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  // Lock page scroll behind the drawer, and give focus to it / back to the button.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      closeButton.current?.focus();
      // If the panel was still becoming visible the focus call can be ignored; fall back to the dialog.
      if (document.activeElement !== closeButton.current) panel.current?.focus();
    } else if (wasOpen.current) {
      trigger.current?.focus();
    }
    wasOpen.current = open;
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Rotating the phone or widening the window to desktop: the sidebar takes over, drop the lock.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Escape works wherever focus is (a tap can leave it on the page behind).
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, close]);

  function onKeyDown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Tab' && panel.current) {
      // Keep Tab inside the drawer while it is open.
      const items = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea',
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <>
      <noscript>
        <style>{`.filter-trigger{display:none!important}.filter-drawer{position:static!important;visibility:visible!important;transform:none!important;width:auto!important;max-width:none!important;box-shadow:none!important}.filter-close{display:none!important}`}</style>
      </noscript>

      <div className="filter-trigger sticky top-[3.75rem] z-30 -mx-4 -mt-8 mb-4 border-b border-slate-200/70 bg-slate-50/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <MenuIcon className="h-5 w-5" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs font-bold text-white">
              {activeCount}
              <span className="sr-only"> active</span>
            </span>
          )}
        </button>
      </div>

      {open && (
        <div
          aria-hidden="true"
          onClick={close}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        id={panelId}
        ref={panel}
        aria-label="Filters"
        tabIndex={-1}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        onKeyDown={onKeyDown}
        className={`filter-drawer fixed inset-y-0 left-0 z-50 w-[88%] max-w-sm overflow-y-auto bg-white/90 p-5 shadow-2xl backdrop-blur-xl transition-[transform,visibility] duration-300 ease-out lg:visible lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-card lg:sticky lg:top-24 lg:self-start focus:outline-none ${open ? 'translate-x-0' : 'invisible -translate-x-full'}`}
      >
        <div className="filter-close mb-4 flex items-center justify-between lg:hidden">
          <p className="text-lg font-bold">Filters</p>
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="Close filters"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
