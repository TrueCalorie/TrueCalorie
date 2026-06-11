---
name: wrap-session
description: End-of-session ritual. Updates CONTEXT.md with everything that changed since its last update, shows the diff for approval, commits only on explicit go-ahead.
---

# Wrap Session

You are updating CONTEXT.md, the canonical project-state document. Errors written into this file propagate to every future session. Follow these steps exactly.

## 1. Establish the window
Find the last commit that touched CONTEXT.md:
git log -1 --format="%h %ad" --date=short -- CONTEXT.md
Everything between that commit and HEAD is the update window. List it:
git log --oneline <that-hash>..HEAD

## 2. Gather inputs
- The commits and diffs in the window.
- Anything Jackson pasted after invoking this command (changelog blocks from claude.ai strategy chats).
- Notable decisions from this session's conversation.

## 3. Edit CONTEXT.md surgically
- Touch ONLY the sections affected: shipped table (with commit hashes), known gaps, roadmap, learnings, operational reference.
- Do NOT rewrite, condense, reorder, or delete existing content unless it is directly superseded by something in this window.
- If something looks obsolete but is not directly superseded, flag it in your summary; do not remove it.
- Update the "Last updated" line with today's date and the current HEAD short hash.

## 4. Review gate
- Show the full diff of CONTEXT.md.
- Summarize in 3 to 5 bullets: what was added, what changed, what (if anything) was removed and why.
- STOP. Do not commit until Jackson explicitly approves.

## 5. On approval
- Commit on the current branch (normally local main, after the session's feature work has merged) with message: docs: wrap session YYYY-MM-DD
- Report the commit hash.
- Remind Jackson: push when ready, then click "Sync now" in the claude.ai project.
