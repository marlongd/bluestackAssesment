## Design Decisions

### 1. Real-Time Collaboration vs. Simplicity

My initial idea was to build a live collaborative note-taking tool where users could edit notes in real time. However, given the time constraints, I decided to simplify the implementation by updating notes through a `POST` request. This allowed me to focus on delivering a solid core experience while keeping the architecture straightforward.

### 2. Note Visibility and Sharing

Another design decision was determining who could access a note. Rather than restricting notes to individual users or making them globally visible, I chose to share notes at the team level. This approach encourages collaboration while maintaining a reasonable separation between different groups.

---

## Future Improvements

If I had additional time, I would focus on the following enhancements:

- ✅ Real-time collaborative editing
- ✅ Screenshot embedding within notes
- ✅ Improved file upload experience and attachment management
- ✅ Rich text formatting support
- ✅ User permissions and access controls

### Optimize Note Storage

The current implementation sends the entire file whenever a user saves a new version of a note. While this keeps the solution simple, it becomes increasingly inefficient as files grow larger.

A better approach would be to implement incremental updates (diffs/deltas), where only the changes are transmitted and stored. This would reduce bandwidth usage, improve performance, and scale more effectively for larger documents and more active teams.

---

## Trade-offs

To complete the project within the available timeframe, I prioritized:

- Simplicity over real-time synchronization
- Team-based sharing over complex permission management
- Functionality over advanced optimization

These choices allowed me to deliver a working solution while leaving clear opportunities for future improvements.
