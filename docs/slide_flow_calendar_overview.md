# SlideFlow Calendar

## 1. What the SlideFlow Calendar Is

The SlideFlow Calendar is the place where users schedule their completed Instagram carousels.

Instead of tracking posts in spreadsheets or separate planning tools, users click a **Calendar** button on the main dashboard to open a dedicated Calendar page, where they see a familiar month-view layout and can drag finished carousels directly onto a specific day and time to schedule them for posting.

For the MVP, the calendar:
- Lives on its **own dedicated Calendar page**, accessible from the main SlideFlow dashboard via a "Go to Calendar" or "Calendar" button
- Shows **only the current month**
- Automatically respects the user’s local time zone
- Uses a **standard month grid** (weeks, weekdays, today highlight) so it feels instantly familiar

---

## 2. Layout & UI Structure

High-level layout for the Calendar page:

From the main dashboard, users click a **Calendar** button to open this dedicated scheduling page. Once there, the page layout is:

- **Left / Center:** Month-view calendar grid
  - One month visible at a time (MVP: current month only)
  - Each day cell can show scheduled carousels as small blocks/tags
  - Today is visually highlighted
- **Right side panel:** "Carousels" list
  - Scrollable list of completed carousels the user can schedule
  - Each list item is draggable and can be dropped onto the calendar

This keeps the mental model simple:

> **Right side = content to schedule**  →  **Calendar grid = when it will go live**

---

## 3. Carousel List Panel (Right Side)

The right-hand list is a structured, minimal view of the user’s completed carousels.

### 3.1 What Appears in the List

- Carousels with status `draft`
- Carousels with status `ready` (future behavior; for now everything is `draft`)
- Carousels that are **not yet posted**

Any carousel with status `posted` (or `published`) **does not appear** in this list and cannot be scheduled.

> Current MVP note: At this stage of SlideFlow, all carousels will appear with a `draft` status in the dashboard until we implement the full status pipeline. That means every existing carousel will show up in this list.

### 3.2 List Item Design

Each carousel in the list should display:

- **Thumbnail:** A small preview image using the **first slide** of that carousel
- **Title:** The carousel’s title (from the `carousel.title` field)
- **Status badge:** For now, `Draft` (later: `Ready`, `Posted`)

Optional future details (not required for MVP but good to keep in mind):
- Last updated date
- Associated brand profile
- Small icon indicating aspect ratio (square, 4:5, 9:16)

### 3.3 Interaction

- **Hover:** Slight elevation or glow to indicate the card is interactive
- **Drag handle:** Either the entire card is draggable, or a specific handle (e.g., icon on the left) is used to initiate drag
- **Click:** Opens the carousel detail view in a separate panel or page (non-MVP, or read-only for now)

---

## 4. Drag-and-Drop Scheduling Behavior

The core interaction of SlideFlow Calendar is drag-and-drop scheduling.

### 4.1 Scheduling a Carousel

User flow:

1. User opens the **Calendar** tab in the dashboard.
2. On the right, they see their list of completed carousels (all currently `draft`).
3. The user **clicks and holds** on a carousel item to start dragging it.
4. As they drag, valid drop targets (days in the month grid) are visually highlighted.
5. The user drops the carousel onto a specific day cell.
6. A **schedule modal** appears (or an inline popover) where the user:
   - Confirms the **date** (pre-filled from the day they dropped it onto)
   - Selects a **time of day**
   - (Future) Chooses which Instagram account to post to, if the user supports multiple accounts
7. The user clicks **Save / Schedule**.
8. The calendar now displays a small event block on that date representing the scheduled carousel.

### 4.2 Rescheduling via Drag-and-Drop

Once a carousel is scheduled, users should be able to adjust timing directly from the calendar:

- Drag the event **from one day cell to another** to change the date
- Optional future behavior: drag up/down within a day column to adjust the time
- When rescheduling, the event should update immediately in the UI; a confirmation modal is optional and can be deferred for later iterations

### 4.3 Handling Already Scheduled Carousels

MVP expectations:

- Once a carousel is scheduled, it **should not** remain in the right-hand unscheduled list to avoid confusion.
- Instead, the user sees it only on the calendar.
- If unscheduling is supported later, dragging the event off the calendar (back into the list, or into a “trash” zone) would clear the scheduled time.

For the very first version, we can:
- Hide scheduled carousels from the right panel
- Only show them in the calendar view itself

---

## 5. Time Zone Behavior

Time zone behavior must be predictable and safe. The calendar should:

- **Display the month and all times in the user’s local time zone**
- Use a consistent time zone across:
  - Calendar grid
  - Schedule modal
  - Any time pickers or labels

Under the hood, scheduled times can be stored in UTC, but what matters to the user is:

> “If I schedule this for 9:00 AM on the 15th, it will post at 9:00 AM in my local time.”

Future enhancements:
- User-selectable time zone in account settings
- Explicit "posting in [Time Zone]" label somewhere above the calendar

---

## 6. Visual Style & Calendar Behavior

### 6.1 Month View Only (MVP)

For the MVP:

- Only the **current month** is displayed.
- Users cannot navigate forward/backward to other months (or navigation controls are visually disabled).

This keeps implementation small and matches the early-stage feature set.

### 6.2 Calendar Look & Feel

The calendar should feel familiar and unobtrusive:

- Standard month layout **displayed Sunday through Saturday**
- Clear **today** indicator, with **today’s date outlined** so it stands out visually
- All days **before today** are clearly **greyed out** and visually de-emphasized
  - Past days are **not clickable**, **not droppable**, and cannot be interacted with
  - This makes it visually obvious that the user cannot schedule or edit posts on past dates
- Day cells with enough vertical space to show at least 2–3 scheduled carousels before overflowing
- Simple hover + selected states for days (future days only)

### 6.3 Event Appearance (Scheduled Carousels)

Each scheduled carousel event in the calendar cell can show:

- A small colored bar or pill with the **carousel title**
- Optional time label (e.g., "9:00 AM")
- Optional tiny thumbnail on hover or within the event pill

We should keep the calendar visually clean and legible over time, especially for creators who schedule many posts.

---

## 7. Statuses & Lifecycle (MVP Assumptions)

We already have carousel statuses defined at the database level (`draft`, `ready`, `posted`). For the calendar MVP, we can use a simplified lifecycle:

1. **Draft**  → Created and visible in the dashboard and right-hand list.
2. **Scheduled** → (Conceptually) a draft or ready carousel that now has a scheduled date/time in the calendar.
3. **Posted** → After a successful Instagram post, the carousel’s status becomes `posted`, and:
   - It is removed from the right-hand list
   - It is removed from the calendar view and cannot be scheduled again

MVP behavior in practice:

- All carousels start as `draft`.
- Scheduling does not immediately change the status name in the UI yet (we can still label them visually as "Scheduled" on the calendar), but we plan to map this to `ready`/`posted` later.
- Once posting is confirmed, status moves to `posted`, and the carousel no longer appears in the "to schedule" list or on the calendar.

---

## 8. MVP Boundaries and Non-Goals

To keep SlideFlow Calendar focused for MVP, the first version will **not** include:

- Week or day view
- Recurring posts or repeating schedules
- Advanced time zone controls (beyond auto-detection)
- Multi-account management (assume a single connected Instagram account)
- Analytics, insights, or performance overlays on the calendar

The goal is to ship a **simple, reliable scheduling calendar** that:
- Shows the current month
- Lets users drag carousels onto specific days
- Lets them pick a time in their local time zone
- Clearly displays what is scheduled

This pairs directly with SlideFlow’s core promise: upload, arrange, caption, and publish carousels without touching a design tool.
