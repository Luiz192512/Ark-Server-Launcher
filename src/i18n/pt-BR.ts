import { rulesPtBR } from "./rules.pt-BR";

export const ptBR = {
  ...rulesPtBR,
  "app.title": "ENZ Launcher",
  "app.subtitle": "LAUNCHER",
  "nav.label": "Principal",
  "nav.maps": "MAPAS",
  "nav.dashboard": "PAINEL",
  "nav.settings": "CONFIGURAÇÕES",
  "nav.about": "SOBRE",

  "state.stopped": "PARADO",
  "state.starting": "INICIANDO",
  "state.running": "RODANDO",
  "state.stopping": "PARANDO",
  "state.failed": "FALHOU",
  "state.sidebar.stopped": "Servidor parado",
  "state.sidebar.starting": "Servidor iniciando",
  "state.sidebar.running": "Servidor rodando",
  "state.sidebar.stopping": "Servidor parando",
  "state.sidebar.failed": "Servidor com falha",

  "maps.title": "ESCOLHER MAPA",
  "maps.subtitle": "Selecione onde o servidor vai iniciar.",
  "maps.edition": "ARK: SURVIVAL EVOLVED · SERVIDOR DEDICADO",
  "maps.list": "Mapas disponíveis",
  "maps.loading": "Procurando mapas instalados",
  "maps.save": "Save: {value}",
  "maps.noSave": "Sem save",
  "maps.notInstalled": "Não instalado",
  "maps.dlc": "DLC",
  "maps.showUnverified": "Mostrar mapas não verificados",
  "maps.empty.title": "NENHUM MAPA ENCONTRADO",
  "maps.empty.body":
    "Não achei mapas na pasta do servidor. Confira o caminho de instalação nas configurações.",
  "maps.empty.action": "ABRIR CONFIGURAÇÕES",
  "maps.selected": "Mapa selecionado",
  "maps.fact.edition": "Edição",
  "maps.fact.edition.value": "Survival Evolved",
  "maps.fact.save": "Save",
  "maps.fact.session": "Sessão",
  "maps.fact.ports": "Portas",
  "maps.fact.ports.default": "Padrão do servidor",
  "maps.start": "INICIAR SERVIDOR",
  "maps.startingAt": "Vai iniciar em {map}",
  "maps.running": "SERVIDOR EM EXECUÇÃO",
  "maps.runningHint": "Pare o servidor no painel para trocar de mapa.",
  "maps.starting": "INICIANDO...",

  "dash.title": "PAINEL",
  "dash.map": "Mapa: {map} · Sessão {session}",
  "dash.mapUnknown": "Mapa desconhecido · Sessão {session}",
  "dash.external":
    "Este servidor foi iniciado fora do launcher. Você pode pará-lo daqui.",
  "dash.metrics": "Métricas",
  "dash.uptime": "TEMPO ATIVO",
  "dash.players": "JOGADORES",
  "dash.playersUnavailable": "indisponível",
  "dash.cpu": "CPU",
  "dash.memory": "MEMÓRIA",
  "dash.log": "LOG AO VIVO",
  "dash.logLines": "últimas 200 linhas",
  "dash.logEmpty":
    "Sem linhas de log ainda. Um servidor iniciado fora do launcher sem -forcelogflush mantém o log vazio.",
  "dash.crashed":
    "O servidor encerrou sozinho várias vezes em pouco tempo. A reinicialização automática foi pausada. Veja o log abaixo.",
  "dash.restart": "REINICIAR",
  "dash.controls": "Controle do servidor",
  "dash.startServer": "INICIAR SERVIDOR",
  "dash.stopServer": "ENCERRAR SERVIDOR",
  "dash.confirmStopServer": "CONFIRMAR ENCERRAR",
  "dash.working": "AGUARDE...",
  "dash.save": "SALVAR JOGO",
  "dash.saving": "SALVANDO...",
  "dash.saved": "Mundo salvo às {time}.",
  "dash.regen": "REGERAR SELVAGENS",
  "dash.confirmRegen": "CONFIRMAR REGERAR",
  "dash.regenerating": "REGERANDO...",
  "dash.regenerated":
    "Dinos selvagens destruídos. Os novos nascem com a dificuldade atual.",
  "dash.lowMemory":
    "Pouca memória livre no PC ({free}). O servidor precisa de cerca de 4 GB para carregar e pode travar. Feche programas ou o jogo (cliente) antes de iniciar.",
  "dash.rconOff":
    "Salvar jogo e regerar selvagens precisam de RCON ativo e de uma senha de admin no servidor.",
  "dash.cancel": "CANCELAR",
  "dash.starting": "INICIANDO...",
  "dash.stopping": "PARANDO...",
  "dash.pickMap": "ESCOLHER MAPA",

  "settings.title": "CONFIGURAÇÕES",
  "settings.subtitle": "Caminhos, sessão e segurança do servidor.",
  "settings.root": "PASTA DO SERVIDOR",
  "settings.browse": "PROCURAR",
  "settings.root.ok": "Detectado: ShooterGameServer.exe encontrado.",
  "settings.root.bad": "ShooterGameServer.exe não encontrado nesta pasta.",
  "settings.session": "NOME DA SESSÃO",
  "settings.gamePort": "PORTA DO JOGO",
  "settings.queryPort": "PORTA DE CONSULTA",
  "settings.portPlaceholder": "Padrão do servidor",
  "settings.password": "SENHA DE ADMINISTRADOR",
  "settings.passwordSaved": "Já existe uma senha guardada. Digite para trocar.",
  "settings.passwordPlaceholder":
    "Guardada no Gerenciador de Credenciais do Windows",
  "settings.passwordHint":
    "A senha nunca vai para arquivos do projeto nem para os logs.",
  "settings.backup": "Backup do save ao parar",
  "settings.backupHint":
    "Copia os arquivos do mundo para uma pasta de backup depois que o servidor parar.",
  "settings.save": "SALVAR",
  "settings.discard": "DESCARTAR",
  "settings.saved": "Configurações salvas.",
  "settings.saveFailed": "Não consegui salvar: {reason}",

  "settings.tab.launcher": "LAUNCHER",
  "settings.tab.server": "SERVIDOR E MAPA",
  "settings.tab.mods": "MODS",
  "mods.hint":
    "Mods do jogo na sua Steam e no servidor. Ligue os que o servidor deve carregar: os que faltam nele são copiados da Steam ao salvar. Só dá para salvar com o servidor parado.",
  "mods.warn":
    "Cuidado: desligar um mod que o mundo já usa faz o servidor apagar o conteúdo dele do save na próxima vez que salvar. Os arquivos do mod continuam no servidor, então dá para religar.",
  "mods.on": "ATIVADOS",
  "mods.off": "DESATIVADOS",
  "mods.refresh": "ATUALIZAR",
  "mods.refreshHint":
    "Instalou um mod novo na Steam? Atualize para ele aparecer aqui. Mudanças não salvas são descartadas.",
  "mods.refreshed": "Lista atualizada.",
  "mods.empty":
    "Nenhum mod encontrado. Confira a pasta do servidor na aba LAUNCHER.",
  "mods.toggle": "Carregar {name} no servidor",
  "mods.status.ready": "Na Steam e no servidor",
  "mods.status.copy": "Na Steam. Será copiado para o servidor ao salvar",
  "mods.status.serverOnly": "Só no servidor, não está na sua Steam",
  "mods.status.missing": "Sem arquivos: não está na Steam nem no servidor",
  "mods.saving": "COPIANDO...",
  "mods.saved": "Mods atualizados. Inicie o servidor para aplicar.",

  "about.title": "ENZ LAUNCHER",
  "about.version": "VERSÃO {version}",
  "about.body":
    "Inicie, pare e acompanhe o servidor dedicado do ARK escolhendo o mapa em um só lugar.",
  "about.notice":
    "Ferramenta não oficial, feita por fã. Não é afiliada, patrocinada nem aprovada pela Studio Wildcard. ARK é marca dos seus respectivos donos. Todo o visual deste launcher é original.",

  "common.loading": "Carregando...",
  "common.dismiss": "Fechar",

  "error.generic": "Algo deu errado: {reason}",
  "error.not_configured":
    "Defina a pasta do servidor nas configurações antes de iniciar.",
  "error.registry_unreadable": "Não consegui ler a lista de mapas.",
  "error.map_not_found": "Esse mapa não existe na lista.",
  "error.map_not_installed": "Esse mapa não está instalado no servidor.",
  "error.session_name_empty": "Informe o nome da sessão nas configurações.",
  "error.session_name_invalid":
    "O nome da sessão não pode ter ? ou aspas e deve ter até 64 caracteres.",
  "error.port_in_use":
    "A porta {port} já está em uso. Outro servidor pode estar rodando.",
  "error.busy": "O servidor já está em transição. Aguarde um instante.",
  "error.already_running": "O servidor já está rodando (PID {pid}).",
  "error.spawn_failed": "Não consegui abrir o servidor: {reason}",
  "error.not_running": "O servidor não está rodando.",
  "error.server_running": "Pare o servidor antes de mudar estas regras.",
  "error.invalid_option": "Valor inválido em {option}.",
  "error.backup_not_found": "Essa cópia não existe mais.",
  "error.custom": "O launcher recusou a chave personalizada ({code}).",
  "error.invalid_mod": "ID de mod inválido: {mod}.",
  "error.mod_missing":
    "O mod {mod} não está na sua Steam, então não tenho como copiá-lo para o servidor.",
  "error.rcon_not_configured":
    "O RCON não está ativo. Defina RCONEnabled=True e uma senha de admin no servidor.",
  "error.rcon_unreachable":
    "Não consegui falar com o servidor pelo RCON ({reason}). Ele já terminou de iniciar?",
  "error.rcon_auth_failed": "O servidor recusou a senha de admin do RCON.",
  "error.rcon_protocol": "Resposta inesperada do RCON: {reason}",
  "error.backup_failed":
    "O servidor parou, mas o backup do save falhou: {reason}",
} as const;

export type MessageKey = keyof typeof ptBR;
