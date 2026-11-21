# Feature: expense categories (your own, hide, delete)

> **Scope:** the live list of expense categories: built-in + your own, hidden or shown.
>
> **Read when:** you change `src/lib/categories.ts`, `src/sheets/CategoriesSheet.tsx`, or anything that lists categories.
>
> **Related:** [entries.md](entries.md), [month.md](month.md), [../data-model.md](../data-model.md)

## Model

- Built-in categories (Housing, Groceries, ...) stay in code (`EXPENSE_CATEGORIES`). Your own are `AppData.categories: CustomCategory[]` = `{ id: 'c_...', name, icon, bucket }` (`bucket` = `needs` or `wants`, what the Needs / Wants maths counts it as).
- **Hidden** ids are `Settings.hiddenCategories`. Built-in categories can only be hidden (and shown again); your own can also be deleted.
- `categories.ts` keeps the combined list as module state, refreshed by `syncCategories()` which the store calls whenever either list changes. Pure code (`bucketOf` in `calc.ts`) and pages read it through `allExpenseCategories()` (everything, for looking an entry up), `visibleExpenseCategories()` (pickers) and `isCategoryHidden(id)`.

## Behaviour

| Where | What |
| --- | --- |
| Settings > Expense categories, Budgets > *Manage expense categories* | `CategoriesSheet`: Needs and Wants lists; each row has hide / show, your own also edit and delete; *New category* form (name, 33 icons, need or want). The last visible category cannot be hidden |
| Entry sheet | picker shows visible categories only; **New** tile creates one on the spot and selects it |
| Month, Budgets | a hidden category shows only while it has entries (Month) or spending / a budget (Budgets) |
| Delete (your own) | asks first. Entries stay and are gathered under **Other** (Month card, Statistics row, wants); its budget is dropped; recurring items using it move to Bills |
| Hide | never touches entries, budgets or statistics |

Backups include `categories` and `settings.hiddenCategories`; older backups load with none.
