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

export type CommunityComment = {
  id: string;
  authorId: string;
  author: string;
  authorType?: AccountType;
  text: string;
  createdAt: number;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  author: string;
  role: string;
  authorType?: AccountType;
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
};

export type FoundationInfo = {
  name: string;
  tagline: string;
  description: string;
  pillars: { title: string; description: string; icon: string }[];
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
  // Texto provisional: reemplázalo con la información oficial de la fundación.
  foundation: {
    name: 'Fundación Sendero Azul',
    tagline: 'Acompañando caminos diversos',
    description:
      'TEO + TEA es un espacio impulsado por Fundación Sendero Azul para que personas autistas, sus familias y la comunidad encuentren información, apoyo y oportunidades en un entorno respetuoso.',
    pillars: [
      {
        title: 'Acompañamiento',
        description: 'Orientación cercana para personas y familias.',
        icon: handLeftOutline,
      },
      {
        title: 'Información accesible',
        description: 'Contenidos claros sobre el TEA y la neurodiversidad.',
        icon: bookOutline,
      },
      {
        title: 'Comunidad inclusiva',
        description: 'Redes de apoyo y espacios para conectar.',
        icon: peopleCircleOutline,
      },
    ],
  },
};
