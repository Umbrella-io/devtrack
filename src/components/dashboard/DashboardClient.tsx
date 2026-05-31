"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import SortableWidget from "./SortableWidget";

// Widgets
import StreakTracker from "@/components/StreakTracker";
import CommunityMetrics from "@/components/CommunityMetrics";
import GoalTracker from "@/components/GoalTracker";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import PersonalRecords from "@/components/PersonalRecords";
import { AIMentorWidget } from "@/components/AIMentorWidget";
import ContributionGraph from "@/components/ContributionGraph";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";

const DEFAULT_LAYOUT = [
  "streakAtRisk",
  "weeklySummary",
  "personalRecords",
  "aiMentor",
  "streak",
  "community",
  "goals",
  "contribution",
];

export default function DashboardClient() {
  const [items, setItems] = useState<string[]>(DEFAULT_LAYOUT);
  const [hidden, setHidden] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getUserId = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("devtrack-user-id");
  };

  // 🔥 DEBUG (REMOVE LATER IF YOU WANT)
  useEffect(() => {
    console.log("🔥 DashboardClient mounted");
  }, []);

  // LOAD FROM SUPABASE
  useEffect(() => {
    const loadLayout = async () => {
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("dashboard_layouts")
        .select("layout")
        .eq("user_id", userId)
        .single();

      if (!error && data?.layout) {
        setItems(data.layout.items || DEFAULT_LAYOUT);
        setHidden(data.layout.hidden || []);
      } else {
        const saved = localStorage.getItem("devtrack-dashboard-layout");
        const hiddenSaved = localStorage.getItem("devtrack-dashboard-hidden");

        if (saved) setItems(JSON.parse(saved));
        if (hiddenSaved) setHidden(JSON.parse(hiddenSaved));
      }

      setLoading(false);
    };

    loadLayout();
  }, []);

  // LOCAL STORAGE BACKUP
  useEffect(() => {
    localStorage.setItem("devtrack-dashboard-layout", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem("devtrack-dashboard-hidden", JSON.stringify(hidden));
  }, [hidden]);

  // SAVE TO SUPABASE
  const saveToDB = async (newItems: string[], newHidden: string[]) => {
    const userId = getUserId();
    if (!userId) return;

    await supabase.from("dashboard_layouts").upsert({
      user_id: userId,
      layout: { items: newItems, hidden: newHidden },
    });
  };

  // 🔥 FIXED EDIT MODE TOGGLE
  const toggleEditMode = () => {
    setEditMode((prev) => {
      const next = !prev;

      // Save ONLY when exiting edit mode
      if (prev && !next) {
        saveToDB(items, hidden);
        console.log("💾 Layout saved");
      }

      return next;
    });
  };

  // DRAG (NO DB CALL HERE)
  function handleDragEnd(event: DragEndEvent) {
    if (!editMode) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);

      if (oldIndex === -1 || newIndex === -1) return prev;

      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  // TOGGLE VISIBILITY
  function toggleWidget(id: string) {
    setHidden((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // RESET
  function resetLayout() {
    setItems(DEFAULT_LAYOUT);
    setHidden([]);
    saveToDB(DEFAULT_LAYOUT, []);
  }

  const renderWidget = (id: string) => {
    switch (id) {
      case "streakAtRisk":
        return <StreakAtRiskBanner />;
      case "weeklySummary":
        return <WeeklySummaryCard />;
      case "personalRecords":
        return <PersonalRecords />;
      case "aiMentor":
        return <AIMentorWidget />;
      case "streak":
        return <StreakTracker />;
      case "community":
        return <CommunityMetrics />;
      case "goals":
        return <GoalTracker />;
      case "contribution":
        return <ContributionGraph />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-sm opacity-60">Loading dashboard layout...</div>;
  }

  return (
    <div className="mt-6">

      {/* 🔥 CLEAR VISUAL STATE */}
      <div className={`mb-3 text-sm font-semibold ${editMode ? "text-green-600" : "text-gray-500"}`}>
        {editMode ? "✏️ EDIT MODE ACTIVE (Drag enabled)" : "🔒 VIEW MODE (Drag disabled)"}
      </div>

      {/* HEADER */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={toggleEditMode}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          {editMode ? "Save Layout" : "Edit Layout"}
        </button>

        <button
          onClick={resetLayout}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Reset
        </button>
      </div>

      {/* DRAG AREA */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {items
              .filter((id) => !hidden.includes(id))
              .map((id) => (
                <SortableWidget
                  key={id}
                  id={id}
                  editMode={editMode}
                  isHidden={hidden.includes(id)}
                  onHide={() => toggleWidget(id)}
                >
                  {renderWidget(id)}
                </SortableWidget>
              ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}