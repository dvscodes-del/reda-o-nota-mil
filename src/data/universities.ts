export type CoursesMap = Record<string, string[]>;
export type StateMap = Record<string, CoursesMap>;

const defaultCourses = [
  "Administração",
  "Arquitetura e Urbanismo",
  "Biomedicina",
  "Ciência da Computação",
  "Ciências Biológicas",
  "Ciências Contábeis",
  "Direito",
  "Economia",
  "Educação Física",
  "Enfermagem",
  "Engenharia Civil",
  "Engenharia de Produção",
  "Farmácia",
  "Fisioterapia",
  "História",
  "Jornalismo",
  "Letras",
  "Matemática",
  "Medicina",
  "Medicina Veterinária",
  "Nutrição",
  "Odontologia",
  "Pedagogia",
  "Psicologia",
  "Relações Internacionais",
  "Sistemas de Informação"
];

export const universityData: StateMap = {
  "SP": {
    "USP": defaultCourses,
    "Unicamp": defaultCourses,
    "Unesp": defaultCourses,
    "UFSCar": defaultCourses,
    "UNIFESP": defaultCourses,
  },
  "RJ": {
    "UFRJ": defaultCourses,
    "UFF": defaultCourses,
    "UERJ": defaultCourses,
    "UNIRIO": defaultCourses,
    "PUC-Rio": defaultCourses,
  },
  "MG": {
    "UFMG": defaultCourses,
    "UFU": defaultCourses,
    "UFJF": defaultCourses,
    "UFLA": defaultCourses,
    "PUC Minas": defaultCourses,
  },
  "RS": {
    "UFRGS": defaultCourses,
    "UFSM": defaultCourses,
    "UFPEL": defaultCourses,
    "PUCRS": defaultCourses,
  },
  "PR": {
    "UFPR": defaultCourses,
    "UTFPR": defaultCourses,
    "UEL": defaultCourses,
    "UEM": defaultCourses,
  },
  "SC": {
    "UFSC": defaultCourses,
    "UDESC": defaultCourses,
  },
  "BA": {
    "UFBA": defaultCourses,
    "UNEB": defaultCourses,
  },
  "PE": {
    "UFPE": defaultCourses,
    "UFRPE": defaultCourses,
  },
  "CE": {
    "UFC": defaultCourses,
    "UECE": defaultCourses,
  },
  "DF": {
    "UnB": defaultCourses,
    "UCB": defaultCourses,
  }
};
