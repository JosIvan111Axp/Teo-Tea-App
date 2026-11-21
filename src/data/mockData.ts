import {
  bookOutline,
  eyeOutline,
  handLeftOutline,
  helpCircleOutline,
  informationCircleOutline,
  peopleCircleOutline,
} from 'ionicons/icons';

export type LibraryArticle = {
  id: string;
  title: string;
  summary: string;
  icon: string;
  paragraphs: string[];
};

export type AccountType = 'user' | 'moderator' | 'admin';

/** Página en la que se abre la app al iniciar sesión. */
export type StartPage = 'inicio' | 'biblioteca' | 'musica' | 'comunidad';

export type CommunityComment = {
  id: string;
  authorId: string;
  author: string;
  authorType?: AccountType;
  authorAvatar?: string | null;
  text: string;
  createdAt: number;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  author: string;
  role: string;
  authorType?: AccountType;
  authorAvatar?: string | null;
  createdAt: number;
  body: string;
  likedBy: string[];
  comments: CommunityComment[];
  /** Imagen comprimida como data URL (prototipo: se guarda en el navegador). */
  image?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  profession: string;
  birthdate: string;
  city: string;
  country: string;
  bio: string;
  skills: string[];
  interests: string[];
  accountType?: AccountType;
  startPage?: StartPage;
  /** Ruta relativa de la foto de perfil en el servidor (null = sin foto). */
  avatar?: string | null;
  communityRulesAccepted?: boolean;
  communityFrozenUntil?: number | null;
  communityFreezeReason?: string;
};

export type FoundationLink = { label: string; url: string; kind: 'web' | 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'donar' };

export type FoundationInfo = {
  name: string;
  tagline: string;
  description: string;
  pillars: { title: string; description: string; icon: string }[];
  mission: string;
  vision: string;
  website: string;
  links: FoundationLink[];
};


export const mockData: {
  articles: LibraryArticle[];
  foundation: FoundationInfo;
} = {
  articles: [
    {
      id: 'que-es-tea',
      title: '¿Qué es el TEA?',
      summary: 'Una forma de entender la diversidad en la comunicación y la experiencia.',
      icon: informationCircleOutline,
      paragraphs: [
        'El trastorno del espectro autista (TEA) es una condición del neurodesarrollo. Influye, de maneras distintas en cada persona, en la comunicación, la interacción social y la forma de percibir el entorno.',
        'Se habla de espectro porque las características, fortalezas y necesidades de apoyo varían mucho entre personas. No existe una única manera de ser autista.',
        'Un entorno comprensivo, información accesible y apoyos elegidos junto con la persona pueden facilitar su participación y bienestar.',
      ],
    },
    {
      id: 'que-no-es-autismo',
      title: '¿Qué no es el autismo?',
      summary: 'Mitos frecuentes y una mirada respetuosa centrada en cada persona.',
      icon: helpCircleOutline,
      paragraphs: [
        'El autismo no es una enfermedad contagiosa ni el resultado de una crianza incorrecta. Las personas autistas son diversas y no deben reducirse a estereotipos.',
        'No hay una sola apariencia, habilidad o manera de comunicarse que permita identificar a todas las personas autistas. Algunas necesidades de apoyo pueden ser visibles y otras no.',
        'Escuchar a la persona, respetar sus límites y preguntar qué apoyos le sirven es mejor que asumir lo que necesita.',
      ],
    },
    {
      id: 'hipersensibilidad',
      title: 'Hipersensibilidad sensorial',
      summary: 'Cómo los estímulos del entorno pueden sentirse con más o menos intensidad.',
      icon: eyeOutline,
      paragraphs: [
        'Algunas personas autistas perciben sonidos, luces, texturas, olores o sabores con una intensidad diferente. Otras pueden buscar ciertos estímulos o notar menos algunos de ellos.',
        'La experiencia sensorial cambia según la persona, el momento y el contexto. Un espacio ruidoso o con luz intensa puede resultar agotador para alguien, mientras que otra persona puede sentirse cómoda allí.',
        'Ofrecer opciones —como reducir el ruido, ajustar la iluminación o tomar una pausa— ayuda a que cada persona encuentre lo que le resulta más cómodo.',
      ],
    },
  ],
  // Información tomada de https://fundacionsenderoazul.org/ (revisada en noviembre de 2026).
  foundation: {
    name: 'Fundación Sendero Azul',
    tagline: 'Familias comprometidas con la inclusión',
    description:
      'Somos familias comprometidas que trabajan por las personas con Trastorno del Espectro Autista, disfasia, TDAH, trastorno obsesivo compulsivo u otras condiciones intelectuales, brindando atención y asesoría a ellas y a sus familias.',
    pillars: [
      {
        title: 'Atención y asesoría',
        description: 'Acompañamiento a personas y a sus familias.',
        icon: handLeftOutline,
      },
      {
        title: 'Club Senderos',
        description: 'Aprender habilidades sociales, motricidad y valores a través del juego, guiados por profesionales.',
        icon: peopleCircleOutline,
      },
      {
        title: 'Autonomía e inclusión',
        description: 'Desarrollar habilidades para una vida independiente y la inclusión laboral.',
        icon: bookOutline,
      },
    ],
    mission:
      'Acoger a las personas con TEA, disfasia, TDAH, TOC u otras condiciones intelectuales y a sus familias, para desarrollar sus habilidades, cualidades y capacidades, y lograr su inclusión en la sociedad económicamente activa como personas autónomas e independientes.',
    vision:
      'Crear proyectos autosustentables donde trabajen personas con TEA y condiciones similares, y centros especializados de acogida, siendo un referente nacional e internacional en inclusión.',
    website: 'https://fundacionsenderoazul.org/',
    links: [
      { label: 'Sitio web', url: 'https://fundacionsenderoazul.org/', kind: 'web' },
      { label: 'WhatsApp', url: 'https://wa.me/593983978052', kind: 'whatsapp' },
      { label: 'Facebook', url: 'https://www.facebook.com/funsendazul/', kind: 'facebook' },
      { label: 'Instagram', url: 'https://www.instagram.com/fundacionsenderoazul/', kind: 'instagram' },
      { label: 'TikTok', url: 'https://www.tiktok.com/@funsendazul', kind: 'tiktok' },
      { label: 'YouTube', url: 'https://www.youtube.com/channel/UC0kc7YIYNBJaiOyn1_wnxRA', kind: 'youtube' },
      { label: 'Donar', url: 'https://fundacionsenderoazul.org/Boton-Donacion-con-Paypal-master/index.html', kind: 'donar' },
    ],
  },
};
