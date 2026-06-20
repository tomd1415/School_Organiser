# Neurodivergent-Supportive Navigation: 3 Menu System Proposals

**Purpose:** Provide logical, space-saving, and friction-free menu designs for a teacher with ADHD and autism (handling executive dysfunction, sensory overload, and working memory constraints).
**Companion documents:** [UI overhaul inputs](UI_OVERHAUL_DEVELOPER_INPUTS.md) · [Walkthrough](../walkthrough.md)

---

## 1. Option 1: The Context-Aware Time-Slice Header (The "Now" Dock Menu)

### 1.1 Overview & Visual Layout
This system replaces the persistent vertical sidebar with a compact, horizontal top header. The key innovation is **dynamic phase grouping**: the menu automatically swaps which shortcuts are shown in the primary bar based on the time of day, hiding irrelevant tasks to prevent executive decision paralysis.

```text
+-----------------------------------------------------------------------------------+
|  [🌅 Morning Prep]  [⚡ Year 9 CS (IT2)]  |  Timetable  Checklist  Captured  |  ⚑ SG |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                                                                                   |
|                               Active Screen Content                               |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

*   **Active Slot Indicator (Left):** Shows the current phase and the next immediate classroom coordinates (e.g., `⚡ Year 9 CS (IT2)`) as a large, clickable anchor.
*   **Contextual Pins (Middle):** Shows only the 3-4 pages needed *right now*:
    *   *Before School (08:00 - 08:35):* `Timetable` · `Prep Checklist` · `Captured Notes`
    *   *Teaching Lessons (08:35 - 15:30):* `Focus Screen` · `Class Seating Map` · `Oversee`
    *   *After School (15:30 - End):* `Marking Queue` · `Scheme Planner` · `Settings`
*   **Safeguarding (Right):** A persistent, high-contrast, always-visible red flag icon (`⚑ SG`).
*   **Curriculum & Admin Drawer (Right):** A single "All Admin" popover menu containing secondary links (Schemes, Concepts, Setup, Kit), keeping them hidden and distraction-free.

### 1.2 ADHD / ASD Accessibility Justifications
*   **Reduces Decision Fatigue:** By hiding admin links during lessons and classroom links after school, the brain isn't distracted by non-urgent obligations.
*   **Saves Width:** Removing the sidebar rail gives the main content (like code telemetry or seating grids) the entire width of the landscape monitor.
*   **Executive Scaffolding:** The large active anchor serves as a "working memory companion," showing exactly what lesson is next and where without searching the timetable.

---

## 2. Option 2: The Command Palette & Hover HUD (The "Calm HUD" System)

### 2.2 Overview & Visual Layout
This is a **zero-clutter, distraction-free** menu system. By default, the navigation rail is completely hidden. The teacher navigates using spatial muscle memory via mouse-hover or fast keyboard combos.

```text
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  Hover/Tap left edge  --->  +---------------+                                     |
|  to slide out HUD:          |     TODAY     |                                     |
|                             | [Now]  [Time] |                                     |
|                             +---------------+                                     |
|                             |   TEACHING    |                                     |
|                             | [Map] [Focus] |                                     |
|                             +---------------+                                     |
|                             |     ADMIN     |                                     |
|                             | [Mark] [Plan] |                                     |
|                             +---------------+                                     |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

*   **Slide-Out HUD (Mouse Interaction):** A thin, translucent vertical strip (12px wide) sits on the left screen edge. Hovering over or tapping this strip slides out a highly structured vertical command board.
*   **Keyboard Jump-Map (Keyboard Interaction):** Pressing `Space` twice (or typing `g` followed by a letter) immediately overlays a large, translucent command console:
    *   `g + h` -> Now Screen
    *   `g + t` -> Timetable
    *   `g + a` -> Marking Console
    *   `g + g` -> Safeguarding
