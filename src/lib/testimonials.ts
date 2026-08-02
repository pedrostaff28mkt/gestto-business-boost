// DADOS DE EXEMPLO — substituir por depoimentos reais de clientes antes de publicar em produção.

export type Testimonial = {
  name: string;
  business: string;
  rating: number;
  quote: string;
  since: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Camila Ferraz",
    business: "Dona de padaria",
    rating: 5,
    quote:
      "Antes de usar o Gestto eu era bem travada na minha empresa, não conseguia acompanhar tudo de perto. Depois que comecei, meu faturamento aumentou cerca de 35% no mês.",
    since: "Cliente há 4 meses",
  },
  {
    name: "Rogério Antunes",
    business: "Proprietário de indústria de confecção",
    rating: 5,
    quote:
      "Eu vendia bem e mesmo assim o dinheiro não sobrava. Quando vi o lucro real com as taxas já descontadas, cortei três produtos que só davam prejuízo e fechei o trimestre com margem 12% maior.",
    since: "Cliente há 7 meses",
  },
  {
    name: "Juliana Prado",
    business: "Sócia de rede de lanchonetes",
    rating: 5,
    quote:
      "Com duas lojas eu vivia no escuro, dependia do que a equipe me contava. Hoje abro o celular de manhã e sei exatamente o que vendeu, o que falta no estoque e quem bateu a meta.",
    since: "Cliente há 5 meses",
  },
];
