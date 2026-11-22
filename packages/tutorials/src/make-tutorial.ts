import { parseTutorialRunOptions } from "./lib/cli-arguments";
import { recordTutorial } from "./record/record-tutorial";
import { renderTutorial } from "./render/render-tutorial";

const options = parseTutorialRunOptions(process.argv.slice(2));
await recordTutorial(options);
const videos = await renderTutorial(options);
console.log(`Done. ${videos.length} video(s), each with captions.vtt, transcript.txt and poster.jpg beside it:`);
console.log(videos.join("\n"));
