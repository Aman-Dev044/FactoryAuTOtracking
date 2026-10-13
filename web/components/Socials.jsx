import { LuLinkedin, LuFacebook, LuInstagram, LuYoutube } from 'react-icons/lu';

const ICONS = {
  linkedin: LuLinkedin,
  facebook: LuFacebook,
  instagram: LuInstagram,
  youtube: LuYoutube,
};

/**
 * Social icons.
 *
 * An entry renders as a real link once its url is filled in; while it is
 * empty the icon is plain decoration rather than a control that goes nowhere.
 * Fill the urls in lib/site.js.
 */
export default function Socials({ items, opacity = 0.8, size = '1rem' }) {
  return (
    <ul style={{ display: 'flex', gap: 14, fontSize: size }}>
      {items.map((s) => {
        const Icon = ICONS[s.key];
        if (!Icon) return null;

        return (
          <li key={s.key} style={{ display: 'flex' }}>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={s.label}
                style={{ display: 'flex', opacity, transition: 'opacity 0.2s ease' }}
              >
                <Icon />
              </a>
            ) : (
              <span aria-hidden="true" style={{ display: 'flex', opacity: opacity * 0.65 }}>
                <Icon />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
