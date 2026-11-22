import { useId, useState, type ReactNode } from 'react';
import { ICON } from '../lib/icons';
import { ChevronDown, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmDialog, SectionLabel, textInput } from '../components/ui';
import { allBuckets, allExpenseCategories, isBuiltInCategory, isCategoryHidden, isOwnBucket } from '../lib/categories';
import { useApp, useSheet } from '../lib/store';
import type { Bucket } from '../lib/types';
import { BucketPicker, IconPicker } from './shared';
import { t } from '../lib/i18n';

/**
 * The expense categories: make your own, hide the ones you never use (housing, groceries...) and
 * show them again, delete your own. Hiding never touches entries: they keep their category.
 * Categories are grouped by type (Needs, Wants and your own types); every group folds open and shut.
 * The same body also sits inside the Settings sheet as an expandable field (`CategoriesBody`).
 */
export function CategoriesSheet() {
  const { isOpen } = useSheet('categories');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('Expense categories')} subtitle={t('Make your own, hide the ones you do not use')} maxWidth="max-w-md">
      {isOpen && <CategoriesBody />}
    </Modal>
  );
}

const iconButton =
  'pressable size-9 shrink-0 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center';

/** One type of expense (Needs, Wants or your own): a header that folds its categories open and shut. */
function TypeGroup({ title, count, actions, defaultOpen = true, children }: { title: string; count: number; actions?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="rounded-2xl border border-[var(--border)]">
      <div className="flex items-center gap-1 pr-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 px-3.5 py-3 text-left"
        >
          <ChevronDown size={ICON.md} aria-hidden="true" className={`shrink-0 text-[var(--muted)] transition-transform duration-300 ${open ? '' : '-rotate-90'}`} />
          <span className="min-w-0 truncate text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">{title}</span>
          <span className="shrink-0 rounded-full bg-[var(--inset)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--muted)]">{count}</span>
        </button>
        {actions}
      </div>
      <div id={`${id}-panel`} className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className="px-2.5 pb-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** The whole manager, without a sheet around it: used by the sheet below and by Settings. */
export function CategoriesBody() {
  const { data, basic, saveCategory, removeCategory, saveCategoryType, removeCategoryType, setCategoryHidden, showToast } = useApp();
  const [editing, setEditing] = useState<string | null>(null); // id being edited, '' = a new one
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [bucket, setBucket] = useState<Bucket>('wants');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [typeEditing, setTypeEditing] = useState<string | null>(null); // type id being renamed, '' = a new type
  const [typeName, setTypeName] = useState('');
  const [typeDeleting, setTypeDeleting] = useState<string | null>(null);

  const list = allExpenseCategories();
  const uses = (id: string) => data.txs.filter((tx) => tx.kind === 'expense' && tx.categoryId === id).length;
  const visibleCount = list.filter((c) => !isCategoryHidden(c.id)).length;

  const startNew = (inBucket: Bucket = 'wants') => {
    setEditing('');
    setName('');
    setIcon('tag');
    setBucket(inBucket);
  };
  const startEdit = (id: string) => {
    const own = data.categories.find((c) => c.id === id);
    if (!own) return;
    setEditing(id);
    setName(own.name);
    setIcon(own.icon);
    setBucket(own.bucket);
  };
  const submit = () => {
    if (!name.trim()) return;
    saveCategory({ id: editing || undefined, name, icon, bucket });
    showToast(editing ? t('Saved {v}', { v: name.trim() }) : t('Added {v}', { v: name.trim() }));
    setEditing(null);
  };
  const submitType = () => {
    if (!typeName.trim()) return;
    saveCategoryType({ id: typeEditing || undefined, name: typeName });
    showToast(typeEditing ? t('Saved {v}', { v: typeName.trim() }) : t('Added {v}', { v: typeName.trim() }));
    setTypeEditing(null);
  };

  const row = (id: string) => {
    const category = list.find((c) => c.id === id)!;
    const Icon = category.icon;
    const hidden = isCategoryHidden(id);
    const own = !isBuiltInCategory(id);
    const count = uses(id);
    return (
      <li key={id} className={`flex items-center gap-2 rounded-2xl bg-[var(--inset)] pl-3 pr-1.5 py-1.5 ${hidden ? 'opacity-60' : ''}`}>
        <Icon size={ICON.md} strokeWidth={2.5} className="shrink-0 text-[var(--text)]" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold text-[var(--text)]">{category.name}</span>
          <span className="block text-[11px] font-medium text-[var(--muted)]">
            {own ? t('Yours') : t('Built in')} · {count} {count === 1 ? t('entry') : t('entries')}{hidden ? t(' · hidden') : ''}
          </span>
        </span>
        {own && (
          <button type="button" className={iconButton} onClick={() => startEdit(id)} aria-label={t('Edit {name}', { name: category.name })} title={t('Edit')}>
            <Pencil size={ICON.md} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={iconButton}
          onClick={() => setCategoryHidden(id, !hidden)}
          disabled={!hidden && visibleCount <= 1}
          aria-label={hidden ? t('Show {name}', { name: category.name }) : t('Hide {name}', { name: category.name })}
          title={hidden ? t('Show again') : t('Hide from the lists')}
        >
          {hidden ? <Eye size={ICON.md} aria-hidden="true" /> : <EyeOff size={ICON.md} aria-hidden="true" />}
        </button>
        {own && (
          <button
            type="button"
            className={`${iconButton} hover:!text-danger-ink hover:!bg-danger`}
            onClick={() => setDeleting(id)}
            aria-label={t('Delete {name}', { name: category.name })}
            title={t('Delete')}
          >
            <Trash2 size={ICON.md} aria-hidden="true" />
          </button>
        )}
      </li>
    );
  };

  const deletingCategory = deleting ? list.find((c) => c.id === deleting) : undefined;
  const deletingUses = deleting ? uses(deleting) : 0;
  const deletingType = typeDeleting ? data.categoryTypes.find((x) => x.id === typeDeleting) : undefined;
  const deletingTypeCount = typeDeleting ? list.filter((c) => c.bucket === typeDeleting).length : 0;

  return (
    <div className="space-y-3">
      {/* Basic mode has no Needs / Wants / own types: one flat list of categories. */}
      {(basic ? [{ id: '_all', name: t('Categories') }] : allBuckets()).map((b) => {
        const members = basic ? list : list.filter((c) => c.bucket === b.id);
        const own = !basic && isOwnBucket(b.id);
        return (
          <TypeGroup
            key={b.id}
            title={b.name}
            count={members.length}
            actions={
              own ? (
                <>
                  <button type="button" className={iconButton} onClick={() => { setTypeEditing(b.id); setTypeName(b.name); }} aria-label={t('Rename {name}', { name: b.name })} title={t('Rename')}>
                    <Pencil size={ICON.md} aria-hidden="true" />
                  </button>
                  <button type="button" className={`${iconButton} hover:!text-danger-ink hover:!bg-danger`} onClick={() => setTypeDeleting(b.id)} aria-label={t('Delete {name}', { name: b.name })} title={t('Delete')}>
                    <Trash2 size={ICON.md} aria-hidden="true" />
                  </button>
                </>
              ) : undefined
            }
          >
            {typeEditing === b.id && (
              <div className="mb-2 flex items-center gap-1.5">
                <input type="text" value={typeName} autoFocus maxLength={30} autoComplete="off" aria-label={t('Name of the type')} onChange={(event) => setTypeName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitType(); }} className={`${textInput} min-w-0 flex-1`} />
                <button type="button" onClick={() => setTypeEditing(null)} className="pressable shrink-0 rounded-2xl bg-[var(--inset)] px-3 py-3 text-sm font-extrabold text-[var(--text)]">{t('Cancel')}</button>
                <button type="button" disabled={!typeName.trim()} onClick={submitType} className="kc-primary-btn pressable shrink-0 rounded-2xl bg-activity px-3 py-3 text-sm font-extrabold text-activity-ink disabled:opacity-40">{t('Save')}</button>
              </div>
            )}
            {members.length === 0 ? (
              <p className="px-1.5 py-1 text-[11px] font-medium text-[var(--muted)]">{t('No categories in this type yet.')}</p>
            ) : (
              <ul className="space-y-1.5">{members.map((c) => row(c.id))}</ul>
            )}
          </TypeGroup>
        );
      })}

      {typeEditing === '' && (
        <div className="space-y-2 rounded-3xl border border-[var(--border)] p-3.5">
          <SectionLabel htmlFor="type-name">{t('New type')}</SectionLabel>
          <input
            id="type-name"
            type="text"
            value={typeName}
            autoFocus
            maxLength={30}
            autoComplete="off"
            placeholder={t('Investments, Family, Travel...')}
            onChange={(event) => setTypeName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submitType(); }}
            className={`${textInput}`}
          />
          <p className="text-[11px] font-medium text-[var(--muted)]">{t('A type groups categories next to Needs and Wants. What goes in it is counted apart from both.')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTypeEditing(null)} className="pressable py-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] text-sm font-extrabold">{t('Cancel')}</button>
            <button type="button" disabled={!typeName.trim()} onClick={submitType} className="kc-primary-btn pressable py-3 rounded-2xl bg-activity text-activity-ink font-extrabold text-sm disabled:opacity-40">{t('Add type')}</button>
          </div>
        </div>
      )}

      {editing === null && typeEditing !== '' ? (
        <div className={`grid grid-cols-1 gap-2 ${basic ? '' : 'sm:grid-cols-2'}`}>
          <button
            type="button"
            onClick={() => startNew()}
            className="pressable pressable-soft w-full py-3 rounded-2xl bg-[var(--text)] text-[var(--on-text)] font-extrabold text-sm flex items-center justify-center gap-2"
          >
            <Plus size={ICON.md} strokeWidth={2.5} aria-hidden="true" />
            {t('New category')}
          </button>
          {!basic && (
          <button
            type="button"
            onClick={() => { setTypeEditing(''); setTypeName(''); }}
            className="pressable pressable-soft w-full py-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-extrabold text-sm flex items-center justify-center gap-2"
          >
            <Plus size={ICON.md} strokeWidth={2.5} aria-hidden="true" />
            {t('New type')}
          </button>
          )}
        </div>
      ) : editing !== null ? (
        <div className="space-y-4 rounded-3xl border border-[var(--border)] p-3.5">
          <div>
            <SectionLabel htmlFor="category-name">{editing ? t('Edit category') : t('New category')}</SectionLabel>
            <input
              id="category-name"
              type="text"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              placeholder={t('Pets, Gym, Gifts...')}
              maxLength={30}
              autoComplete="off"
              className={`${textInput}`}
            />
          </div>
          <IconPicker value={icon} onChange={setIcon} />
          {!basic && (
            <div>
              <SectionLabel>{t('Counts as')}</SectionLabel>
              <BucketPicker value={bucket} onChange={setBucket} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEditing(null)} className="pressable py-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] text-sm font-extrabold">{t('Cancel')}</button>
            <button type="button" disabled={!name.trim()} onClick={submit} className="kc-primary-btn pressable py-3 rounded-2xl bg-activity text-activity-ink font-extrabold text-sm disabled:opacity-40">
              {editing ? t('Save') : t('Add category')}
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title={t('Delete {v}?', { v: deletingCategory?.name ?? 'this category' })}
        message={
          deletingUses > 0 ? t('{deletingUses} {v} it. They stay in your journal and are listed under "Other".', { deletingUses, v: deletingUses === 1 ? t('entry uses') : t('entries use') }) : t('Nothing uses it yet.')
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) removeCategory(deleting);
          setDeleting(null);
        }}
      />
      <ConfirmDialog
        open={typeDeleting !== null}
        title={t('Delete {v}?', { v: deletingType?.name ?? 'this type' })}
        message={deletingTypeCount > 0 ? t('Its {n} categories move to Wants. Nothing is deleted from your journal.', { n: deletingTypeCount }) : t('No category uses it.')}
        onCancel={() => setTypeDeleting(null)}
        onConfirm={() => {
          if (typeDeleting) removeCategoryType(typeDeleting);
          setTypeDeleting(null);
        }}
      />
    </div>
  );
}
