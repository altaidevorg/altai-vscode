/**
 * Pure validation for Operations new-task form drafts.
 */

export type TaskRunDraft = {
  title: string;
  prompt: string;
};

export type TaskRunDraftResult =
  | { ok: true; draft: TaskRunDraft }
  | { ok: false; error: string };

const MAX_TITLE = 120;
const MAX_PROMPT = 20_000;

/**
 * Trim and validate host-owned title/prompt before `work.createTaskRun`.
 */
export function validateTaskRunDraft(input: {
  title: string;
  prompt: string;
}): TaskRunDraftResult {
  const title = input.title.trim();
  const prompt = input.prompt.trim();
  if (!title) {
    return { ok: false, error: "Title is required." };
  }
  if (title.length > MAX_TITLE) {
    return { ok: false, error: `Title must be at most ${MAX_TITLE} characters.` };
  }
  if (!prompt) {
    return { ok: false, error: "Instruction prompt is required." };
  }
  if (prompt.length > MAX_PROMPT) {
    return {
      ok: false,
      error: `Prompt must be at most ${MAX_PROMPT} characters.`,
    };
  }
  return { ok: true, draft: { title, prompt } };
}
