import { mediaUrl } from '../lib/api.js'

// Videos do not preload their media data until the visitor interacts with the player.
// The poster image can be shown before playback when one is available.
export const Video = ({ src, poster, className = '' }) => {
  if (!src) return null

  return (
    <video
      src={mediaUrl(src)}
      poster={poster ? mediaUrl(poster) : undefined}
      controls
      preload="none"
      playsInline
      className={`w-full rounded-2xl bg-black ${className}`}
    >
      Your browser does not support HTML video.
    </video>
  )
}
