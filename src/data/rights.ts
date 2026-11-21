/**
 * Leyes y Derechos: resumen informativo por país.
 * ⚠ No es asesoría legal. Las normas cambian: revisar periódicamente con un profesional
 *   y actualizar REVIEWED_AT. Cada país tiene su sección laboral y de protección al ciudadano.
 */

export type CountryCode = 'ecuador' | 'colombia' | 'peru' | 'venezuela';
export type RightsArea = 'laboral' | 'ciudadano';

export type LawItem = {
  name: string;
  /** Año o referencia corta (p. ej. "2012", "Art. 26"). */
  tag?: string;
  summary: string;
  points: string[];
};

export type HelpContact = { name: string; description: string };

export type CountryRights = {
  intro: string;
  laws: LawItem[];
  help: HelpContact[];
};

export const REVIEWED_AT = 'noviembre de 2026';

export const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: 'ecuador', label: 'Ecuador' },
  { code: 'colombia', label: 'Colombia' },
  { code: 'peru', label: 'Perú' },
  { code: 'venezuela', label: 'Venezuela' },
];

export const AREAS: { code: RightsArea; label: string; description: string }[] = [
  {
    code: 'laboral',
    label: 'Laborales',
    description: 'Tus derechos al buscar empleo y en el trabajo: inclusión, estabilidad y no discriminación.',
  },
  {
    code: 'ciudadano',
    label: 'Protección al ciudadano',
    description: 'Derechos como persona, consumidor y titular de datos, y a dónde acudir si no se respetan.',
  },
];

