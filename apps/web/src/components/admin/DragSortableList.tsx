'use client';

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

export interface DragSortableListProps<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  renderItem: (item: T) => ReactNode;
  getItemId?: (item: T) => string | number;
}

function SortableItem<T>({
  item,
  id,
  renderItem,
}: {
  item: T;
  id: string;
  renderItem: (item: T) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50 z-10' : ''}
      {...attributes}
      {...listeners}
    >
      {renderItem(item)}
    </div>
  );
}

export default function DragSortableList<T>({
  items,
  onReorder,
  renderItem,
  getItemId,
}: DragSortableListProps<T>) {
  const itemIds = items.map((item, index) => String(getItemId ? getItemId(item) : index));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newItems = arrayMove(items, oldIndex, newIndex);
    onReorder(newItems);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <SortableItem
              key={String(getItemId ? getItemId(item) : index)}
              id={String(getItemId ? getItemId(item) : index)}
              item={item}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