*   **Spatial Grid Positioning:** Inside the HUD, menu buttons are arranged in a 3x3 grid with fixed spatial placement and high-contrast, color-coded icons to leverage spatial recall.

### 2.2 ADHD / ASD Accessibility Justifications
*   **Mitigates Sensory Overload:** Keeps 100% of the screen focused on the task at hand (e.g., student grading). There are no sidebars blinking or shifting colors in the peripheral vision.
*   **Lowers Motor Friction:** High-speed keyboard triggers allow the teacher to hop between lessons, seating charts, and checklists without having to execute precise mouse clicks on small links.
*   **Spatial Consistency:** Autistic individuals benefit from spatial predictability. Locking the grid icons to permanent, unchanging coordinates in the HUD builds deep muscle memory.

---

## 3. Option 3: The Collapsible 3-Tier Tab Ribbon (The "Scaffolded Ribbon" System)

### 3.1 Overview & Visual Layout
A vertical side ribbon that occupies very little horizontal space. It remains in an **icon-only** state (60px wide) to save screen width, and smoothly expands to full width (200px) when hovered.

```text
+---+-------------------------------------------------------------------------------+
| N |                                                                               |
| S |                                                                               |
| O |                                                                               |
|---|                                                                               |
| T |                                                                               |
| K |                             Active Screen Content                             |
| A |                                                                               |
|---|                                                                               |
| P |                                                                               |
| R |                                                                               |
+---+-------------------------------------------------------------------------------+
```

*   **Tier 1: Urgency & Safety (Top Group):** Pinned icons for `Now Screen` (N), `Safeguarding` (S), and `Oversee` (O). Safeguarding has a pulsing notification ring if there is an active alert.
*   **Tier 2: Daily Operations (Middle Group):** Contains `Timetable` (T), `Tasks` (K), and `Marking` (A).
*   **Tier 3: Prep & Advanced (Bottom Group):** Gated under a collapsible "Advanced" drawer that must be explicitly toggled, containing `Pupils` (P), `Resources` (R), and `Settings`.

### 3.1 ADHD / ASD Accessibility Justifications
*   **Preserves Spatial Stability:** Unlike menus that disappear, the ribbon is always there, providing a reliable visual anchor that does not shift the main content area when expanded.
*   **Space-Saving Default:** A 60px icon strip keeps the screen width clear for landscape multitasking.
*   **Visual Hierarchy of Importance:** Grouping by urgency prevents the teacher's attention from being pulled away by low-priority administrative tasks (Tier 3) during high-pressure classroom hours (Tier 1 & 2).

---

## 4. Comparison & Selection Matrix

| Feature / Criteria | Option 1: Time-Slice Header | Option 2: Command Calm HUD | Option 3: Scaffolded Ribbon |
|---|---|---|---|
| **Screen Space Used** | 80px Top (Horizontal) | 0px (Hidden by default) | 60px Left (Icon-only) |
| **Cognitive Load** | **Lowest** (shows only active tasks) | Medium (requires recall/hover) | Low (constant visual order) |
| **Access Speed** | Fast (one-click context tabs) | **Fastest** (keyboard hotkeys) | Fast (permanent icons) |
| **Best Used For** | Landscape Desk primary monitor | High-concentration focused tasks | Portrait secondary monitor |

### 💡 Recommendation for the 3-Screen Cockpit Setup
Since the teacher uses multiple screens:
1.  **Landscape Desk Screen (Primary):** **Option 1 (Context-Aware Time-Slice Header)** is recommended. It frees up all horizontal space for code telemetry/worksheets and matches the phase transitions of the day.
2.  **Portrait Companion Screen:** **Option 3 (Scaffolded Ribbon)** is recommended. A vertical ribbon naturally maps to the vertical orientation of a portrait monitor and provides a permanent visual anchor.
3.  **Keyboard Users:** Integrate the **Option 2 Command Palette hotkeys** (`g + key`) globally across all options, allowing the teacher to jump instantly regardless of the active menu layout.
