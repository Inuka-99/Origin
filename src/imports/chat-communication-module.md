Using the existing ORIGIN design system and dashboard layout as the base, create a full chat and communication module for both desktop and mobile.

Maintain:

Same brand colors

Same typography

8px spacing system

Clean enterprise SaaS design

No gradients

Same sidebar and top navigation styling

DESKTOP VERSION

Create a new frame:

Chat – Desktop

Layout structure:

1. Left Chat Sidebar (Fixed Width)

Search bar at top

Section: Groups

Section: Direct Messages

Each item shows:

Avatar icon

Name

Last message preview

Timestamp

Unread badge

“+ New Group” button

“+ New Message” button

2. Main Chat Panel

Top Bar:

Group or DM name

Member count

Member avatars

Thread dropdown selector

“Create Thread” button

Search icon

Settings icon

Message Area:

Scrollable message list

Message bubbles aligned left/right

Timestamp under messages

Read indicator

Emoji reaction option

Mention support visual (@username)

Input Area:

Text input field

Attach file icon

Emoji icon

Send button

“Convert to Task” option (icon placeholder)

3. Thread Panel (Optional Right Panel)

When viewing a thread:

Show thread title

Thread message list

Back to main channel link

GROUP CREATION MODAL

Create overlay frame:

Create Group – Modal

Include:

Group name input

Description textarea

Add members search

Privacy toggle (Public / Private)

Create button

CREATE THREAD MODAL

Overlay frame:

Thread title

Initial message field

Create thread button

DIRECT MESSAGE VIEW

Same layout as group chat but:

No thread dropdown

Show user profile header

Online status indicator

MOBILE VERSION

Create new frame:

Chat – Mobile

Layout structure:

Screen 1 – Chat List

Search bar

Tabs: Groups | Direct

Scrollable list of chats

Unread badges

Screen 2 – Conversation View

Back arrow

Chat name

Member avatar

Scrollable messages

Input at bottom

Attach + Emoji icons

Send button

Screen 3 – Create Group

Full screen form

Same inputs as desktop modal

INTERACTION STATES

Create separate frames showing:

Chat with unread messages

Typing indicator state

Empty state (no messages yet)

Message with reactions

Mention highlight state

DESIGN RULES

Maintain consistent padding (16–24px)

Use subtle message bubble styling

Keep chat clean and structured

Ensure scrollable areas use overflow behavior

Desktop = multi-column layout

Mobile = full screen stacked layout