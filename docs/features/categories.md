# Feature: expense categories (your own, hide, delete)

> **Scope:** the live list of expense categories: built-in + your own, hidden or shown, grouped by type (Needs, Wants, or a type of your own).
>
> **Read when:** you change `src/lib/categories.ts`, `src/sheets/CategoriesSheet.tsx` (`CategoriesBody`), `BucketPicker` in `src/sheets/shared.tsx`, or anything that lists categories.
>
> **Related:** [entries.md](entries.md), [month.md](month.md), [../data-model.md](../data-model.md)

## Model

- Built-in categories (Housing, Groceries, ...) stay in code (`EXPENSE_CATEGORIES`). Your own are `AppData.categories: CustomCategory[]` = `{ id: 'c_...', name, icon, bucket }`. `bucket` is the category's **type**: `needs`, `wants`, or the id of one of your own types.
- **Hidden** ids are `Settings.hiddenCategories`. Built-in categories can only be hidden (and shown again); your own can also be deleted.
- `categories.ts` keeps the combined list as module state, refreshed by `syncCategories()` which the store calls whenever either list changes. Pure code (`bucketOf` in `calc.ts`) and pages read it through `allExpenseCategories()` (everything, for looking an entry up), `visibleExpenseCategories()` (pickers) and `isCategoryHidden(id)`.

## Types (besides Needs and Wants)

- Your own types are `AppData.categoryTypes: CategoryType[]` = `{ id: 'ty_...', name }`; `Bucket` (types.ts) is a plain string. Made with **New type** in the manager, or with **New type** in the *Counts as* picker (`BucketPicker`, used by the manager's category form and by the entry sheet's *New category* step), where the new type is selected at once.
- The type's spending is counted **apart from needs and wants**: `monthTotals` has `other` next to `needs` and `wants`, and `spent` = needs + wants + other. They have no 50 / 30 / 20 target. The Month page shows a fourth card (named after the type, or *Other types*) only in a month with such spending; Budgets gets one card per type that has categories; the Month category cards are ordered Needs, Wants, then your types.
- A type can be renamed and deleted (pencil and bin in its group header). Deleting asks first; its categories move to **Wants**, nothing is deleted from the journal. Backups include `categoryTypes`; an unknown bucket in an old backup loads as `wants`.
- `categories.ts` helpers: `allBuckets()`, `bucketLabel(id)`, `isOwnBucket(id)`; `syncCategories(custom, hidden, types)`.

## The manager is an expandable field

`CategoriesBody` (exported from `CategoriesSheet.tsx`) is the whole manager. It sits **inside Settings as an expandable field** (Settings > Expense categories) and, wrapped in a sheet, behind *Manage expense categories* on the Budgets page. Each type is a group (`TypeGroup`) with a chevron header, its count and (for your own types) rename / delete; tap the header to fold it open or shut.

## Behaviour

| Where | What |
| --- | --- |
| Settings > Expense categories (expandable field), Budgets > *Manage expense categories* (sheet) | `CategoriesBody`: one group per type; each row has hide / show, your own also edit and delete; *New category* form (name, 33 icons, *Counts as*: Need, Want or one of your types, or a new one); *New type*. The last visible category cannot be hidden |
| Entry sheet | the picker lists the visible categories first and **the hidden ones after them**, so a hidden category can still be chosen for an expense (nothing else changes: it stays hidden on the Month page); **New** tile creates one on the spot and selects it |
| Month, Budgets | a hidden category shows only while it has entries (Month) or spending / a budget (Budgets) |
| Delete (your own) | asks first. Entries stay and are gathered under **Other** (Month card, Statistics row, wants); its budget is dropped; recurring items using it move to Bills |
| Hide | never touches entries, budgets or statistics |

Backups include `categories` and `settings.hiddenCategories`; older backups load with none.

> **Bills icon:** a sheet of paper with lines (Lucide `FileText`) instead of a lightning bolt. Built-in names are getters that go through `t()`, so they follow the language ([language.md](language.md)).

## Order in the entry sheets

In *Add / Edit expense* the category tiles are ordered by **most recent use** (the ledger is sorted newest first; categories never used keep their usual order after), and only the first row is shown until *Show all · N* is pressed. The recurring sheet uses the same order and the same collapsible `ChoiceGrid`. [entries.md](entries.md)

## Default categories and Basic mode

The built-in expense categories are House (`housing`), Food (`groceries`), Fun, Health, **Eating out** (`eating_out`) and **Others** (`others`) as the six **defaults**, plus Transport, Bills and Shopping. `DEFAULT_HIDDEN_CATEGORIES` (`categories.ts`) lists the last three (Eating out used to be hidden; it is a default now): a new journal, and *Delete all data*, start with them hidden; Settings > Expense categories shows them again. A journal that already exists keeps its own hidden list, and ids never changed, so no entry loses its category. House and Food are the old Housing and Groceries under shorter names.

In [Basic mode](basic-mode.md) the manager is **one flat list** (no Needs / Wants groups, no *New type*, no *Counts as*); new categories count as Wants and the types made in Full are kept.