export const rights: Record<RightsArea, Record<CountryCode, CountryRights>> = {
  laboral: {
    ecuador: {
      intro:
        'En Ecuador, la Constitución y la Ley Orgánica de Discapacidades protegen el derecho al trabajo de las personas con discapacidad y obligan a las empresas a incluirlas.',
      laws: [
        {
          name: 'Constitución de la República del Ecuador',
          tag: '2008 · Art. 47',
          summary: 'Reconoce a las personas con discapacidad el derecho al trabajo en igualdad de oportunidades.',
          points: [
            'El trabajo debe darse en condiciones que fomenten tus capacidades y potencialidades.',
            'Está prohibida la discriminación por discapacidad.',
          ],
        },
        {
          name: 'Ley Orgánica de Discapacidades',
          tag: '2012',
          summary: 'Establece la cuota de inclusión laboral y protecciones especiales en el empleo.',
          points: [
            'Los empleadores con 25 o más trabajadores deben contratar al menos un 4% de personas con discapacidad.',
            'Existe la figura del "sustituto": un familiar o representante de una persona con discapacidad severa puede ocupar un puesto de la cuota (con límites).',
            'El despido injustificado de una persona con discapacidad genera una indemnización especial adicional.',
            'No cumplir la cuota puede generar multas del Ministerio del Trabajo.',
          ],
        },
        {
          name: 'Código del Trabajo',
          summary: 'Norma general de los derechos laborales para todas las personas trabajadoras.',
          points: [
            'Regula contrato, salario, jornada, vacaciones y afiliación a la seguridad social (IESS).',
            'Cualquier persona puede denunciar incumplimientos ante el Ministerio del Trabajo.',
          ],
        },
      ],
      help: [
        { name: 'Ministerio del Trabajo', description: 'Denuncias laborales, inspecciones y control de la cuota de inclusión.' },
        { name: 'CONADIS', description: 'Consejo Nacional para la Igualdad de Discapacidades: orientación y vigilancia de derechos.' },
        { name: 'Defensoría del Pueblo', description: 'Asesoría gratuita cuando se vulneran tus derechos.' },
      ],
    },
    colombia: {
      intro:
        'En Colombia existe la "estabilidad laboral reforzada": una persona con discapacidad no puede ser despedida por esa razón sin autorización del Ministerio del Trabajo.',
      laws: [
        {
          name: 'Ley 361 de 1997',
          tag: 'Art. 26',
          summary: 'Prohíbe que la discapacidad sea motivo para negar un empleo o para terminar un contrato.',
          points: [
            'Para despedir a una persona por razón de su discapacidad se requiere autorización previa del Ministerio del Trabajo.',
            'Si el despido ocurre sin esa autorización, la persona tiene derecho a una indemnización de 180 días de salario, además de las otras que correspondan.',
            'La Corte Constitucional ha extendido esta protección a personas en situación de debilidad manifiesta por su salud.',
          ],
        },
        {
          name: 'Ley Estatutaria 1618 de 2013',
          tag: 'Art. 13',
          summary: 'Garantiza el derecho al trabajo de las personas con discapacidad en igualdad de oportunidades.',
          points: [
            'Promueve la inclusión laboral en los sectores público y privado.',
            'Incluye ajustes razonables: adaptaciones en el puesto para que puedas trabajar en igualdad de condiciones.',
          ],
        },
        {
          name: 'Código Sustantivo del Trabajo',
          summary: 'Regula los derechos laborales generales de todas las personas trabajadoras.',
          points: ['Contrato, salario mínimo, jornada, prestaciones sociales y seguridad social.'],
        },
      ],
      help: [
        { name: 'Ministerio del Trabajo', description: 'Inspección laboral y autorizaciones de terminación de contrato.' },
        { name: 'Defensoría del Pueblo', description: 'Orientación gratuita sobre derechos fundamentales.' },
        { name: 'Acción de tutela', description: 'Mecanismo rápido ante un juez para proteger tus derechos, incluso la estabilidad laboral.' },
      ],
    },
    peru: {
      intro:
        'En Perú, la Ley General de la Persona con Discapacidad fija cuotas de empleo y la Ley 30150 protege específicamente a las personas con TEA.',
      laws: [
        {
          name: 'Ley 29973 – Ley General de la Persona con Discapacidad',
          tag: '2012',
          summary: 'Establece cuotas de empleo y el derecho a ajustes razonables en el trabajo.',
          points: [
            'Las entidades públicas deben tener al menos un 5% de personas con discapacidad en su personal.',
            'Los empleadores privados con más de 50 trabajadores deben contratar al menos un 3%. (La forma de cálculo fue modificada recientemente: confirma la versión vigente).',
            'En concursos públicos de méritos, las personas con discapacidad reciben una bonificación del 15% sobre el puntaje final.',
            'Tienes derecho a ajustes razonables en el lugar de trabajo.',
          ],
        },
        {
          name: 'Ley 30150 – Protección de las personas con TEA',
          tag: '2014',
          summary: 'Ley específica para personas con trastorno del espectro autista.',
          points: [
            'Promueve la capacitación profesional y la inserción laboral y social de las personas con TEA.',
            'Su reglamento es el Decreto Supremo 001-2015-MIMP.',
          ],
        },
      ],
      help: [
        { name: 'SUNAFIL', description: 'Superintendencia que fiscaliza a los empleadores, incluido el cumplimiento de la cuota.' },
        { name: 'Ministerio de Trabajo y Promoción del Empleo', description: 'Orientación laboral y programas de empleo.' },
        { name: 'CONADIS Perú', description: 'Consejo Nacional para la Integración de la Persona con Discapacidad.' },
      ],
    },
    venezuela: {
      intro:
        'En Venezuela, la Constitución y la Ley para las Personas con Discapacidad establecen el derecho al trabajo y una cuota de inclusión en las empresas.',
      laws: [
        {
          name: 'Constitución de la República Bolivariana de Venezuela',
          tag: '1999 · Art. 81',
          summary: 'Garantiza a las personas con discapacidad el ejercicio pleno de sus capacidades, incluido el trabajo.',
          points: ['El Estado debe promover su formación, capacitación y acceso al empleo acorde con sus condiciones.'],
        },
        {
          name: 'Ley para las Personas con Discapacidad',
          tag: '2007',
          summary: 'Obliga a incluir personas con discapacidad en la nómina de las empresas.',
          points: [
            'Las empresas públicas y privadas deben incorporar no menos de un 5% de personas con discapacidad permanente en su nómina total.',
            'Organismos internacionales han señalado que la ley aún no tiene reglamento, lo que dificulta su cumplimiento.',
          ],
        },
        {
          name: 'Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT)',
          tag: '2012',
          summary: 'Ley general de derechos laborales.',
          points: ['Regula las relaciones de trabajo y prohíbe la discriminación en el empleo.'],
        },
      ],
      help: [
        { name: 'Inspectorías del Trabajo', description: 'Denuncias y reclamos laborales.' },
        { name: 'CONAPDIS', description: 'Consejo Nacional para las Personas con Discapacidad: certificación y orientación.' },
        { name: 'Defensoría del Pueblo', description: 'Defensa de derechos humanos y orientación gratuita.' },
      ],
    },
  },

  ciudadano: {
    ecuador: {
      intro:
        'Como ciudadano en Ecuador tienes derechos como persona con discapacidad, como consumidor y sobre tus datos personales.',
      laws: [
        {
          name: 'Constitución de la República del Ecuador',
          tag: '2008 · Arts. 47-48',
          summary: 'Reconoce derechos específicos para las personas con discapacidad.',
          points: [
            'Atención especializada en salud y educación inclusiva.',
            'Rebajas en servicios de transporte y espectáculos, y exenciones tributarias.',
            'Accesibilidad en espacios públicos y acceso a la información.',
          ],
        },
        {
          name: 'Ley Orgánica de Discapacidades',
          tag: '2012',
          summary: 'Desarrolla los beneficios y la protección de las personas con discapacidad.',
          points: [
            'Beneficios tributarios y tarifarios según el porcentaje de discapacidad registrado.',
            'Prohibición de toda forma de discriminación por discapacidad.',
          ],
        },
        {
          name: 'Ley Orgánica de Defensa del Consumidor',
          tag: '2000',
          summary: 'Protege a las personas al comprar productos o contratar servicios.',
          points: [
            'Derecho a información clara y veraz sobre productos, precios y servicios.',
            'Derecho a reclamar y a ser compensado por productos o servicios defectuosos.',
          ],
        },
        {
          name: 'Ley Orgánica de Protección de Datos Personales (LOPDP)',
          tag: '2021',
          summary: 'Protege tu información personal.',
          points: [
            'Se necesita tu consentimiento para usar tus datos.',
            'Puedes pedir acceder, corregir o eliminar tus datos personales.',
          ],
        },
      ],
      help: [
        { name: 'Defensoría del Pueblo', description: 'Recibe quejas de consumidores y casos de vulneración de derechos.' },
        { name: 'CONADIS', description: 'Orientación sobre beneficios y derechos de personas con discapacidad.' },
        { name: 'Superintendencia de Protección de Datos Personales', description: 'Reclamos sobre el uso indebido de tus datos.' },
      ],
    },
    colombia: {
      intro:
        'En Colombia, la acción de tutela es la herramienta más rápida para proteger tus derechos fundamentales, y hay leyes específicas de discapacidad, consumo y datos.',
      laws: [
        {
          name: 'Acción de tutela',
          tag: 'Constitución 1991 · Art. 86',
          summary: 'Permite pedir a un juez la protección inmediata de tus derechos fundamentales.',
          points: [
            'No necesitas abogado para presentarla.',
            'El juez debe decidir en un plazo máximo de 10 días.',
          ],
        },
        {
          name: 'Ley Estatutaria 1618 de 2013',
          summary: 'Garantiza el ejercicio pleno de los derechos de las personas con discapacidad.',
          points: [
            'Obliga a eliminar barreras y a garantizar accesibilidad.',
            'Protege el acceso a salud, educación inclusiva y participación.',
          ],
        },
        {
          name: 'Ley 1996 de 2019',
          summary: 'Reconoce la capacidad legal plena de las personas con discapacidad mayores de edad.',
          points: [
            'Puedes tomar tus propias decisiones legales; se eliminó la interdicción.',
            'Puedes contar con apoyos que tú eliges para tomar decisiones.',
          ],
        },
        {
          name: 'Estatuto del Consumidor (Ley 1480 de 2011)',
          summary: 'Protege tus derechos al comprar.',
          points: [
            'Derecho a la garantía de los productos.',
            'En compras a distancia o por internet puedes retractarte dentro de los 5 días hábiles siguientes.',
          ],
        },
        {
          name: 'Ley 1581 de 2012 (Habeas Data)',
          summary: 'Protección de datos personales.',
          points: ['Puedes conocer, actualizar y rectificar tus datos, y revocar la autorización de su uso.'],
        },
      ],
      help: [
        { name: 'Defensoría del Pueblo', description: 'Orientación y apoyo para presentar tutelas.' },
        { name: 'Personería municipal', description: 'Atiende a la ciudadanía en cada municipio.' },
        { name: 'Superintendencia de Industria y Comercio (SIC)', description: 'Reclamos de consumidores y protección de datos.' },
      ],
    },
    peru: {
      intro:
        'En Perú tienes una ley específica para personas con TEA, además de protección como consumidor y sobre tus datos personales.',
      laws: [
        {
          name: 'Ley 30150 – Protección de las personas con TEA',
          tag: '2014',
          summary: 'Establece un régimen de protección para las personas con trastorno del espectro autista.',
          points: [
            'Promueve la detección y el diagnóstico temprano, y la intervención oportuna.',
            'Protege la salud y la educación integral e inclusiva de las personas con TEA.',
            'Prevé un Plan Nacional para las personas con TEA.',
          ],
        },
        {
          name: 'Ley 29973 – Ley General de la Persona con Discapacidad',
          tag: '2012',
          summary: 'Marco general de derechos de las personas con discapacidad.',
          points: [
            'Derecho a la accesibilidad, la salud y la educación inclusiva.',
            'El certificado de discapacidad y la inscripción en el registro del CONADIS facilitan el acceso a beneficios.',
          ],
        },
        {
          name: 'Código de Protección y Defensa del Consumidor (Ley 29571)',
          tag: '2010',
          summary: 'Protege tus derechos al comprar productos y servicios.',
          points: [
            'Derecho a información clara y a productos o servicios idóneos.',
            'Los establecimientos deben tener un Libro de Reclamaciones a tu disposición.',
          ],
        },
        {
          name: 'Ley 29733 – Protección de Datos Personales',
          tag: '2011',
          summary: 'Protege tu información personal.',
          points: ['Derechos de acceso, rectificación, cancelación y oposición sobre tus datos.'],
        },
      ],
      help: [
        { name: 'Defensoría del Pueblo', description: 'Atención gratuita ante vulneración de derechos.' },
        { name: 'INDECOPI', description: 'Reclamos y denuncias de consumidores.' },
        { name: 'CONADIS Perú', description: 'Certificado y registro de la persona con discapacidad.' },
      ],
    },
    venezuela: {
      intro:
        'En Venezuela, la Constitución reconoce derechos para las personas con discapacidad y el derecho a proteger tus datos personales (habeas data).',
      laws: [
        {
          name: 'Constitución de la República Bolivariana de Venezuela',
          tag: '1999 · Arts. 28 y 81',
          summary: 'Protege a las personas con discapacidad y el acceso a tus datos.',
          points: [
            'Art. 81: derecho a la integración familiar y comunitaria y al respeto de la dignidad humana.',
            'Art. 28 (habeas data): puedes conocer la información que existe sobre ti y pedir su actualización, rectificación o destrucción.',
          ],
        },
        {
          name: 'Ley para las Personas con Discapacidad',
          tag: '2007',
          summary: 'Regula la atención integral y la protección de las personas con discapacidad.',
          points: [
            'Accesibilidad, salud, educación y participación en la comunidad.',
            'La certificación de discapacidad la emite el CONAPDIS.',
          ],
        },
        {
          name: 'Ley Orgánica de Precios Justos',
          tag: '2014',
          summary: 'Regula el acceso de las personas a bienes y servicios.',
          points: [
            'Protege frente a cobros abusivos y prácticas comerciales indebidas.',
            'Confirma la versión vigente: esta norma ha tenido reformas.',
          ],
        },
      ],
      help: [
        { name: 'Defensoría del Pueblo', description: 'Defensa y orientación gratuita.' },
        { name: 'CONAPDIS', description: 'Consejo Nacional para las Personas con Discapacidad.' },
        { name: 'SUNDDE', description: 'Denuncias relacionadas con precios y acceso a bienes y servicios.' },
      ],
    },
  },
};

