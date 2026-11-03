export const categories = {
  study: 'Estudos', work: 'Trabalho', finance: 'Finanças',
  home: 'Casa', health: 'Saúde', general: 'Geral',
} as const;
export type TaskCategory = keyof typeof categories;
export type ReminderStage = 0 | 1 | 2 | 3;
import type {AddressStyle} from './preferences';
const templates:Record<TaskCategory,Record<ReminderStage,readonly string[]>>={
 study:{0:['O conhecimento não vai entrar na cabeça por Bluetooth. 📚','Seu cérebro pediu férias, mas a matéria não.'],1:['A matéria segue esperando. Ela tem mais paciência que eu. 👀','15 minutos de atraso. A sabedoria não vem por osmose.'],2:['Uma hora depois e os livros continuam fechados.','A matéria ainda está aí. Surpresa nenhuma.'],3:['Última chamada dos estudos. Vai encarar ou reagendar?']},
 work:{0:['Seu eu do passado marcou um compromisso. Hora de honrar o combinado.','Tem tarefa do trabalho te chamando. E não é reunião que poderia ser e-mail.'],1:['A responsabilidade bateu de novo. Vai atender?','A tarefa continua na agenda, {vocativo}.'],2:['Uma hora depois e essa pendência ainda tem seu nome.','O relógio trabalhou. E essa tarefa?'],3:['Último toque: resolve ou reorganiza o prazo.']},
 finance:{0:['O dinheiro não se organiza sozinho. Infelizmente. 💸','Hora de dar atenção às finanças. O saldo agradece.'],1:['Essa pendência financeira não evaporou, viu? 👀','Seu orçamento pediu cinco minutinhos de atenção.'],2:['Uma hora depois e as contas continuam sabendo seu endereço.'],3:['Última chamada: confere isso ou reagenda.']},
 home:{0:['A casa não se organiza por telepatia. 🏠','A tarefa doméstica está te olhando faz tempo.'],1:['A casa continua esperando, {vocativo}.','A tarefa não ganhou pernas. Ainda é com você.'],2:['Uma hora depois e a bagunça segue fiel.'],3:['Última chamada da casa. Resolve ou reagenda?']},
 health:{0:['Chegou a hora do seu compromisso de saúde. Cuida disso, combinado?'],1:['Confira seu compromisso de saúde.'],2:['Seu compromisso ainda aparece como pendente.'],3:['Confira se precisa atualizar esse lembrete.']},
 general:{0:['Você marcou, eu lembrei. Agora falta a parte em que você faz. 👀','Tem uma tarefa te esperando. Coincidência? Acho que não.'],1:['Seu eu do passado confiou em você. Coragem.','A tarefa continua aqui, {vocativo}.'],2:['Uma hora depois e a pendência segue firme.','O tempo passou, mas a tarefa não se fez sozinha.'],3:['Última chamada, {vocativo}. Vai fazer ou reagendar?']}
};
export function reminderMessage(category:TaskCategory,stage:ReminderStage,variant=0,displayName='',addressStyle:AddressStyle='neutral'){
 const options=templates[category]?.[stage]??templates.general[stage];
 const vocativo=addressStyle==='masculine'?'campeão':addressStyle==='feminine'?'campeã':'pessoa';
 const message=options[Math.abs(variant)%options.length].replace(/\{vocativo\}/g,vocativo);
 const name=displayName.trim().slice(0,32);
 return name?name+', '+message.charAt(0).toLowerCase()+message.slice(1):message;
}
export function reminderOffsets(category: TaskCategory): readonly number[] {
  // Saúde usa um lembrete único por padrão; horários clínicos são definidos pelo usuário.
  return category === 'health' ? [0] : [0,15,60,180];
}
