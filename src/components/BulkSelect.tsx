import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useConfirm } from './Dialog';
import { Button, Txt } from './ui';
import { showToast } from '@/services/toast';
import { getErrorMessage } from '@/services/api';

/**
 * Multi-select state for a list: `start` turns on checkboxes, `toggle` picks
 * an item. Ids that leave the list (filter change, refetch) drop out of the
 * selection so the delete count never includes something off-screen.
 */
export function useBulkSelect(ids: string[]) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const idsKey = ids.join('|');
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(ids);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(ids));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSelected, idsKey]);

  const start = useCallback(() => setSelecting(true), []);
  const cancel = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  return useMemo(
    () => ({
      selecting,
      selected,
      count: selected.size,
      allSelected,
      isSelected: (id: string) => selected.has(id),
      toggle,
      toggleAll,
      start,
      cancel,
    }),
    [selecting, selected, allSelected, toggle, toggleAll, start, cancel],
  );
}

export type BulkSelection = ReturnType<typeof useBulkSelect>;

/**
 * Confirms, deletes every selected item, and reports the result in a single
 * toast. Per-request toasts are silenced by `remove(id, { silent: true })`.
 */
export function useBulkDelete({
  selection,
  noun,
  remove,
  onDone,
}: {
  selection: BulkSelection;
  /** Singular and plural, e.g. ['plan', 'plans']. */
  noun: [string, string];
  remove: (id: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);

  const run = useCallback(async () => {
    const ids = [...selection.selected];
    if (!ids.length) return;
    const label = (n: number) => `${n} ${n === 1 ? noun[0] : noun[1]}`;

    const ok = await confirm({
      title: `Delete ${label(ids.length)}?`,
      message: `${label(ids.length)} selected. This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Yes, delete',
      cancelLabel: 'No',
    });
    if (!ok) return;

    setDeleting(true);
    const results = await Promise.allSettled(ids.map((id) => remove(id)));
    setDeleting(false);

    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    const done = ids.length - failed.length;

    if (done) showToast(`Deleted ${label(done)}`, 'success');
    if (failed.length) {
      showToast(
        `Couldn't delete ${label(failed.length)}: ${getErrorMessage(failed[0].reason)}`,
        'danger',
      );
    }

    selection.cancel();
    onDone();
  }, [selection, noun, remove, onDone, confirm]);

  return { run, deleting };
}

/**
 * Sits above a list. Idle: a single "Delete" button that enters select mode.
 * Selecting: count, select-all, cancel, and the delete action.
 */
export function BulkSelectBar({
  selection,
  total,
  onDelete,
  deleting,
}: {
  selection: BulkSelection;
  total: number;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const { theme, spacing, radius } = useTheme();
  if (!total && !selection.selecting) return null;

  if (!selection.selecting) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.md }}>
        <Pressable
          onPress={selection.start}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: theme.dangerSoft,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="trash-outline" size={15} color={theme.danger} />
          <Txt variant="caption" color={theme.danger} style={{ marginLeft: 6 }}>
            Delete
          </Txt>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Pressable
        onPress={selection.toggleAll}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
      >
        <SelectCheck checked={selection.allSelected} />
        <Txt variant="bodyStrong" style={{ marginLeft: spacing.sm }} numberOfLines={1}>
          {selection.count ? `${selection.count} selected` : 'Select all'}
        </Txt>
      </Pressable>
      <Button title="Cancel" size="sm" variant="ghost" onPress={selection.cancel} disabled={deleting} />
      <Button
        title={selection.count ? `Delete (${selection.count})` : 'Delete'}
        size="sm"
        variant="danger"
        icon="trash-outline"
        onPress={onDelete}
        disabled={!selection.count}
        loading={deleting}
      />
    </View>
  );
}

/** Round checkbox shown on each row while selecting. */
export function SelectCheck({ checked, onImage }: { checked: boolean; onImage?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: checked ? theme.danger : onImage ? '#FFFFFF' : theme.textTertiary,
        backgroundColor: checked ? theme.danger : onImage ? 'rgba(10,22,48,0.35)' : 'transparent',
      }}
    >
      {checked && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
    </View>
  );
}
