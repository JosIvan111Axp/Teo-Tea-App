import { useState } from 'react';
import { mediaUrl } from '../api/client';
import { getInitials } from '../utils/helpers';
import './UserAvatar.css';

type Props = {
  name: string;
  avatar?: string | null;
  size?: number;
  className?: string;
};

/** Foto de perfil o, si no hay, las iniciales del nombre. */
const UserAvatar: React.FC<Props> = ({ name, avatar, size = 44, className = '' }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = mediaUrl(avatar);
  const showImage = src && failedSrc !== src;
  return (
    <span
      className={`user-avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {showImage ? <img src={src} alt="" onError={() => setFailedSrc(src)} /> : getInitials(name)}
    </span>
  );
};

export default UserAvatar;
