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

export type CommunityComment = {
  id: string;
  authorId: string;
  author: string;
  text: string;
  createdAt: number;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  author: string;
  role: string;
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
};

export type FoundationInfo = {
  name: string;
  tagline: string;
  description: string;
  pillars: { title: string; description: string; icon: string }[];
};

const HOUR = 60 * 60 * 1000;
const seedTime = Date.now();

export const mockData: {
  articles: LibraryArticle[];
  posts: CommunityPost[];
  profile: UserProfile;
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
  posts: [
    {
      id: 'post-1',
      authorId: 'demo-marina',
      author: 'Marina López',
      role: 'Persona TEA',
      createdAt: seedTime - 2 * HOUR,
      body: 'Hoy probé usar una lista visual para organizar mi mañana. Me ayudó a empezar con más calma. ¿Qué herramientas les sirven a ustedes?',
      likedBy: ['seed-sofia', 'seed-diego'],
      comments: [
        {
          id: 'comment-1',
          authorId: 'seed-sofia',
          author: 'Sofía Herrera',
          text: 'A mí también me ayudan mucho las listas. Gracias por compartirlo.',
          createdAt: seedTime - HOUR,
        },
      ],
    },
    {
      id: 'post-2',
      authorId: 'seed-sofia',
      author: 'Sofía Herrera',
      role: 'Familia de persona con TEA',
      createdAt: seedTime - 26 * HOUR,
      body: 'Estamos aprendiendo a preguntar qué apoyos son útiles en lugar de suponer. Escuchar con atención hace una gran diferencia.',
      likedBy: ['seed-diego'],
      comments: [],
    },
    {
      id: 'post-3',
      authorId: 'seed-diego',
      author: 'Diego Ramírez',
      role: 'Sin diagnóstico',
      createdAt: seedTime - 50 * HOUR,
      body: 'Un recordatorio amable: está bien pedir instrucciones por escrito o solicitar una pausa cuando la necesitas.',
      likedBy: [],
      comments: [],
    },
  ],
  profile: {
    id: 'demo-marina',
    email: 'demo@teotea.app',
    name: 'Marina López',
    username: '@marina.lopez',
    role: 'Persona TEA',
    profession: 'Diseñadora gráfica',
    birthdate: '1997-04-12',
    city: 'Medellín',
    country: 'Colombia',
    bio: 'Me gusta compartir ideas visuales, aprender cosas nuevas y encontrar formas tranquilas de organizar el día.',
    skills: ['Diseño gráfico', 'Ilustración', 'Organización visual'],
    interests: ['Ilustración', 'Naturaleza', 'Música'],
  },
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
