

## Plan: Add Markdown Rendering to Chat + Test AI

### What needs to change

Both `ChatPage.tsx` and `SubjectHubPage.tsx` render AI responses as plain `whitespace-pre-wrap` text. AI responses contain markdown (bold, headers, code blocks, lists) that should render properly.

### Steps

1. **Install `react-markdown` and `remark-gfm`** — for markdown parsing and GitHub-flavored markdown support (tables, strikethrough, etc.)

2. **Create a `MarkdownMessage` component** (`src/components/MarkdownMessage.tsx`)
   - Uses `react-markdown` with `remark-gfm`
   - Styled with Tailwind prose classes for clean typography
   - Code blocks get syntax-highlighted styling with a dark background
   - Inline code gets distinct styling

3. **Update `ChatPage.tsx`** — Replace the raw `{msg.content || "…"}` with `<MarkdownMessage content={msg.content} />` for assistant messages. Keep user messages as plain text.

4. **Update `SubjectHubPage.tsx`** — Same change as ChatPage.

5. **Test the AI chat end-to-end** using browser automation to verify streaming + markdown rendering works.

