import {
  eyeOutline,
  helpCircleOutline,
  informationCircleOutline,
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
  author: string;
  text: string;
};

export type CommunityPost = {
  id: string;
  author: string;
  role: string;
  time: string;
  body: string;
  likes: number;
  isLiked: boolean;
  comments: CommunityComment[];
  attachmentName?: string;
};

export type UserProfile = {
  name: string;
  username: string;
  role: string;
  profession: string;
  age: number;
  city: string;
  country: string;
  bio: string;
  skills: string[];
  interests: string[];
};

export const mockData: {
  articles: LibraryArticle[];
  posts: CommunityPost[];
  profile: UserProfile;
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
      author: 'Marina López',
      role: 'Persona TEA',
      time: 'Hace 2 horas',
      body: 'Hoy probé usar una lista visual para organizar mi mañana. Me ayudó a empezar con más calma. ¿Qué herramientas les sirven a ustedes?',
      likes: 8,
      isLiked: false,
      comments: [
        {
          id: 'comment-1',
          author: 'Sofía Herrera',
          text: 'A mí también me ayudan mucho las listas. Gracias por compartirlo.',
        },
      ],
    },
    {
      id: 'post-2',
      author: 'Sofía Herrera',
      role: 'Familiar de persona con TEA',
      time: 'Ayer',
      body: 'Estamos aprendiendo a preguntar qué apoyos son útiles en lugar de suponer. Escuchar con atención hace una gran diferencia.',
      likes: 12,
      isLiked: false,
      comments: [],
    },
    {
      id: 'post-3',
      author: 'Diego Ramírez',
      role: 'Persona neurodivergente',
      time: 'Hace 2 días',
      body: 'Un recordatorio amable: está bien pedir instrucciones por escrito o solicitar una pausa cuando la necesitas.',
      likes: 6,
      isLiked: false,
      comments: [],
    },
  ],
  profile: {
    name: 'Marina López',
    username: '@marina.lopez',
    role: 'Persona TEA',
    profession: 'Diseñadora gráfica',
    age: 29,
    city: 'Medellín',
    country: 'Colombia',
    bio: 'Me gusta compartir ideas visuales, aprender cosas nuevas y encontrar formas tranquilas de organizar el día.',
    skills: ['Diseño gráfico', 'Ilustración', 'Organización visual'],
    interests: ['Ilustración', 'Naturaleza', 'Música'],
  },
};
