import { useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmDialog, SectionLabel, seg, textInput } from '../components/ui';
import { allExpenseCategories, BUCKET_LABEL, isBuiltInCategory, isCategoryHidden } from '../lib/categories';
import { useApp, useSheet } from '../lib/store';
import type { Bucket } from '../lib/types';
import { IconPicker } from './shared';

/**
 * The expense categories: make your own, hide the ones you never use (housing, groceries...) and
 * show them again, delete your own. Hiding never touches entries: they keep their category.
 */
export function CategoriesSheet() {
  const { isOpen } = useSheet('categories');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title="Expense categories" subtitle="Make your own, hide the ones you do not use" maxWidth="max-w-md">
      {isOpen && <CategoriesBody />}
    </Modal>
  );
}

const iconButton =
  'pressable size-9 shrink-0 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center';

function CategoriesBody() {
  const { data, saveCategory, removeCategory, setCategoryHidden, showToast } = useApp();
  const [editing, setEditing] = useState<string | null>(null); // id being edited, '' = a new one
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [bucket, setBucket] = useState<Bucket>('wants');
  const [deleting, setDeleting] = useState<string | null>(null);

  const list = allExpenseCategories();
  const uses = (id: string) => data.txs.filter((tx) => tx.kind === 'expense' && tx.categoryId === id).length;
  const visibleCount = list.filter((c) => !isCategoryHidden(c.id)).length;

  const startNew = () => {
    setEditing('');
    setName('');
    setIcon('tag');
    setBucket('wants');
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
    showToast(editing ? `Saved ${name.trim()}` : `Added ${name.trim()}`);
    setEditing(null);
  };

  const row = (id: string) => {
    const category = list.find((c) => c.id === id)!;
    const Icon = category.icon;
    const hidden = isCategoryHidden(id);
    const own = !isBuiltInCategory(id);
    const count = uses(id);
    return (
      <li key={id} className={`flex items-center gap-2 rounded-2xl bg-[var(--inset)] pl-3 pr-1.5 py-1.5 ${hidden ? 'opacity-60' : ''}`}>
        <Icon size={16} strokeWidth={2.2} className="shrink-0 text-[var(--text)]" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold text-[var(--text)]">{category.name}</span>
          <span className="block text-[11px] font-medium text-[var(--muted)]">
            {own ? 'Yours' : 'Built in'} · {count} {count === 1 ? 'entry' : 'entries'}{hidden ? ' · hidden' : ''}
          </span>
        </span>
        {own && (
          <button type="button" className={iconButton} onClick={() => startEdit(id)} aria-label={`Edit ${category.name}`} title="Edit">
            <Pencil size={15} />
          </button>
        )}
        <button
          type="button"
          className={iconButton}
          onClick={() => setCategoryHidden(id, !hidden)}
          disabled={!hidden && visibleCount <= 1}
          aria-label={`${hidden ? 'Show' : 'Hide'} ${category.name}`}
          title={hidden ? 'Show again' : 'Hide from the lists'}
        >
          {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        {own && (
          <button
            type="button"
            className={`${iconButton} hover:!text-[#8C2D32] hover:!bg-[#F6D0D0]`}
            onClick={() => setDeleting(id)}
            aria-label={`Delete ${category.name}`}
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        )}
      </li>
    );
  };

  const deletingCategory = deleting ? list.find((c) => c.id === deleting) : undefined;
  const deletingUses = deleting ? uses(deleting) : 0;

  return (
    <div className="space-y-5">
      {(['needs', 'wants'] as Bucket[]).map((b) => (
        <div key={b}>
          <SectionLabel>{BUCKET_LABEL[b]}</SectionLabel>
          <ul className="space-y-1.5">{list.filter((c) => c.bucket === b).map((c) => row(c.id))}</ul>
        </div>
      ))}

      {editing === null ? (
        <button
          type="button"
          onClick={startNew}
          className="pressable pressable-soft w-full py-3 rounded-2xl bg-[var(--text)] text-[var(--on-text)] font-extrabold text-sm flex items-center justify-center gap-2"
        >
          <Plus size={17} strokeWidth={2.5} />
          New category
        </button>
      ) : (
        <div className="space-y-4 rounded-3xl border border-[var(--border)] p-3.5">
          <div>
            <SectionLabel htmlFor="category-name">{editing ? 'Edit category' : 'New category'}</SectionLabel>
            <input
              id="category-name"
              type="text"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              placeholder="Pets, Gym, Gifts..."
              maxLength={30}
              autoComplete="off"
              className={`${textInput} text-sm`}
            />
          </div>
          <IconPicker value={icon} onChange={setIcon} />
          <div>
            <SectionLabel>Counts as</SectionLabel>
            <div className="flex gap-1.5" role="group" aria-label="Needs or wants">
              <button type="button" aria-pressed={bucket === 'needs'} onClick={() => setBucket('needs')} className={seg(bucket === 'needs')}>Need</button>
              <button type="button" aria-pressed={bucket === 'wants'} onClick={() => setBucket('wants')} className={seg(bucket === 'wants')}>Want</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEditing(null)} className="pressable py-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] text-sm font-extrabold">Cancel</button>
            <button type="button" disabled={!name.trim()} onClick={submit} className="kc-primary-btn pressable py-3 rounded-2xl bg-activity text-activity-ink font-extrabold text-sm disabled:opacity-40">
              {editing ? 'Save' : 'Add category'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deletingCategory?.name ?? 'this category'}?`}
        message={
          deletingUses > 0
            ? `${deletingUses} ${deletingUses === 1 ? 'entry uses' : 'entries use'} it. They stay in your journal and are listed under "Other".`
            : 'Nothing uses it yet.'
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) removeCategory(deleting);
          setDeleting(null);
        }}
      />
    </div>
  );
}
