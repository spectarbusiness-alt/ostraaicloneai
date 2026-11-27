# Project memory

## Product intent & audience

- AI chat application supporting multiple AI providers/models (Gemini, Groq, Cerebras, Mistral slots).
- Users can send chat messages and receive streamed AI-generated answers from selected models.

## Brand personality & voice

- Tone inferred as helpful, technical, concise. More specifics TBD.

## Visual design & UX direction

- Chat interface with streaming responses (answers appear incrementally as generated).
- No detailed design tokens, components, or layout specs inferred yet.

## Decisions, constraints & rationale

- API keys are stored server-side in `.env.local`; never exposed to the browser.
- `.env.local` is gitignored — keys are kept out of version control.
- App pre-existed with server-side code reading `GROQ_API_KEY` through `GROQ_API_KEY_4`; no code changes were needed to wire keys.
- Four Groq key slots are configured (likely for rotation or parallel provider slots).
- Dev server must be restarted to load newly added env files.
- Groq keys are consumed when AI calls occur; answers are streamed back into the chat.

## Open questions & assumptions

- Framework is unspecified; inferred server-side key handling and streaming suggest a Next.js-style or similar fullstack setup.
- Whether non-Groq providers (Gemini, Cerebras, Mistral) have keys configured is unknown.
- UX/brand direction and UI specifics not yet established.
- Key rotation strategy and per-slot assignment behavior are not confirmed.