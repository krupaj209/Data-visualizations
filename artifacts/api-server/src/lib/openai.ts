import OpenAI from "openai";

const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];

if (!baseURL || !apiKey) {
  // Soft warning — the verifier is optional; the pipeline degrades to
  // skipping verification rather than failing chart generation outright.
  // eslint-disable-next-line no-console
  console.warn(
    "OpenAI integration env vars missing — verification step will be skipped.",
  );
}

export const openai: OpenAI | null =
  baseURL && apiKey ? new OpenAI({ baseURL, apiKey }) : null;
