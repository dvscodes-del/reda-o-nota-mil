import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: "AQ.Ab8RN6JzuQAsXBBVWD3EOq8gUHktatVbLi_zqnJcjWQ9-iw_5w",
});

async function run() {
  try {
    const res = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: z.object({ msg: z.string() }),
      prompt: "say hi",
    });
    console.log(res.object);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
run();
