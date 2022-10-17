import { VideoJsPlayer } from './video_js';

function getPlayer(): VideoJsPlayer {
  return new VideoJsPlayer();
}

export { VideoJsPlayer };
export default getPlayer;
