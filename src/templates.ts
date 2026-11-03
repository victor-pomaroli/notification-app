export const categories = {
  study: 'Estudos', work: 'Trabalho', finance: 'Finanças',
  home: 'Casa', health: 'Saúde', general: 'Geral',
} as const;
export type TaskCategory = keyof typeof categories;
export type ReminderStage = 0 | 1 | 2 | 3;
const templates: Record<TaskCategory, Record<ReminderStage, readonly string[]>> = {
  study: {
    0:['Hora de colocar o cérebro pra trabalhar. 📚','Bora investir um pouco nesse conhecimento?'],
    1:['O conhecimento não vai bater na porta, hein? 👀','A matéria continua te esperando, criatura.'],
    2:['Uma hora depois e o conteúdo segue na lista.','A sabedoria não vem por osmose, meu consagrado.'],
    3:['Última chamada, estudante. Vai encarar ou reagendar?'],
  },
  work: {
    0:['Bora tirar mais uma pendência do caminho?','Tem compromisso profissional na área. 👀'],
    1:['Olha a responsabilidade batendo na porta.','O compromisso continua na agenda, campeão.'],
    2:['Uma hora depois e a pendência segue firme.','O relógio andou, mas a tarefa continua por aqui.'],
    3:['Último toque: resolve ou reorganiza o prazo.'],
  },
  finance: {
    0:['Assunto de dinheiro na área. Bora conferir? 💸','Hora de dar atenção às finanças.'],
    1:['Essa pendência financeira continua por aqui. 👀','Dinheiro não se administra sozinho, criatura.'],
    2:['Uma hora depois e o assunto financeiro segue pendente.'],
    3:['Último toque. Melhor conferir isso ou reagendar.'],
  },
  home: {
    0:['A casa não se organiza por telepatia. 🏠','Bora dar uma atenção à rotina?'],
    1:['Tem tarefa doméstica te esperando, meu consagrado.'],
    2:['Uma hora depois e a casa segue aguardando.'],
    3:['Última chamada. Resolve ou reagenda?'],
  },
  health: {
    0:['Está na hora do seu compromisso de saúde.'],
    1:['Confira seu compromisso de saúde.'],
    2:['Seu compromisso ainda aparece como pendente.'],
    3:['Confira se precisa atualizar esse lembrete.'],
  },
  general: {
    0:['Ô, criatura, tem coisa pra resolver. 👀','Chegou a hora de cuidar dessa pendência.'],
    1:['Tu mesmo marcou isso, lembra?','Olha a pendência te esperando.'],
    2:['Uma hora depois e essa tarefa continua na lista.'],
    3:['Última chamada, lenda. Vai fazer ou reagendar?'],
  },
};
export function reminderMessage(category: TaskCategory, stage: ReminderStage, variant = 0) {
  const options = templates[category]?.[stage] ?? templates.general[stage];
  return options[Math.abs(variant) % options.length];
}
export function reminderOffsets(category: TaskCategory): readonly number[] {
  // Saúde usa um lembrete único por padrão; horários clínicos são definidos pelo usuário.
  return category === 'health' ? [0] : [0,15,60,180];
}
