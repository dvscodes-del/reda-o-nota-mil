import constituicaoImage from "@/assets/repertorio-constituicao.jpg";
import geografiaImage from "@/assets/repertorio-geografia.jpg";
import cinemaImage from "@/assets/repertorio-cinema.jpg";

export interface ThemeMediaInfo {
  themeImage: string;
  themeTag: string;
  themeAccent: string;
  repertoryImages: Record<string, string>;
}

export const THEME_MEDIA: Record<number, ThemeMediaInfo> = {
  1: {
    themeImage: "https://images.unsplash.com/photo-1541199249251-f713e6145474?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Saúde Mental & Juventude",
    themeAccent: "from-blue-600/90 to-indigo-900/90",
    repertoryImages: {
      "Constituição Federal (Art. 196)": constituicaoImage,
      "A Sociedade do Cansaço": "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=80",
      "Divertida Mente": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
      "13 Reasons Why": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
      "Positividade Tóxica": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
    },
  },
  2: {
    themeImage: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Tecnologia & Inteligência Artificial",
    themeAccent: "from-purple-600/90 to-slate-900/90",
    repertoryImages: {
      "Marco Civil da Internet": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
      "Armas de Destruição Matemática": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      "O Dilema das Redes": cinemaImage,
      "Primeira Revolução Industrial": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
      "1984": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80",
    },
  },
  3: {
    themeImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Inclusão & Acessibilidade",
    themeAccent: "from-teal-600/90 to-emerald-950/90",
    repertoryImages: {
      "Lei Brasileira de Inclusão (Estatuto da Pessoa com Deficiência)": constituicaoImage,
      "Lei de Cotas para PCDs": "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
      "Capacitismo": "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
      "Intocáveis": cinemaImage,
      "Ensaio sobre a Cegueira": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
    },
  },
  4: {
    themeImage: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Sustentabilidade & Economia Verde",
    themeAccent: "from-emerald-600/90 to-green-950/90",
    repertoryImages: {
      "Acordo de Paris e COP 30": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
      "Ideias para Adiar o Fim do Mundo": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
      "Greenwashing (Maquiagem Verde)": "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80",
      "Política Nacional de Meio Ambiente": constituicaoImage,
      "Ilha das Flores": cinemaImage,
    },
  },
  5: {
    themeImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Moradia Digna & Direitos Humanos",
    themeAccent: "from-amber-600/90 to-stone-900/90",
    repertoryImages: {
      "Constituição Federal (Art. 6º)": constituicaoImage,
      "Quarto de Despejo": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      "Parasita": cinemaImage,
      "Arquitetura Hostil": "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80",
      "Reforma Urbana de Pereira Passos (Bota-Abaixo)": "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80",
    },
  },
  6: {
    themeImage: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Sistema Penal & Ressocialização",
    themeAccent: "from-slate-700/90 to-zinc-950/90",
    repertoryImages: {
      "Lei de Execução Penal": constituicaoImage,
      "Estação Carandiru": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      "Vigiar e Punir": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
      "Massacre do Carandiru": "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80",
      "A 13ª Emenda": cinemaImage,
    },
  },
  7: {
    themeImage: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Educação & Leitura Crítica",
    themeAccent: "from-sky-600/90 to-blue-950/90",
    repertoryImages: {
      "A Leitura do Mundo": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
      "Fahrenheit 451": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
      "Analfabetismo Funcional": "https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=800&q=80",
      "Escritores da Liberdade": cinemaImage,
      "Semana de Arte Moderna (1922)": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
    },
  },
  8: {
    themeImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Influenciadores & Consumo Digital",
    themeAccent: "from-pink-600/90 to-rose-950/90",
    repertoryImages: {
      "Código de Defesa do Consumidor (CONAR)": constituicaoImage,
      "A Sociedade do Espetáculo": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
      "Modernidade Líquida": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
      "O Show de Truman": cinemaImage,
      "FOMO (Fear Of Missing Out)": "https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&w=800&q=80",
    },
  },
  9: {
    themeImage: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Segurança Alimentar & Nutrição",
    themeAccent: "from-green-600/90 to-emerald-950/90",
    repertoryImages: {
      "Nova Rotulagem Nutricional Frontal": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
      "Geografia da Fome": geografiaImage,
      "Muito Além do Peso": cinemaImage,
      "Desertos Alimentares": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
      "Guia Alimentar para a População Brasileira": constituicaoImage,
    },
  },
  10: {
    themeImage: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Cidadania, Política & Ética",
    themeAccent: "from-blue-700/90 to-indigo-950/90",
    repertoryImages: {
      "Lei de Acesso à Informação (LAI)": constituicaoImage,
      "Raízes do Brasil": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
      "O 'Jeitinho' Brasileiro": "https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?auto=format&fit=crop&w=800&q=80",
      "Lei da Ficha Limpa": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
      "O Príncipe": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
    },
  },
  11: {
    themeImage: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Apostas Online & Comportamento",
    themeAccent: "from-amber-700/90 to-red-950/90",
    repertoryImages: {
      "Lei do Superendividamento": constituicaoImage,
      "Ludopatia": "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80",
      "Capitalismo Manipulatório": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
      "O Jogador": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
      "Proibição dos Cassinos no Brasil": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    },
  },
  12: {
    themeImage: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Mobilidade Urbana & Cidade",
    themeAccent: "from-cyan-700/90 to-blue-950/90",
    repertoryImages: {
      "O Direito à Cidade": "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80",
      "Rodoviarismo de Juscelino Kubitschek": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80",
      "Gentrificação": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      "Política Nacional de Mobilidade Urbana": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
      "Cidades para Pessoas": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80",
    },
  },
  13: {
    themeImage: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Envelhecimento & Previdência",
    themeAccent: "from-violet-700/90 to-purple-950/90",
    repertoryImages: {
      "Bônus Demográfico e Inversão da Pirâmide Etária": "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80",
      "A Velhice": "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=800&q=80",
      "Estatuto da Pessoa Idosa": constituicaoImage,
      "Meu Pai": cinemaImage,
      "Etarismo ou Idadismo (Ageísmo)": "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=800&q=80",
    },
  },
  14: {
    themeImage: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1200&q=80",
    themeTag: "Clima Extremo & Cidades Resilientes",
    themeAccent: "from-sky-700/90 to-slate-950/90",
    repertoryImages: {
      "Tragédia Climática no Rio Grande do Sul (2024)": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
      "Racismo Ambiental": "https://images.unsplash.com/photo-1569163139599-0f4517e36f51?auto=format&fit=crop&w=800&q=80",
      "Cidades-Esponja": "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80",
      "Lei de Defesa Civil": constituicaoImage,
      "O Dia Depois de Amanhã": cinemaImage,
    },
  },
};

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "Leis": constituicaoImage,
  "Livros": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
  "Filmes": cinemaImage,
  "Séries": "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80",
  "Documentários": cinemaImage,
  "Fatos Históricos": "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=800&q=80",
  "Citações": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
  "Músicas": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
  "Conceitos": "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80",
};

export function getThemeMedia(day: number): ThemeMediaInfo {
  return THEME_MEDIA[day] || THEME_MEDIA[1]!;
}

export function getRepertoryImage(day: number, title: string, category: string): string {
  const theme = THEME_MEDIA[day];
  if (theme && theme.repertoryImages[title]) {
    return theme.repertoryImages[title]!;
  }
  if (CATEGORY_FALLBACK_IMAGES[category]) {
    return CATEGORY_FALLBACK_IMAGES[category]!;
  }
  return theme ? theme.themeImage : constituicaoImage;
}