/** Normaliza el país del perfil al código de esta sección (si es uno de los disponibles). */
export const countryFromProfile = (country?: string): CountryCode | null => {
  const value = (country ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return COUNTRIES.find((c) => c.code === value)?.code ?? null;
};

/* --------------------------- Enlaces a textos oficiales --------------------------- */
// Verificados en noviembre de 2026. Para Perú y Venezuela, la Constitución enlaza a
// Constitute Project (texto completo) porque los portales oficiales no siempre están disponibles.

export const CONSTITUTION_LINKS: Record<CountryCode, { label: string; url: string }> = {
  ecuador: {
    label: 'Constitución de la República del Ecuador (Asamblea Nacional, PDF)',
    url: 'https://www.asambleanacional.gob.ec/sites/default/files/documents/old/constitucion_de_bolsillo.pdf',
  },
  colombia: {
    label: 'Constitución Política de Colombia (Secretaría del Senado)',
    url: 'http://www.secretariasenado.gov.co/senado/basedoc/constitucion_politica_1991.html',
  },
  peru: {
    label: 'Constitución Política del Perú (Constitute Project)',
    url: 'https://www.constituteproject.org/constitution/Peru_2021?lang=es',
  },
  venezuela: {
    label: 'Constitución de la República Bolivariana de Venezuela (Constitute Project)',
    url: 'https://www.constituteproject.org/constitution/Venezuela_2009?lang=es',
  },
};

/** Enlace al texto de cada ley (por país y nombre de la ley tal como aparece arriba). */
export const LAW_LINKS: Record<CountryCode, Record<string, string>> = {
  ecuador: {
    'Constitución de la República del Ecuador': CONSTITUTION_LINKS.ecuador.url,
    'Ley Orgánica de Discapacidades':
      'https://www.trabajo.gob.ec/wp-content/uploads/2024/01/LEY-ORGANICA-DE-DISCAPACIDADES.pdf',
  },
  colombia: {
    'Ley 361 de 1997': 'http://www.secretariasenado.gov.co/senado/basedoc/ley_0361_1997.html',
    'Ley Estatutaria 1618 de 2013': 'http://www.secretariasenado.gov.co/senado/basedoc/ley_1618_2013.html',
    'Acción de tutela': CONSTITUTION_LINKS.colombia.url,
    'Ley 1996 de 2019': 'http://www.secretariasenado.gov.co/senado/basedoc/ley_1996_2019.html',
    'Estatuto del Consumidor (Ley 1480 de 2011)': 'http://www.secretariasenado.gov.co/senado/basedoc/ley_1480_2011.html',
    'Ley 1581 de 2012 (Habeas Data)': 'http://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html',
  },
  peru: {
    'Ley 29973 – Ley General de la Persona con Discapacidad': 'https://www.leyes.congreso.gob.pe/Documentos/Leyes/29973.pdf',
    'Ley 30150 – Protección de las personas con TEA': 'https://www.leyes.congreso.gob.pe/Documentos/Leyes/30150.pdf',
    'Código de Protección y Defensa del Consumidor (Ley 29571)': 'https://www.leyes.congreso.gob.pe/Documentos/Leyes/29571.pdf',
    'Ley 29733 – Protección de Datos Personales': 'https://www.leyes.congreso.gob.pe/Documentos/Leyes/29733.pdf',
  },
  venezuela: {
    'Constitución de la República Bolivariana de Venezuela': CONSTITUTION_LINKS.venezuela.url,
  },
};
