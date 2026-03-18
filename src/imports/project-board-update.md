Update the existing **project-board (Kanban Board)** layout to support scrollable columns and drag-and-drop task cards.

Maintain the ORIGIN design system:

* Same colors
* Same typography
* Same spacing system (8px grid)
* Same sidebar and header structure

---

DESKTOP KANBAN BOARD

Board Container

Create a horizontally scrollable board container that holds all Kanban columns.

Columns:

Backlog
To Do
In Progress
Review
Done

Columns should be displayed horizontally with spacing between them.

Allow the board container to scroll horizontally if more columns are added.

---

COLUMN DESIGN

Each column must have:

Column Header

* Column name
* Task count
* * Add Task button

Scrollable Task Area

The list of task cards inside the column must be vertically scrollable.

Column height should remain fixed.

If the number of tasks exceeds the visible area, the column becomes scrollable.

---

SCROLLBAR STYLE

Design a subtle scrollbar inside each column:

Scrollbar styling:

* color: translucent white / light grey
* opacity: 40–50%
* rounded edges
* very thin width

Scrollbar should appear inside the column container on the right side.

This scrollbar should match modern SaaS UI styling.

---

TASK CARDS

Task cards must include:

* Task title
* Project tag
* Priority label
* Due date
* Assignee avatar
* Comment indicator
* Subtask indicator

Cards should have:

* soft shadow
* rounded corners
* hover highlight state

Cards must stack vertically inside the column.

---

DRAG AND DROP INTERACTION

Visually indicate drag capability:

Add drag handle dots or subtle grab cursor icon on task cards.

Create visual interaction states:

1. Card being dragged

* Slight elevation shadow
* Slight transparency

2. Column drop highlight

* Light blue highlight outline
* Soft background glow

When a card is dragged over a column, the column should show a drop indicator.

---

COLUMN EMPTY STATE

If a column has no tasks:

Display placeholder text:

"No tasks in this stage"

Include "+ Add Task" button.

---

HORIZONTAL BOARD SCROLL

If the board width exceeds the screen:

Allow horizontal scrolling for columns.

Include subtle horizontal scrollbar at the bottom.

Style the scrollbar using the same translucent light grey design.

---

MOBILE VERSION

Update **project-board-mobile**.

Instead of showing all columns simultaneously:

Use swipeable column views.

Each column takes full screen width.

User can swipe left/right to move between columns.

Example order:

Backlog → To Do → In Progress → Review → Done

Task cards stack vertically and scroll within the column.

Include floating "+ Add Task" button.

---

INTERACTION STATES

Create example visual states for:

* Column with many tasks (scrollable)
* Card being dragged
* Column drop target highlighted
* Empty column
* Column with scrollbar visible

---

DESIGN RULES

* Maintain clean SaaS UI appearance
* Keep columns evenly spaced
* Ensure scrollable areas behave like modern Kanban boards
* Ensure board looks similar to tools like ClickUp or Jira
* Keep task cards compact but readable
