"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";

type Props = {
  id: string;
  children: React.ReactNode;
  editMode: boolean;
  isHidden?: boolean;
  onHide?: () => void;
};

export default function SortableWidget({
  id,
  children,
  editMode,
  isHidden,
  onHide,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !editMode,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition: transition || "transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    }),
    [transform, transition]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative
        rounded-xl
        border
        bg-white
        p-4
        shadow-sm

        /* Smooth visual transitions */
        transition-all duration-200 ease-out

        /* Hidden state (no layout jump) */
        ${isHidden ? "opacity-0 h-0 overflow-hidden pointer-events-none" : ""}

        /* Dragging animation (Notion-like feel) */
        ${
          isDragging
            ? "opacity-50 scale-[0.97] shadow-2xl rotate-[0.3deg] z-50"
            : "hover:shadow-md"
        }

        /* Edit mode highlight */
        ${editMode ? "ring-1 ring-blue-400/40" : ""}
      `}
    >
      {/* EDIT MODE CONTROLS */}
      {editMode && (
        <div className="absolute top-2 right-2 flex gap-2 items-center">
          {/* DRAG HANDLE */}
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            type="button"
            aria-label={`Drag widget ${id}`}
            className="
              cursor-grab
              active:cursor-grabbing
              text-lg
              px-2
              py-1
              rounded
              hover:bg-gray-100
              transition
            "
          >
            ☰
          </button>

          {/* HIDE BUTTON */}
          {onHide && (
            <button
              onClick={onHide}
              className="
                text-xs
                bg-red-500
                text-white
                px-2
                py-1
                rounded
                hover:bg-red-600
                transition
              "
            >
              Hide
            </button>
          )}
        </div>
      )}

      {/* CONTENT */}
      <div className="w-full h-full">{children}</div>
    </div>
  );
}