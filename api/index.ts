import { createApp } from "../server/app";

// Vercel owns the HTTP listener; workers run as separate services.
export default createApp();
