import { app, InvocationContext, Timer } from "@azure/functions";

export async function darwin(
  myTimer: Timer,
  context: InvocationContext,
): Promise<void> {
  context.log("Timer function processed request.");
}

app.timer("darwin", {
  schedule: "0 */5 * * * *",
  handler: darwin,
});
