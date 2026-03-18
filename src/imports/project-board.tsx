Using the existing ORIGIN Project Tracker design system and layout, create a **Kanban Board view inside the Project Detail section** for both desktop and mobile versions.

Maintain:
• Same color system
• Same typography
• 8px spacing system
• Clean enterprise SaaS layout
• Same sidebar and top navigation used in dashboard and projects pages

---

DESKTOP VERSION

Create a new page:

**project-board**

This page represents the **Board view inside a selected project**.

Layout Structure:

Top Section:
• Breadcrumb navigation: Projects / Project Name
• Project title (example: "Client Website Redesign")
• Project status badge
• Member avatars
• "+ Add Task" button

Below the header include a **view switcher navigation**:

Overview | Board | List | Calendar | Activity

The **Board tab should be active**.

---

KANBAN BOARD LAYOUT

Create a horizontally scrollable Kanban board with columns.

Columns should include:

• Backlog
• To Do
• In Progress
• Review
• Done

Each column should contain:

Column Header
• Column title
• Task count
• Add task button (+)

Task Cards

Each task card includes:
• Task title
• Small project tag
• Priority label (Low / Medium / High)
• Due date
• Assignee avatar
• Small comment icon
• Drag handle indicator

Cards should appear stacked vertically inside each column.

Columns should be placed horizontally across the screen with:

• consistent spacing
• subtle card shadows
• scrollable horizontal container

Ensure the task card design matches the current ORIGIN UI styling.

---

INTERACTION STATES

Create example cards showing:

• Normal task
• High priority task
• Task with multiple assignees
• Completed task (dimmed style)

---

MOBILE VERSION

Create another page:

**project-board-mobile**

Layout optimized for mobile.

Top Section:
• Back arrow
• Project name
• View switcher tabs

Tabs should be horizontally scrollable:

Overview | Board | List | Calendar | Activity

Board tab should be active.

---

MOBILE KANBAN LAYOUT

Use **swipeable columns** instead of full-width horizontal board.

Each column occupies the full width of the screen.

Example columns:

Backlog
To Do
In Progress
Review
Done

User can swipe left or right to move between columns.

Each column contains vertically stacked task cards using the same card design as desktop.

Include:

• "+ Add Task" floating button
• Scrollable task list inside each column

---

DESIGN RULES

• Maintain the ORIGIN UI visual system
• Use consistent spacing and layout grid
• Ensure columns are clearly separated
• Keep task cards compact and readable
• Match the design language used in dashboard and projects pages

Place these pages next to the existing **projects** pages.

These represent the **Board view inside each project**.
